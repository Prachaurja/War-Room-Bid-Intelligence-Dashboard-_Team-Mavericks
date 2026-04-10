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

def normalise_austender_csv(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Map GaPS/AusTender CSV → Tender schema.
    CONFIRMED field names from your log output:
    ContractID, Department, Portfolio, Division, Branch, AgencyReferenceNum,
    ContractDate1, EndDate1, Value, OfficePostcode, tblContract_Description,
    ProcurementDesc, ConfidentialityReason, Consultancy, Code,
    tblANZSCC_Description, Name, PostalAddress, Locality, State,
    OverseasCountry, Postcode, ABN, DUNS, ACN, SOAgencyReferenceNum
    """
    _log_once("at_fields", f"AusTender fields confirmed: {list(raw.keys())[:8]}")

    # Title — tblContract_Description is the contract description
    title = _get(raw,
        "tblContract_Description",
        "ProcurementDesc",
        "Description",
    )
    if not title:
        return None

    # ID
    source_id = _get(raw, "ContractID", "AgencyReferenceNum", "SOAgencyReferenceNum")
    if not source_id:
        return None

    # Agency
    agency = _get(raw, "Department", "Portfolio", "Division", "Branch")
    if not agency:
        agency = "Federal Government"

    # Category
    category = _get(raw, "tblANZSCC_Description", "Code", "Consultancy")

    # State — CSV has "State" column (supplier state)
    state_raw = _get(raw, "State", "OverseasCountry")
    # Normalise to Australian state abbreviations
    state_map = {
        "new south wales": "NSW", "nsw": "NSW",
        "victoria": "VIC", "vic": "VIC",
        "queensland": "QLD", "qld": "QLD",
        "western australia": "WA", "wa": "WA",
        "south australia": "SA", "sa": "SA",
        "tasmania": "TAS", "tas": "TAS",
        "northern territory": "NT", "nt": "NT",
        "australian capital territory": "ACT", "act": "ACT",
    }
    state = state_map.get(state_raw.lower(), "Federal")

    return {
        "title": title[:500],
        "description": category,
        "agency": agency[:255],
        "sector": _infer_sector(title + " " + category),
        "state": state,
        "status": "closed",
        "contract_value": _parse_value(raw.get("Value")),
        "close_date": _parse_date(raw.get("EndDate1")),
        "published_date": _parse_date(raw.get("ContractDate1")),
        "source_name": "austender",
        "source_id": str(source_id)[:255],
        "source_url": f"https://www.tenders.gov.au/Cn/Show/{source_id}",
    }

def normalise_nsw_csv(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Map NSW procurement CSV → Tender schema.
    This handles the NSW contracts datasets from data.gov.au.
    Field names vary — we try all known variants.
    """
    _log_once("nsw_fields", f"NSW fields confirmed: {list(raw.keys())[:8]}")

    # SKIP non-procurement datasets (e.g. ASIC licence data)
    # If key fields like CRED_LIC_NUM exist, this is the wrong dataset
    if any(k in raw for k in ["CRED_LIC_NUM", "REGISTER_NAME", "CRED_LIC_NAME"]):
        return None

    title = _get(raw,
        "Particulars", "particulars",
        "Description", "description",
        "Contract Description", "ContractDescription",
        "Title", "title", "Name", "name",
        "Project", "service_type", "ServiceType",
        "Contract Title", "ContractTitle",
    )
    if not title:
        return None

    source_id = _get(raw,
        "Contract Number", "ContractNumber", "contract_number",
        "Contract/Lease Number", "ID", "id",
        "Reference", "ContractID",
    )
    if not source_id:
        source_id = str(raw.get("_id", ""))
    if not source_id:
        return None

    agency = _get(raw,
        "Agency", "agency", "Department", "department",
        "Entity", "entity", "Contractor", "contractor",
        "Supplier", "supplier", "Name and Address",
    ) or "NSW Government"

    category = _get(raw,
        "Service Type", "ServiceType", "Category", "category",
        "Contract Type", "ContractType", "Type", "type",
        "GIPA Contract Class",
    )

    value = _parse_value(
        raw.get("Established Amount Payable") or
        raw.get("EstablishedAmountPayable") or
        raw.get("Amount") or raw.get("Value") or
        raw.get("Contract Value") or raw.get("value") or 0
    )

    return {
        "title": title[:500],
        "description": category,
        "agency": agency[:255],
        "sector": _infer_sector(title + " " + category),
        "state": "NSW",
        "status": "closed",
        "contract_value": value,
        "close_date": _parse_date(
            raw.get("Expiry Date") or raw.get("ExpiryDate") or
            raw.get("End Date") or raw.get("EndDate")
        ),
        "published_date": _parse_date(
            raw.get("Effective Date") or raw.get("EffectiveDate") or
            raw.get("Start Date") or raw.get("StartDate") or
            raw.get("Publish Date") or raw.get("Date")
        ),
        "source_name": "nsw_etender",
        "source_id": str(source_id)[:255],
        "source_url": "",
    }

def normalise(source_name: str, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if source_name == "austender":
        return normalise_austender_csv(raw)
    elif source_name == "nsw_etender":
        return normalise_nsw_csv(raw)
    else:
        logger.warning(f"Unknown source: {source_name}")
        return None