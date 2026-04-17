from datetime import datetime, timezone
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)
_SEEN = set()


def _log_once(key: str, msg: str):
    if key not in _SEEN:
        _SEEN.add(key)
        logger.info(msg)


def _parse_date(val) -> Optional[datetime]:
    if not val:
        return None
    s = str(val).strip()
    if s in ("", "nan", "None", "N/A", "NaT"):
        return None
    formats = [
        "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S",
        "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y",
        "%m/%d/%Y",
        "%d/%m/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S",
        "%d %b %Y", "%Y",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(s[:19], fmt[:19])
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _parse_value(val) -> float:
    if not val:
        return 0.0
    try:
        s = str(val).replace(",", "").replace("$", "").strip()
        return float(s) if s not in ("nan", "None", "") else 0.0
    except (ValueError, TypeError):
        return 0.0


def _get(raw: dict, *keys) -> str:
    for k in keys:
        v = str(raw.get(k, "") or "").strip()
        if v and v not in ("nan", "None", "N/A", "NaN", ""):
            return v
    return ""


def _infer_sector(text: str) -> str:
    t = (text or "").lower()
    if any(w in t for w in ["clean", "janitor", "hygiene", "sanitati"]):
        return "cleaning"
    if any(w in t for w in ["facilit", "maintenance", "property mgmt", "building"]):
        return "facility_management"
    if any(w in t for w in ["construct", " build", "civil ", "infrastructure"]):
        return "construction"
    if any(w in t for w in ["software", "ict", "digital", "cyber", "cloud", "technology"]):
        return "it_services"
    if any(w in t for w in ["health", "medical", "hospital", "clinical"]):
        return "healthcare"
    if any(w in t for w in ["transport", "logistic", "fleet", "vehicle"]):
        return "transportation"
    return "other"


# ── AusTender GaPS ───────────────────────────────────────────

def normalise_austender_csv(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    _log_once("at_fields", f"AusTender fields: {list(raw.keys())[:8]}")

    title = _get(raw, "tblContract_Description", "ProcurementDesc", "Description")
    if not title:
        return None

    source_id = _get(raw, "ContractID", "AgencyReferenceNum", "SOAgencyReferenceNum")
    if not source_id:
        return None

    agency   = _get(raw, "Department", "Portfolio", "Division", "Branch") or "Federal Government"
    category = _get(raw, "tblANZSCC_Description", "Code", "Consultancy")

    state_raw = _get(raw, "State", "OverseasCountry")
    state_map = {
        "new south wales": "NSW", "nsw": "NSW",
        "victoria": "VIC",        "vic": "VIC",
        "queensland": "QLD",      "qld": "QLD",
        "western australia": "WA","wa":  "WA",
        "south australia": "SA",  "sa":  "SA",
        "tasmania": "TAS",        "tas": "TAS",
        "northern territory": "NT","nt": "NT",
        "australian capital territory": "ACT", "act": "ACT",
    }
    state = state_map.get(state_raw.lower(), "Federal")

    return {
        "title":          title[:500],
        "description":    category,
        "agency":         agency[:255],
        "sector":         _infer_sector(title + " " + category),
        "state":          state,
        "status":         "closed",
        "contract_value": _parse_value(raw.get("Value")),
        "close_date":     _parse_date(raw.get("EndDate1")),
        "published_date": _parse_date(raw.get("ContractDate1")),
        "source_name":    "austender",
        "source_id":      str(source_id)[:255],
        "source_url":     f"https://www.tenders.gov.au/Cn/Show/{source_id}",
    }


# ── QLD Contracts Directory ───────────────────────────────────

def normalise_qld_contracts(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    _log_once("qld_con_fields", f"QLD Contracts fields: {list(raw.keys())[:6]}")

    title = _get(raw, "Arrangement Name")
    if not title:
        return None

    source_id = _get(raw, "Arrangement Number")
    if not source_id:
        return None

    agency   = _get(raw, "Department", "Section") or "QLD Government"
    category = _get(raw, "Categories", "Section")

    return {
        "title":          title[:500],
        "description":    category,
        "agency":         agency[:255],
        "sector":         _infer_sector(title + " " + category),
        "state":          "QLD",
        "status":         "closed",
        "contract_value": 0.0,
        "close_date":     _parse_date(raw.get("Expiry Date")),
        "published_date": _parse_date(raw.get("Start Date")),
        "source_name":    "qld_tenders",
        "source_id":      str(source_id)[:255],
        "source_url":     "",
    }


# ── QLD Forward Procurement Pipeline ─────────────────────────

def normalise_qld_pipeline(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    _log_once("qld_pipe_fields", f"QLD Pipeline fields: {list(raw.keys())[:6]}")

    title = _get(raw, "Program Description", "Category")
    if not title:
        return None

    agency   = _get(raw, "Agency", "Business Unit") or "QLD Government"
    category = _get(raw, "Category", "Category Group")
    timing   = _get(raw, "Estimated Timing for Release to Market")
    method   = _get(raw, "Procurement Method")
    region   = _get(raw, "Region SA4", "Agency Region")

    spend_map = {
        "< $1M":           500_000,
        "$1M - $5M":     3_000_000,
        "$5M - $10M":    7_500_000,
        "$10M - $50M":  30_000_000,
        "$50M - $100M": 75_000_000,
        "> $100M":     150_000_000,
    }
    spend_raw      = _get(raw, "Spend Range")
    contract_value = float(spend_map.get(spend_raw, 0))
    close_date     = _parse_timing(timing)
    source_id      = f"qldpipe-{abs(hash(agency + title)) % 10_000_000}"
    description    = f"{method} | {timing} | {region}".strip(" |")

    return {
        "title":          title[:500],
        "description":    description,
        "agency":         agency[:255],
        "sector":         _infer_sector(title + " " + category),
        "state":          "QLD",
        "status":         "upcoming",
        "contract_value": contract_value,
        "close_date":     close_date,
        "published_date": None,
        "source_name":    "qld_tenders",
        "source_id":      str(source_id)[:255],
        "source_url":     _get(raw, "Link"),
    }


def _parse_timing(timing: str) -> Optional[datetime]:
    """Convert 'Jan - Mar 26' into a datetime using the end month."""
    if not timing:
        return None
    try:
        parts = timing.replace(" ", "").split("-")
        if len(parts) >= 2:
            end_part  = parts[-1]
            month_str = end_part[:3]
            year_str  = end_part[3:].strip()
            if len(year_str) == 2:
                year_str = "20" + year_str
            dt = datetime.strptime(f"{month_str} {year_str}", "%b %Y")
            return dt.replace(tzinfo=timezone.utc)
    except Exception:
        pass
    return None


# ── NSW eTender (legacy) ──────────────────────────────────────

def normalise_nsw_csv(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    _log_once("nsw_fields", f"NSW fields: {list(raw.keys())[:8]}")

    if any(k in raw for k in ["CRED_LIC_NUM", "REGISTER_NAME", "CRED_LIC_NAME"]):
        return None

    title = _get(raw,
        "Particulars", "particulars", "Description", "description",
        "Contract Description", "Title", "title", "Name", "name",
    )
    if not title:
        return None

    source_id = _get(raw,
        "Contract Number", "ContractNumber", "contract_number",
        "ID", "id", "Reference", "ContractID",
    ) or str(raw.get("_id", ""))
    if not source_id:
        return None

    agency   = _get(raw, "Agency", "agency", "Department", "department") or "NSW Government"
    category = _get(raw, "Service Type", "ServiceType", "Category", "category", "Type")
    value    = _parse_value(
        raw.get("Established Amount Payable") or raw.get("Amount") or
        raw.get("Value") or raw.get("Contract Value") or 0
    )

    return {
        "title":          title[:500],
        "description":    category,
        "agency":         agency[:255],
        "sector":         _infer_sector(title + " " + category),
        "state":          "NSW",
        "status":         "closed",
        "contract_value": value,
        "close_date":     _parse_date(raw.get("Expiry Date") or raw.get("End Date")),
        "published_date": _parse_date(raw.get("Effective Date") or raw.get("Start Date")),
        "source_name":    "nsw_etender",
        "source_id":      str(source_id)[:255],
        "source_url":     "",
    }


# ── Router ────────────────────────────────────────────────────

def normalise(source_name: str, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if source_name == "austender":
        return normalise_austender_csv(raw)

    elif source_name == "qld_tenders":
        label = raw.get("_source_label", "")
        if label == "Forward Pipeline":
            return normalise_qld_pipeline(raw)
        else:
            return normalise_qld_contracts(raw)

    elif source_name == "nsw_etender":
        return normalise_nsw_csv(raw)

    else:
        logger.warning(f"Unknown source: {source_name}")
        return None