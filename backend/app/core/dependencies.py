from app.core.database import AsyncSessionLocal


async def get_db():
    """
    FastAPI dependency — provides an async DB session per request.
    Session is automatically closed when the request finishes.
    """
    async with AsyncSessionLocal() as session:
        yield session