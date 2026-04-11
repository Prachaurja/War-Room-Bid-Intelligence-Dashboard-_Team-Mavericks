from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.ingestion.scheduler import start_scheduler, stop_scheduler
from app.routers.tenders_router import router as tenders_router
from app.routers.auth_router import router as auth_router
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Prompcorp's War Room — Bid Intelligence Dashboard",
    description="Aggregates Australian Government Tender Data for Prompcorp",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(tenders_router)

@app.on_event("startup")
async def startup():
    start_scheduler()

@app.on_event("shutdown")
async def shutdown():
    stop_scheduler()

@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.2.0"}