import io
import zipfile
import asyncio
from typing import List, Dict, Any
import logging
import pandas as pd
from app.ingestion.base_client import BaseIngestionClient

logger = logging.getLogger(__name__)

# Field names that indicate a NON-procurement dataset — skip these
REJECT_FIELDS = {
    "CRED_LIC_NUM", "REGISTER_NAME", "CRED_LIC_NAME",
    "CRED_LIC_STATUS", "ABN_NUMBER", "LICENCE_NUMBER",
    "DRIVER_LICENCE", "PLATE_NUMBER",
}

# Field names that indicate a VALID procurement/contracts dataset
ACCEPT_FIELDS = {
    "Particulars", "particulars", "Contract Number", "ContractNumber",
    "Description", "description", "Agency", "agency",
    "Contract Value", "Value", "Established Amount Payable",
    "Department", "Contractor", "Contract Description",
    "Expiry Date", "ExpiryDate", "Effective Date",
}

class NSWeTenderClient(BaseIngestionClient):
    SOURCE_NAME = "nsw_etender"
    CKAN_BASE = "https://data.gov.au/data/api/3/action"

    # More targeted search terms for NSW procurement data
    SEARCH_TERMS = [
        "NSW government procurement contracts register",
        "NSW contracts register particulars agency",
        "NSW property contracts register",
        "government contracts NSW 150000",
    ]

    async def fetch(self) -> List[Dict[str, Any]]:
        for term in self.SEARCH_TERMS:
            records = await self._search_and_download(term)
            if records:
                logger.info(f"NSW: got {len(records)} valid records using '{term}'")
                return records
            await asyncio.sleep(1)
        logger.warning("NSW: no valid procurement data found")
        return []

    async def _search_and_download(self, search_term: str) -> List[Dict[str, Any]]:
        url = f"{self.CKAN_BASE}/package_search"
        params = {"q": search_term, "rows": 15, "fq": "res_format:CSV"}
        data = await self.get(url, params=params)
        if not data or not data.get("success"):
            return []

        packages = data.get("result", {}).get("results", [])
        logger.info(f"NSW: '{search_term}' → {len(packages)} packages")

        for pkg in packages:
            pkg_name = pkg.get("name", "")
            # Skip known non-procurement packages
            if any(skip in pkg_name.lower() for skip in [
                "credit", "licence", "driver", "asic", "liquor",
                "gaming", "vehicle", "firearms", "radiation"
            ]):
                logger.debug(f"NSW: skipping non-procurement package: {pkg_name}")
                continue

            resources = pkg.get("resources", [])
            csv_resources = [
                r for r in resources
                if r.get("format", "").upper() in ("CSV", "ZIP")
                and r.get("url", "").startswith("http")
            ]

            for resource in csv_resources[:3]:
                csv_url = resource.get("url", "")
                if not csv_url:
                    continue
                logger.info(f"NSW: trying {pkg_name} — {csv_url[:60]}")
                records = await self._download_and_validate(csv_url, pkg_name)
                if records:
                    return records
                await asyncio.sleep(0.5)

        return []

    async def _download_and_validate(self, url: str, pkg_name: str) -> List[Dict[str, Any]]:
        """Download CSV and validate it's actually procurement data."""
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            content = response.content

            if content[:4] == b'%PDF' or url.lower().endswith('.pdf'):
                logger.debug("NSW: skipping PDF")
                return []

            if content[:2] == b'PK' or url.lower().endswith('.zip'):
                records = self._parse_zip(content)
            else:
                records = self._parse_csv(content)

            if not records:
                return []

            # Validate: check if this looks like procurement data
            sample = records[0]
            fields = set(sample.keys())

            # Reject if it has ASIC/licence fields
            if fields & REJECT_FIELDS:
                logger.info(f"NSW: rejecting '{pkg_name}' — looks like licence/financial data")
                return []

            # Accept if it has procurement fields
            if fields & ACCEPT_FIELDS:
                logger.info(f"NSW: ACCEPTED '{pkg_name}' — procurement fields found")
                for r in records:
                    r["_source"] = self.SOURCE_NAME
                return records

            # Unknown dataset — log fields and skip
            logger.info(f"NSW: unknown dataset '{pkg_name}', fields: {list(fields)[:6]}")
            return []

        except Exception as e:
            logger.error(f"NSW download error: {e}")
            return []

    def _parse_zip(self, zip_bytes: bytes) -> List[Dict[str, Any]]:
        try:
            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
                csv_files = [n for n in zf.namelist() if n.endswith('.csv')]
                if not csv_files:
                    return []
                with zf.open(csv_files[0]) as f:
                    return self._parse_csv(f.read())
        except Exception as e:
            logger.error(f"NSW ZIP error: {e}")
            return []

    def _parse_csv(self, csv_bytes: bytes) -> List[Dict[str, Any]]:
        try:
            for encoding in ("utf-8", "latin-1", "cp1252"):
                try:
                    df = pd.read_csv(
                        io.BytesIO(csv_bytes),
                        encoding=encoding,
                        nrows=300,
                        on_bad_lines="skip",
                        low_memory=False,
                    )
                    break
                except UnicodeDecodeError:
                    continue
            df.columns = [str(c).strip() for c in df.columns]
            return df.to_dict(orient="records")
        except Exception as e:
            logger.error(f"NSW CSV parse error: {e}")
            return []