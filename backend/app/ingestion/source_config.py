"""
Tender Source Registry
======================
Canonical list of all supported tender portals with:
  - display name shown in the UI dropdown
  - canonical slug used as source_name in the DB
  - state scope
  - column mappings specific to each portal's export format
  - alternative column names (aliases) for when portals change their headers

Add new portals here — no changes needed anywhere else.
"""

from typing import Dict, List, Optional


# ── Source registry ──────────────────────────────────────────────────────────
# Each entry:
#   key          : canonical slug stored in DB as source_name
#   label        : display name shown in UI dropdown
#   scope        : state scope label shown in UI
#   state_default: if this portal only covers one state, set it here
#   parser       : "standard" (default) or "wa_tenders" (custom multi-line parser)
#   columns      : {our_field: [possible_column_names_in_their_export]}

SOURCES: Dict[str, dict] = {

    "tenders_net": {
        "label":         "Tenders.Net",
        "scope":         "All States",
        "state_default": None,
        "parser":        "standard",
        "columns": {
            "title": [
                "Title", "Tender Title", "Subject", "tender title", "title"
            ],
            "agency": [
                "Organisation", "Organization", "Entity", "Buyer",
                "Client", "Procuring Entity", "organisation",
            ],
            "state": [
                "State", "Location", "Region", "Jurisdiction", "state",
            ],
            "tender_type": [
                "Type", "Tender Type", "Procurement Type", "type",
            ],
            "sector": [
                "Category", "Sector", "category", "sector",
            ],
            "source_id": [
                "Reference", "Reference Number", "Tender ID", "Code",
                "Tender Number", "reference", "code",
            ],
            "published_date": [
                "Opening Date", "Open Date", "Publish Date", "Published Date",
                "Release Date", "Start Date", "opening date",
            ],
            "close_date": [
                "Closing Date", "Close Date", "Due Date", "Deadline",
                "Closing", "End Date", "Expiry Date", "closing date",
            ],
            "contract_value": [
                "Value", "Contract Value", "Estimated Value", "Budget",
                "Amount", "Total Value", "value",
            ],
            "source_url": [
                "URL", "Link", "Tender URL", "url", "link",
            ],
        },
    },

    "austender": {
        "label":         "AusTender",
        "scope":         "Federal / All States",
        "state_default": "Federal",
        "parser":        "standard",
        "columns": {
            "title": [
                "ATM Title", "Title", "CN Description", "Procurement Description", "title",
            ],
            "description": [
                "Description", "Summary", "Scope", "Brief",
            ],
            "agency": [
                "Entity", "Agency", "Organisation", "Buyer",
                "Procuring Entity", "entity",
            ],
            "state": [
                "State", "Location", "Delivery Location", "state",
            ],
            "tender_type": [
                "ATM Type", "Type", "Procurement Type",
                "Approach to Market Type", "type",
            ],
            "sector": [
                "Category", "Sector", "UNSPSC", "category",
            ],
            "source_id": [
                "ATM ID", "CN ID", "Reference", "Reference Number",
                "Tender Number", "atm id", "reference",
            ],
            "published_date": [
                "Published", "Publish Date", "Opening Date", "Start Date",
                "Release Date", "published",
            ],
            "close_date": [
                "Close Date", "Closing Date", "Due Date", "Deadline",
                "close date", "closing date",
            ],
            "contract_value": [
                "Value (AUD)", "Contract Value", "Estimated Value",
                "Maximum Value", "Total Value", "value (aud)",
            ],
            "source_url": [
                "URL", "Link", "AusTender URL", "url",
            ],
        },
    },

    "buying_for_victoria": {
        "label":         "Buying for Victoria",
        "scope":         "Victoria",
        "state_default": "VIC",
        "parser":        "standard",
        "columns": {
            "title": [
                "Title", "Tender Title", "title"
            ],
            "agency": [
                "Organisation", "Agency", "Entity", "Buyer",
                "Client", "organisation", "agency",
                # BFV often has no agency column — handled via fallback
            ],
            "state": [
                "State", "Location", "Jurisdiction", "state",
            ],
            "tender_type": [
                "Type", "Tender Type", "Procurement Type", "type",
            ],
            "sector": [
                "Category", "Sector", "category", "sector",
            ],
            "source_id": [
                "Code", "Reference", "Reference Number", "Tender ID",
                "Tender Number", "code", "reference",
            ],
            "published_date": [
                "Opening Date", "Open Date", "Published Date",
                "Start Date", "opening date",
            ],
            "close_date": [
                "Closing Date", "Close Date", "Due Date", "Deadline",
                "Expiry Date", "closing date",
            ],
            "contract_value": [
                "Value", "Contract Value", "Estimated Value", "Budget",
                "value", "contract value",
            ],
            "source_url": [
                "URL", "Link", "url", "link",
            ],
        },
    },

    "nsw_etender": {
        "label":         "NSW eTender",
        "scope":         "New South Wales",
        "state_default": "NSW",
        "parser":        "standard",
        "columns": {
            "title": [
                "Title", "Tender Title", "Subject",
                "Opportunity Title", "title"
            ],
            "agency": [
                "Organisation", "Agency", "Entity", "Buyer",
                "Procuring Entity", "Client", "organisation",
            ],
            "state": [
                "State", "Location", "Region", "state",
            ],
            "tender_type": [
                "Type", "Tender Type", "Procurement Type",
                "Contract Type", "type",
            ],
            "sector": [
                "Category", "Sector", "Industry", "category",
            ],
            "source_id": [
                "Reference", "Reference Number", "Tender ID",
                "Tender Number", "ATM ID", "reference",
            ],
            "published_date": [
                "Opening Date", "Open Date", "Published Date",
                "Release Date", "opening date",
            ],
            "close_date": [
                "Closing Date", "Close Date", "Due Date", "Deadline",
                "closing date",
            ],
            "contract_value": [
                "Value", "Contract Value", "Estimated Value",
                "Budget", "value",
            ],
            "source_url": [
                "URL", "Link", "Tender URL", "url",
            ],
        },
    },

    "sa_tenders": {
        "label":         "SA Tenders",
        "scope":         "South Australia",
        "state_default": "SA",
        "parser":        "standard",
        "columns": {
            "title": [
                "Title", "Tender Title", "title"
            ],
            "agency": [
                "Organisation", "Agency", "Entity", "Buyer",
                "Client", "organisation",
            ],
            "state": [
                "State", "Location", "Jurisdiction", "state",
            ],
            "tender_type": [
                "Type", "Tender Type", "Procurement Type", "type",
            ],
            "sector": [
                "Category", "Sector", "category", "sector",
            ],
            "source_id": [
                "Code", "Reference", "Reference Number", "Tender ID",
                "Tender Number", "code", "reference",
            ],
            "published_date": [
                "Opening Date", "Open Date", "Published Date",
                "Start Date", "opening date",
            ],
            "close_date": [
                "Closing Date", "Close Date", "Due Date",
                "Deadline", "closing date",
            ],
            "contract_value": [
                "Value", "Contract Value", "Estimated Value",
                "Budget", "value",
            ],
            "source_url": [
                "URL", "Link", "url",
            ],
        },
    },

    "wa_tenders": {
        "label":         "Tenders WA",
        "scope":         "Western Australia",
        "state_default": "WA",
        "parser":        "wa_tenders",   # custom multi-line cell parser
        "columns": {},                   # parsed manually in wa parser
    },

    "qtenders": {
        "label":         "QTenders",
        "scope":         "Queensland",
        "state_default": "QLD",
        "parser":        "standard",
        "columns": {
            "title": [
                "Title", "Tender Title", "Subject", "title"
            ],
            "agency": [
                "Organisation", "Agency", "Entity", "Buyer",
                "Department", "Client", "organisation",
            ],
            "state": [
                "State", "Location", "Region", "state",
            ],
            "tender_type": [
                "Type", "Tender Type", "Procurement Type",
                "Contract Type", "type",
            ],
            "sector": [
                "Category", "Sector", "Industry", "category",
            ],
            "source_id": [
                "Reference", "Reference Number", "Tender ID",
                "Tender Number", "ATM ID", "reference",
            ],
            "published_date": [
                "Opening Date", "Open Date", "Published Date",
                "Release Date", "opening date",
            ],
            "close_date": [
                "Closing Date", "Close Date", "Due Date",
                "Deadline", "closing date",
            ],
            "contract_value": [
                "Value", "Contract Value", "Estimated Value",
                "Budget", "value",
            ],
            "source_url": [
                "URL", "Link", "url",
            ],
        },
    },

    "nt_tenders": {
        "label":         "Quotations and Tenders Online",
        "scope":         "Northern Territory",
        "state_default": "NT",
        "parser":        "standard",
        "columns": {
            "title": [
                "Title", "Tender Title",
                "Subject", "title"
            ],
            "agency": [
                "Organisation", "Agency", "Entity",
                "Buyer", "Client", "organisation",
            ],
            "state": [
                "State", "Location", "Region", "state",
            ],
            "tender_type": [
                "Type", "Tender Type", "Procurement Type", "type",
            ],
            "sector": [
                "Category", "Sector", "category",
            ],
            "source_id": [
                "Reference", "Reference Number", "Tender ID",
                "Tender Number", "reference",
            ],
            "published_date": [
                "Opening Date", "Open Date", "Published Date",
                "Release Date", "opening date",
            ],
            "close_date": [
                "Closing Date", "Close Date", "Due Date",
                "Deadline", "closing date",
            ],
            "contract_value": [
                "Value", "Contract Value", "Estimated Value",
                "Budget", "value",
            ],
            "source_url": [
                "URL", "Link", "url",
            ],
        },
    },

    "tas_tenders": {
        "label":         "Tasmanian Government Tenders",
        "scope":         "Tasmania",
        "state_default": "TAS",
        "parser":        "standard",
        "columns": {
            "title": [
                "Title", "Tender Title", "Subject", "title"
            ],
            "agency": [
                "Organisation", "Agency", "Entity",
                "Buyer", "Client", "Department", "organisation",
            ],
            "state": [
                "State", "Location", "Region", "state",
            ],
            "tender_type": [
                "Type", "Tender Type", "Procurement Type", "type",
            ],
            "sector": [
                "Category", "Sector", "Industry", "category",
            ],
            "source_id": [
                "Reference", "Reference Number", "Tender ID",
                "Tender Number", "reference",
            ],
            "published_date": [
                "Opening Date", "Open Date", "Published Date",
                "Release Date", "opening date",
            ],
            "close_date": [
                "Closing Date", "Close Date", "Due Date",
                "Deadline", "closing date",
            ],
            "contract_value": [
                "Value", "Contract Value", "Estimated Value",
                "Budget", "value",
            ],
            "source_url": [
                "URL", "Link", "url",
            ],
        },
    },

    "others": {
        "label":         "Others",
        "scope":         "Custom",
        "state_default": None,
        "parser":        "standard",
        # Generic fallback — uses the broad COLUMN_MAP from file_ingestor
        "columns": {},
    },
}


def get_source(key: str) -> Optional[dict]:
    """Return source config by key, or None if not found."""
    return SOURCES.get(key)


def get_source_label(key: str) -> str:
    """Return display label for a source key."""
    src = SOURCES.get(key)
    return src["label"] if src else key


def list_sources() -> List[dict]:
    """Return all sources as a list for the API / frontend dropdown."""
    return [
        {
            "key":   k,
            "label": v["label"],
            "scope": v["scope"],
        }
        for k, v in SOURCES.items()
    ]


def build_column_map(source_key: str) -> Dict[str, str]:
    """
    Build a flat {column_name_lower: our_field} map for a given source.
    Falls back to the generic COLUMN_MAP for unknown/others sources.
    """
    src = SOURCES.get(source_key, {})
    col_config = src.get("columns", {})

    mapping: Dict[str, str] = {}
    for our_field, aliases in col_config.items():
        for alias in aliases:
            mapping[alias.lower()] = our_field

    return mapping