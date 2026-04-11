from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.ingestion.scheduler import start_scheduler, stop_scheduler
from app.routers.tenders_router import router as tenders_router
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Prompcorp's War Room - Bid Intelligence Dashboard",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # allows ALL origins during development
    allow_credentials=False,      # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tenders_router)

@app.on_event("startup")
async def startup():
    start_scheduler()

@app.on_event("shutdown")
async def shutdown():
    stop_scheduler()

@app.get("/health")
async def health():
    return {"status": "ok"}