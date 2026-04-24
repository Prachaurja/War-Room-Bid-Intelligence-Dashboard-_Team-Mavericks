from typing import List, Dict, Any
import io
import logging
import pandas as pd
from app.ingestion.base_client import BaseIngestionClient

logger = logging.getLogger(__name__)


class QLDTendersClient(BaseIngestionClient):
    """
    Fetches TWO Queensland Government procurement datasets:

    1. QLD Contracts Directory — standing offer arrangements (status=closed)
       data.qld.gov.au — CKAN API, updated bi-annually

    2. QLD Forward Procurement Pipeline — upcoming tenders (status=upcoming)
       data.qld.gov.au — direct CSV, updated monthly
       Confirmed columns: Agency, Business Unit, Category Group, Category,
       Program Description, Estimated Timing for Release to Market,
       Procurement Method, Spend Range, Funding Status, Region SA4

    Both: Creative Commons Attribution 4.0 — free, no auth required.
    """
    SOURCE_NAME = "qld_tenders"

    # Source 1 — Contracts Directory (standing offers)
    CONTRACTS_CSV = (
        "https://www.data.qld.gov.au/dataset/612ed57a-8e89-440a-87ad-c6c67df9017c"
        "/resource/9eff5832-a0c6-47bf-9036-4fcc9ac30c8b"
        "/download/queenslandgovernmentcontractsdirectory-b.csv"
    )

    # Source 2 — Forward Procurement Pipeline (upcoming)
    # URL redirects to latest monthly file automatically via -L
    PIPELINE_CSV = (
        "https://www.data.qld.gov.au/dataset/2ee69f84-0495-46b4-8640-af85b148f16b"
        "/resource/d3968658-dbb7-4732-bc19-467c49de23de"
        "/download/forward-procurement-pipeline-apr-2025.csv"
    )

    async def fetch(self) -> List[Dict[str, Any]]:
        """
        Fetch both QLD sources and combine.
        Contracts Directory → status=closed
        Forward Pipeline    → status=upcoming
        """
        all_records = []

        # Source 1 — Contracts Directory
        contracts = await self._fetch_source(
            "Contracts Directory",
            self.CONTRACTS_CSV,
            status_override="closed",
        )
        all_records.extend(contracts)

        # Source 2 — Forward Procurement Pipeline
        pipeline = await self._fetch_source(
            "Forward Pipeline",
            self.PIPELINE_CSV,
            status_override="upcoming",
        )
        all_records.extend(pipeline)

        logger.info(
            f"QLD Tenders: total {len(all_records)} records "
            f"({len(contracts)} contracts + {len(pipeline)} pipeline)"
        )
        return all_records

    async def _fetch_source(
        self,
        label: str,
        url: str,
        status_override: str,
    ) -> List[Dict[str, Any]]:
        """Download a CSV URL and tag each record with status and label."""
        try:
            logger.info(f"QLD Tenders [{label}]: fetching {url[:70]}...")
            response = await self.client.get(url)
            response.raise_for_status()
            records = self._parse_csv(response.content, label)
            for r in records:
                r["_source"]          = self.SOURCE_NAME
                r["_source_label"]    = label
                r["_status_override"] = status_override
            logger.info(f"QLD Tenders [{label}]: {len(records)} records")
            return records
        except Exception as e:
            logger.warning(f"QLD Tenders [{label}] failed — {e}")
            return []

    def _parse_csv(self, csv_bytes: bytes, label: str) -> List[Dict[str, Any]]:
        """Parse CSV bytes — try multiple encodings, limit 500 rows."""
        try:
            df = None
            for encoding in ("utf-8", "latin-1", "cp1252"):
                try:
                    df = pd.read_csv(
                        io.BytesIO(csv_bytes),
                        encoding=encoding,
                        nrows=500,
                        on_bad_lines="skip",
                        low_memory=False,
                    )
                    break
                except UnicodeDecodeError:
                    continue

            if df is None or df.empty:
                logger.warning(f"QLD Tenders [{label}]: CSV empty after parse")
                return []

            df.columns = [str(c).strip() for c in df.columns]
            records    = df.to_dict(orient="records")
            logger.info(
                f"QLD Tenders [{label}]: {len(records)} rows — "
                f"columns: {list(df.columns[:5])}"
            )
            return records

        except Exception as e:
            logger.error(f"QLD Tenders [{label}] CSV parse error: {e}")
            return []