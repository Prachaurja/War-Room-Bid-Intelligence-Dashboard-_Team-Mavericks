from abc import ABC, abstractmethod
from typing import List, Dict, Any
import httpx
import logging

logger = logging.getLogger(__name__)

class BaseIngestionClient(ABC):
    """
    Every tender source client inherits from this.
    Forces a consistent interface across all clients.
    """
    SOURCE_NAME: str = ""   # override in each subclass e.g. "austender"
    BASE_URL: str = ""      # override in each subclass

    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={"User-Agent": "WarRoom-BidIntelligence/1.0"}
        )

    @abstractmethod
    async def fetch(self) -> List[Dict[str, Any]]:
        """
        Fetch raw tender data from the source.
        Must return a list of raw dicts — normaliser will clean them.
        """
        pass

    async def get(self, url: str, params: dict = None) -> dict:
        """Shared HTTP GET with error handling."""
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"{self.SOURCE_NAME} HTTP error: {e.response.status_code} — {url}")
            return {}
        except httpx.RequestError as e:
            logger.error(f"{self.SOURCE_NAME} connection error: {e}")
            return {}

    async def close(self):
        await self.client.aclose()