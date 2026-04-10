import io
import zipfile
from typing import List, Dict, Any
import logging
import pandas as pd
from app.ingestion.base_client import BaseIngestionClient

logger = logging.getLogger(__name__)

class AusTenderClient(BaseIngestionClient):
    """
    Downloads AusTender historical contract data from data.gov.au.
    Uses direct file download — no API auth, no resource IDs, no blocking.
    Confirmed dataset: historical-australian-government-contract-data
    """
    SOURCE_NAME = "austender"

    # These are confirmed direct download URLs from data.gov.au
    # Static files — permanent, no auth needed
    CSV_URLS = [
        # 2018-2020 data (most recent available as open CSV)
        "https://data.gov.au/data/dataset/5c7fa69b-b0e9-4553-b8df-2a022dd2e982/resource/3a41193c-d1dd-41dc-b258-c1fc56fc2fc4/download/cn2018-19.csv",
        # Fallback: use package API to find CSV resources
    ]

    # The confirmed dataset ID on data.gov.au
    DATASET_ID = "5c7fa69b-b0e9-4553-b8df-2a022dd2e982"

    async def fetch(self) -> List[Dict[str, Any]]:
        """
        Strategy:
        1. Use data.gov.au package API to get list of all resources
        2. Find CSV resources (not ZIPs, not XLS)
        3. Download the most recent CSV
        4. Parse with pandas and return records
        """
        logger.info("AusTender: fetching resource list from data.gov.au...")
        csv_url = await self._find_csv_resource()

        if not csv_url:
            logger.warning("AusTender: no CSV found via API, trying direct URLs")
            csv_url = self.CSV_URLS[0]

        logger.info(f"AusTender: downloading CSV from {csv_url[:80]}...")
        records = await self._download_and_parse(csv_url)
        logger.info(f"AusTender: parsed {len(records)} records")
        return records

    async def _find_csv_resource(self) -> str:
        """Use data.gov.au CKAN package_show to find a CSV resource."""
        url = "https://data.gov.au/data/api/3/action/package_show"
        params = {"id": self.DATASET_ID}
        data = await self.get(url, params=params)

        if not data or not data.get("success"):
            return ""

        resources = data.get("result", {}).get("resources", [])
        logger.info(f"AusTender: found {len(resources)} resources in dataset")

        # Find CSV resources — prefer recent years
        csv_resources = [
            r for r in resources
            if r.get("format", "").upper() in ("CSV", "TEXT/CSV")
            and r.get("url", "")
        ]

        # Sort by name descending to get most recent year first
        csv_resources.sort(key=lambda r: r.get("name", ""), reverse=True)

        if csv_resources:
            best = csv_resources[0]
            logger.info(f"AusTender: using resource '{best.get('name', '')}' — {best.get('url', '')[:60]}")
            return best.get("url", "")

        # No CSV found — try ZIP resources
        zip_resources = [
            r for r in resources
            if r.get("format", "").upper() in ("ZIP", "APPLICATION/ZIP")
            and r.get("url", "")
        ]
        if zip_resources:
            zip_resources.sort(key=lambda r: r.get("name", ""), reverse=True)
            return zip_resources[0].get("url", "")

        return ""

    async def _download_and_parse(self, url: str) -> List[Dict[str, Any]]:
        """Download file and parse as CSV or ZIP containing CSV."""
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            content = response.content

            # Detect if it's a ZIP file
            if content[:2] == b'PK' or url.endswith('.zip'):
                return self._parse_zip(content)
            else:
                return self._parse_csv(content)
        except Exception as e:
            logger.error(f"AusTender download error: {e}")
            return []

    def _parse_zip(self, zip_bytes: bytes) -> List[Dict[str, Any]]:
        """Extract CSV from ZIP and parse."""
        try:
            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
                csv_files = [n for n in zf.namelist() if n.endswith('.csv')]
                if not csv_files:
                    logger.error("AusTender ZIP: no CSV files found inside ZIP")
                    return []
                logger.info(f"AusTender ZIP: found CSV: {csv_files[0]}")
                with zf.open(csv_files[0]) as f:
                    return self._parse_csv(f.read())
        except Exception as e:
            logger.error(f"AusTender ZIP parse error: {e}")
            return []

    def _parse_csv(self, csv_bytes: bytes) -> List[Dict[str, Any]]:
        """Parse CSV bytes into list of dicts, limit to 500 rows."""
        try:
            # Try UTF-8 first, fall back to latin-1
            for encoding in ("utf-8", "latin-1", "cp1252"):
                try:
                    df = pd.read_csv(
                        io.BytesIO(csv_bytes),
                        encoding=encoding,
                        nrows=500,       # limit rows per run
                        on_bad_lines="skip",
                        low_memory=False,
                    )
                    break
                except UnicodeDecodeError:
                    continue

            df.columns = [str(c).strip() for c in df.columns]
            records = df.to_dict(orient="records")
            for r in records:
                r["_source"] = self.SOURCE_NAME
            logger.info(f"AusTender CSV: {len(records)} rows, columns: {list(df.columns[:6])}")
            return records
        except Exception as e:
            logger.error(f"AusTender CSV parse error: {e}")
            return []