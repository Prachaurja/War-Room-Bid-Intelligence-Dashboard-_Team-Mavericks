from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import logging
from bs4 import BeautifulSoup
from app.ingestion.base_client import BaseIngestionClient

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


class TendersNetClient(BaseIngestionClient):
    """
    Fetches and parses Tenders.Net daily notification pages.
    URLs are stored in the tendersnet_urls database table.
    Each URL is a personalised notification page containing
    open tenders matched to Prompcorp's profile.
    Free to access with browser headers — no auth required.
    """

    SOURCE_NAME = "tendersnet"

    def __init__(self, urls: List[Dict[str, Any]]):
        """
        urls: list of dicts with keys: id, url, label
        """
        super().__init__()
        self.urls = urls

    async def fetch(self) -> List[Dict[str, Any]]:
        all_records = []
        for entry in self.urls:
            records = await self._fetch_url(entry["url"], entry.get("label", ""))
            for r in records:
                r["_url_id"] = entry["id"]
            all_records.extend(records)
        logger.info(f"TendersNet: {len(all_records)} total records from {len(self.urls)} URLs")
        return all_records

    async def _fetch_url(self, url: str, label: str) -> List[Dict[str, Any]]:
        try:
            logger.info(f"TendersNet: fetching {url[:60]}...")
            response = await self.client.get(url, headers=HEADERS, follow_redirects=True)
            response.raise_for_status()
            records = self._parse_html(response.text)
            logger.info(f"TendersNet [{label or url[:40]}]: {len(records)} tenders")
            return records
        except Exception as e:
            logger.warning(f"TendersNet [{label or url[:40]}] failed — {e}")
            return []

    def _parse_html(self, html: str) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html, "html.parser")
        records = []

        # Each tender is in a div with class containing tn-advertisement
        tender_divs = soup.find_all(
            "div",
            class_=lambda c: c and "tn-advertisement" in c
        )

        for div in tender_divs:
            try:
                record = self._parse_tender_div(div)
                if record:
                    records.append(record)
            except Exception as e:
                logger.debug(f"TendersNet: failed to parse tender div — {e}")

        return records

    def _parse_tender_div(self, div) -> Optional[Dict[str, Any]]:
        # Title is in <h2>
        title_tag = div.find("h2")
        title = title_tag.get_text(strip=True) if title_tag else ""
        if not title:
            return None

        # Source ID from div id attribute e.g. id="tender1603316"
        div_id = div.get("id", "")
        source_id = div_id.replace("tender", "") if div_id.startswith("tender") else div_id

        # Parse table rows — td.td_title contains field name, next td contains value
        fields = {}
        rows = div.find_all("tr")
        for row in rows:
            title_td = row.find("td", class_="td_title")
            field_td = row.find("td", class_="td_field")
            if title_td and field_td:
                key = title_td.get_text(strip=True).rstrip(":")
                value = field_td.get_text(separator=" ", strip=True)
                fields[key] = value

        agency   = fields.get("Agency", "")
        location = fields.get("Location", "")
        closing  = fields.get("Closing", "")
        details  = fields.get("Details", "")
        tn_num   = fields.get("Tenders.Net #", source_id)

        # Parse closing date — format: "11/05/2026 - 02:00 pm"
        close_date = None
        if closing:
            date_part = closing.split("-")[0].strip()
            close_date = self._parse_date(date_part)

        # Infer state from location
        state = self._infer_state(location)

        return {
            "_source":        self.SOURCE_NAME,
            "title":          title[:500],
            "description":    details[:500] if details else "",
            "agency":         agency[:255],
            "sector":         self._infer_sector(title + " " + details),
            "state":          state,
            "status":         "open",
            "contract_value": 0.0,
            "close_date":     close_date,
            "published_date": None,
            "source_name":    self.SOURCE_NAME,
            "source_id":      f"tn-{tn_num}"[:255],
            "source_url":     f"https://www.tenders.net/tender/{tn_num}",
        }

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        formats = ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"]
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        return None

    def _infer_state(self, location: str) -> str:
        loc = location.upper()
        mapping = {
            "NSW": "NSW", "VIC": "VIC", "QLD": "QLD",
            "WA": "WA", "SA": "SA", "TAS": "TAS",
            "NT": "NT", "ACT": "ACT",
        }
        for key, val in mapping.items():
            if key in loc:
                return val
        return "Federal"

    def _infer_sector(self, text: str) -> str:
        t = text.lower()
        if any(w in t for w in ["clean", "janitor", "hygiene"]):
            return "cleaning"
        if any(w in t for w in ["facilit", "maintenance", "property", "building"]):
            return "facility_management"
        if any(w in t for w in ["construct", "civil", "infrastructure"]):
            return "construction"
        if any(w in t for w in ["software", "ict", "digital", "cyber", "cloud", "technology"]):
            return "it_services"
        if any(w in t for w in ["health", "medical", "hospital", "clinical"]):
            return "healthcare"
        if any(w in t for w in ["transport", "logistic", "fleet", "vehicle"]):
            return "transportation"
        if any(w in t for w in ["water", "wastewater", "catchment", "reticulation"]):
            return "utilities"
        return "other"