"""
Smart file ingestor — source-aware column mapping.
Each portal has its own column structure defined in source_config.py.
The WA Tenders portal uses a custom multi-line cell parser.
"""
import io
import logging
import re
import pandas as pd
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from app.ingestion.source_config import build_column_map, get_source, SOURCES

logger = logging.getLogger(__name__)


# ── Generic fallback column map (used for "others" and unknown portals) ───────
GENERIC_COLUMN_MAP = {
    # Title
    "title":                    "title",
    "tender title":             "title",
    "subject":                  "title",
    "description":              "title",
    "contract description":     "title",
    "procurement description":  "title",
    "name":                     "title",
    "opportunity title":        "title",
    # Agency
    "entity":                   "agency",
    "organisation":             "agency",
    "organization":             "agency",
    "buyer":                    "agency",
    "procuring entity":         "agency",
    "client":                   "agency",
    "agency":                   "agency",
    # State
    "state":                    "state",
    "location":                 "state",
    "region":                   "state",
    "jurisdiction":             "state",
    # Status / type
    "status":                   "status",
    "type":                     "tender_type",
    "tender type":              "tender_type",
    "procurement type":         "tender_type",
    "category":                 "sector",
    "sector":                   "sector",
    # Reference
    "code":                     "source_id",
    "reference":                "source_id",
    "tender id":                "source_id",
    "tender number":            "source_id",
    "reference number":         "source_id",
    "contract number":          "source_id",
    "atm id":                   "source_id",
    # Dates
    "opening date":             "published_date",
    "open date":                "published_date",
    "publish date":             "published_date",
    "published date":           "published_date",
    "release date":             "published_date",
    "start date":               "published_date",
    "closing date":             "close_date",
    "close date":               "close_date",
    "due date":                 "close_date",
    "deadline":                 "close_date",
    "closing":                  "close_date",
    "end date":                 "close_date",
    "expiry date":              "close_date",
    # Value
    "value":                    "contract_value",
    "contract value":           "contract_value",
    "estimated value":          "contract_value",
    "budget":                   "contract_value",
    "amount":                   "contract_value",
    "total value":              "contract_value",
    "value (aud)":              "contract_value",
    # URL
    "url":                      "source_url",
    "link":                     "source_url",
    "tender url":               "source_url",
}

STATE_MAP = {
    "victoria":                       "VIC",  "vic":  "VIC",
    "new south wales":                "NSW",  "nsw":  "NSW",
    "queensland":                     "QLD",  "qld":  "QLD",
    "western australia":              "WA",   "wa":   "WA",
    "south australia":                "SA",   "sa":   "SA",
    "tasmania":                       "TAS",  "tas":  "TAS",
    "northern territory":             "NT",   "nt":   "NT",
    "act":                            "ACT",
    "australian capital territory":   "ACT",
    "open":                           "Federal",
    "federal":                        "Federal",
    "national":                       "Federal",
}

STATUS_MAP = {
    "open":       "open",
    "active":     "open",
    "live":       "open",
    "current":    "open",
    "closed":     "closed",
    "awarded":    "closed",
    "cancelled":  "closed",
    "upcoming":   "upcoming",
    "planned":    "upcoming",
    "future":     "upcoming",
}

SECTOR_KEYWORDS = {
    "cleaning":            ["clean", "janitor", "hygiene", "waste"],
    "facility_management": ["facilit", "maintenance", "property", "building", "grounds"],
    "construction":        ["construct", "civil", "infrastructure", "road", "bridge"],
    "it_services":         ["software", "ict", "digital", "cyber", "cloud", "technology", "data"],
    "healthcare":          ["health", "medical", "hospital", "clinical", "nursing"],
    "transportation":      ["transport", "logistic", "fleet", "vehicle", "rail", "transit"],
    "utilities":           ["water", "wastewater", "energy", "electricity", "gas"],
}


def _infer_sector(text: str) -> str:
    t = (text or "").lower()
    for sector, keywords in SECTOR_KEYWORDS.items():
        if any(w in t for w in keywords):
            return sector
    return "other"


