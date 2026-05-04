"""
Smart file ingestor — accepts Excel (.xlsx, .xls) and CSV files.
Automatically maps column names from different government portals
to the War Room tender schema.
"""
import io
import logging
import pandas as pd
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ── Column name mappings ──────────────────────────────────────
# Maps common government portal column names → our field names
COLUMN_MAP = {
    # Title
    "title":                    "title",
    "tender title":             "title",
    "subject":                  "title",
    "description":              "title",
    "contract description":     "title",
    "procurement description":  "title",
    "name":                     "title",
    "tender name":              "title",
    "opportunity title":        "title",

    # Agency
    "entity":                   "agency",
    "organisation":             "agency",
    "organization":             "agency",
    "buyer":                    "agency",
    "procuring entity":         "agency",
    "client":                   "agency",

    # State / location
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

    # Reference / code
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
    "commence date":            "published_date",

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

    # URL
    "url":                      "source_url",
    "link":                     "source_url",
    "tender url":               "source_url",
}

STATE_MAP = {
    "victoria":             "VIC", "vic":  "VIC",
    "new south wales":      "NSW", "nsw":  "NSW",
    "queensland":           "QLD", "qld":  "QLD",
    "western australia":    "WA",  "wa":   "WA",
    "south australia":      "SA",  "sa":   "SA",
    "tasmania":             "TAS", "tas":  "TAS",
    "northern territory":   "NT",  "nt":   "NT",
    "act":                  "ACT", "australian capital territory": "ACT",
    "open":                 "Federal",
}

STATUS_MAP = {
    "open":      "open",
    "active":    "open",
    "live":      "open",
    "current":   "open",
    "closed":    "closed",
    "awarded":   "closed",
    "cancelled": "closed",
    "upcoming":  "upcoming",
    "planned":   "upcoming",
    "future":    "upcoming",
}

SECTOR_KEYWORDS = {
    "cleaning":             ["clean", "janitor", "hygiene"],
    "facility_management":  ["facilit", "maintenance", "property", "building"],
    "construction":         ["construct", "civil", "infrastructure", "road"],
    "it_services":          ["software", "ict", "digital", "cyber", "cloud", "technology"],
    "healthcare":           ["health", "medical", "hospital", "clinical"],
    "transportation":       ["transport", "logistic", "fleet", "vehicle"],
    "utilities":            ["water", "wastewater", "energy", "electricity"],
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
        "%d %b %Y", "%B %d, %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s[:19], fmt[:19]).replace(tzinfo=timezone.utc)
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


def _normalise_column_names(df: pd.DataFrame) -> Dict[str, str]:
    """Map dataframe columns to our field names."""
    mapping = {}
    for col in df.columns:
        key = col.strip().lower()
        if key in COLUMN_MAP:
            mapping[col] = COLUMN_MAP[key]
    return mapping


def parse_file(
    content: bytes,
    filename: str,
    source_name: str,
    job_name: str,
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse an uploaded Excel or CSV file.
    Returns (records, warnings).
    """
    warnings = []

    # Load into dataframe
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content), encoding="utf-8", on_bad_lines="skip")
        elif filename.endswith((".xlsx", ".xlsm")):
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
        elif filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(content), engine="xlrd")
        else:
            raise ValueError(f"Unsupported file type: {filename}")
    except Exception as e:
        raise ValueError(f"Could not read file: {e}")

    if df.empty:
        raise ValueError("File is empty")

    logger.info(f"File ingestor: loaded {len(df)} rows, columns: {list(df.columns)}")

    # Map column names
    col_map = _normalise_column_names(df)
    if not col_map:
        raise ValueError(
            f"Could not recognise any columns. Found: {list(df.columns)}. "
            f"Expected columns like: Title, Agency, Closing Date, State, etc."
        )

    unmapped = [c for c in df.columns if c not in col_map]
    if unmapped:
        warnings.append(f"Ignored unrecognised columns: {', '.join(unmapped)}")

    # Rename columns to our field names
    df = df.rename(columns=col_map)

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

            # State
            state_raw = str(row.get("state", "") or "").strip().lower()
            state = STATE_MAP.get(state_raw, state_raw.upper()[:10] if state_raw else "Federal")

            # Status — from file or infer from tender_type/state
            status_raw = str(row.get("status", "") or "").strip().lower()
            status = STATUS_MAP.get(status_raw, "open")

            # Sector — from file or infer from title
            sector_raw = str(row.get("sector", "") or "").strip().lower()
            sector = sector_raw if sector_raw and sector_raw not in ("nan", "none", "") \
                else _infer_sector(title)

            # Agency — use job_name prefix as fallback
            agency = str(row.get("agency", "") or "").strip()
            if not agency or agency.lower() in ("nan", "none"):
                agency = job_name

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

    logger.info(f"File ingestor: {len(records)} valid records parsed from {len(df)} rows")
    return records, warnings