def _parse_date(val) -> Optional[datetime]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, datetime):
        return val.replace(tzinfo=timezone.utc) if val.tzinfo is None else val
    s = str(val).strip()
    if not s or s.lower() in ("nan", "none", "nat", "n/a", ""):
        return None
    formats = [
        "%d/%m/%Y %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S",
        "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y",
        "%d %b %Y", "%B %d, %Y", "%d %B, %Y %I:%M %p",
        "%d %B, %Y", "%B %d %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s[:25], fmt[:25]).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _parse_wa_date(date_str: str) -> Optional[datetime]:
    """Parse WA Tenders date format: '8 May, 2026 4:00 PM'"""
    s = date_str.strip()
    # Remove trailing comma after day if present: "8 May, 2026" → "8 May 2026"
    s = re.sub(r'(\d+)\s+(\w+),\s+(\d{4})', r'\1 \2 \3', s)
    formats = [
        "%d %B %Y %I:%M %p",
        "%d %b %Y %I:%M %p",
        "%d %B %Y",
        "%d %b %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _parse_value(val) -> float:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return 0.0
    try:
        s = str(val).replace(",", "").replace("$", "").replace(" ", "").strip()
        return float(s) if s not in ("nan", "none", "") else 0.0
    except (ValueError, TypeError):
        return 0.0


def _get_column_map(source_key: str) -> Dict[str, str]:
    """Get the column map for a source — falls back to generic map."""
    src_map = build_column_map(source_key)
    if src_map:
        # Merge with generic so we don't miss anything
        merged = {**GENERIC_COLUMN_MAP, **src_map}
        return merged
    return GENERIC_COLUMN_MAP


def _normalise_columns(df: pd.DataFrame, col_map: Dict[str, str]) -> Dict[str, str]:
    """Map actual dataframe column names to our field names using col_map."""
    mapping = {}
    for col in df.columns:
        key = str(col).strip().lower()
        if key in col_map:
            mapping[col] = col_map[key]
    return mapping


# ── Standard parser (most portals) ───────────────────────────────────────────
def _parse_standard(
    df: pd.DataFrame,
    source_key: str,
    source_name: str,
    job_name: str,
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Standard row-based parser for portals with normal column headers."""
    warnings = []
    col_map = _get_column_map(source_key)
    src_config = get_source(source_key) or {}
    state_default = src_config.get("state_default")

    rename_map = _normalise_columns(df, col_map)

    if not rename_map:
        raise ValueError(
            f"Could not recognise any columns for source '{source_key}'. "
            f"Found: {list(df.columns)}. "
            f"Expected columns like: Title, Code, Closing Date, etc."
        )

    unmapped = [c for c in df.columns if c not in rename_map]
    if unmapped:
        warnings.append(f"Ignored unrecognised columns: {', '.join(str(c) for c in unmapped[:10])}")

    df = df.rename(columns=rename_map)

    records = []
    for idx, row in df.iterrows():
        try:
            title = str(row.get("title", "") or "").strip()
            if not title or title.lower() in ("nan", "none"):
                continue

            # Source ID
            source_id = str(row.get("source_id", "") or "").strip()
            if not source_id or source_id.lower() in ("nan", "none"):
                source_id = f"{source_name}-{idx}"

            # State — use file value, fall back to source default
            state_raw = str(row.get("state", "") or "").strip().lower()
            state = (
                STATE_MAP.get(state_raw)
                or (state_raw.upper()[:10] if state_raw and state_raw not in ("nan", "none") else None)
                or state_default
                or "Federal"
            )

            # Status
            status_raw = str(row.get("status", "") or "").strip().lower()
            status = STATUS_MAP.get(status_raw, "open")

            # Sector — from file or infer from title
            sector_raw = str(row.get("sector", "") or "").strip().lower()
            sector = (
                sector_raw
                if sector_raw and sector_raw not in ("nan", "none", "")
                else _infer_sector(title)
            )

            # Agency — use job_name as fallback (important for BFV/SA which have no agency col)
            agency = str(row.get("agency", "") or "").strip()
            if not agency or agency.lower() in ("nan", "none"):
                agency = src_config.get("label", job_name)

            record = {
                "title":          title[:500],
                "description":    str(row.get("description", "") or "").strip()[:500] or None,
                "agency":         agency[:255],
                "sector":         sector,
                "state":          state,
                "status":         status,
                "contract_value": _parse_value(row.get("contract_value")),
                "close_date":     _parse_date(row.get("close_date")),
                "published_date": _parse_date(row.get("published_date")),
                "source_name":    source_name,
                "source_id":      str(source_id)[:255],
                "source_url":     str(row.get("source_url", "") or "").strip()[:500] or "",
            }
            records.append(record)
        except Exception as e:
            warnings.append(f"Row {idx}: skipped — {e}")

    return records, warnings


# ── WA Tenders custom parser ──────────────────────────────────────────────────
def _parse_wa_tenders(
    df_raw: pd.DataFrame,
    source_name: str,
    job_name: str,
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    WA Tenders exports a 3-column file where each cell contains
    multi-line data that needs to be split:

    Col 0: "REF_NO\n(tender_type)\nStatus\nTender"
    Col 1: "Title\nIssued by AGENCY\nUNSPSC:\ncategory info"
    Col 2: "closing\nDATE TIME"
    """
    warnings = []
    records  = []

    # Skip header rows — row 0 is the portal title, row 1 is column headers
    # Data starts at row index 2
    for idx, row in df_raw.iloc[2:].iterrows():
        try:
            col0 = str(row.iloc[0] or "").strip()
            col1 = str(row.iloc[1] or "").strip()
            col2 = str(row.iloc[2] or "").strip()

            if not col0 and not col1:
                continue

            # ── Parse col 0: ref_no / tender_type / status ──
            parts0 = [p.strip() for p in col0.split('\n') if p.strip()]
            ref_no      = parts0[0] if parts0 else f"wa-{idx}"
            # Type is in parentheses on second line
            tender_type = ""
            status_raw  = "open"
            for p in parts0[1:]:
                p_clean = p.strip('()')
                if p_clean and not p_clean.lower() in ("tender", "request", "rfq", "rfp", "eoi"):
                    if "sourcing" in p_clean.lower() or "invited" in p_clean.lower() or "open" in p_clean.lower():
                        tender_type = p_clean
                    elif p_clean.lower() in ("current", "closed", "cancelled", "awarded"):
                        status_raw = p_clean.lower()

            # ── Parse col 1: title / agency / unspsc ──
            parts1 = [p.strip() for p in col1.split('\n') if p.strip()]
            title  = parts1[0] if parts1 else ""
            agency = ""
            unspsc = ""
            for p in parts1[1:]:
                if p.startswith("Issued by "):
                    agency = p.replace("Issued by ", "").strip()
                elif p.startswith("UNSPSC:"):
                    unspsc = p.replace("UNSPSC:", "").strip()

            if not title or title.lower() in ("nan", "none", "details"):
                continue

            # ── Parse col 2: date type / date string ──
            parts2      = [p.strip() for p in col2.split('\n') if p.strip()]
            date_type   = parts2[0].lower() if parts2 else ""
            date_str    = parts2[1] if len(parts2) > 1 else ""
            close_date  = None
            pub_date    = None
            if "closing" in date_type or "close" in date_type:
                close_date = _parse_wa_date(date_str)
            elif "published" in date_type or "open" in date_type:
                pub_date = _parse_wa_date(date_str)
            else:
                close_date = _parse_wa_date(date_str)

            status = STATUS_MAP.get(status_raw, "open")

            # Infer sector from title + unspsc
            sector = _infer_sector(f"{title} {unspsc}")

            record = {
                "title":          title[:500],
                "description":    unspsc[:500] if unspsc else None,
                "agency":         (agency or job_name)[:255],
                "sector":         sector,
                "state":          "WA",
                "status":         status,
                "contract_value": 0.0,
                "close_date":     close_date,
                "published_date": pub_date,
                "source_name":    source_name,
                "source_id":      ref_no[:255],
                "source_url":     "",
            }
            records.append(record)
        except Exception as e:
            warnings.append(f"Row {idx}: skipped — {e}")

    return records, warnings


# ── Main entry point ──────────────────────────────────────────────────────────
def parse_file(
    content: bytes,
    filename: str,
    source_name: str,
    job_name: str,
    source_key: str = "others",
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse an uploaded Excel or CSV file using source-aware column mapping.

    Args:
        content:     raw file bytes
        filename:    original filename (used to determine format)
        source_name: canonical source slug (e.g. "buying_for_victoria")
        job_name:    human-readable upload name
        source_key:  source registry key — determines parser and column map

    Returns:
        (records, warnings)
    """
    src_config = get_source(source_key) or {}
    parser     = src_config.get("parser", "standard")

    # ── Load raw dataframe ─────────────────────────────────────────────────
    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content), encoding="utf-8", on_bad_lines="skip")
        elif filename.lower().endswith((".xlsx", ".xlsm")):
            # WA needs header=None so we handle it ourselves
            if parser == "wa_tenders":
                df = pd.read_excel(io.BytesIO(content), engine="openpyxl", header=None)
            else:
                df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
        elif filename.lower().endswith(".xls"):
            df = pd.read_excel(io.BytesIO(content), engine="xlrd")
        else:
            raise ValueError(f"Unsupported file type: {filename}")
    except Exception as e:
        raise ValueError(f"Could not read file: {e}")

    if df.empty:
        raise ValueError("File is empty or contains no data")

    logger.info(
        f"File ingestor [{source_key}]: loaded {len(df)} rows, "
        f"columns: {list(df.columns)[:10]}"
    )

    # ── Route to correct parser ────────────────────────────────────────────
    if parser == "wa_tenders":
        return _parse_wa_tenders(df, source_name, job_name)
    else:
        return _parse_standard(df, source_key, source_name, job_name)