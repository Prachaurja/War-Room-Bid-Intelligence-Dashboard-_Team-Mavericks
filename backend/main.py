from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.ingestion.scheduler import start_scheduler, stop_scheduler
from app.routers.tenders_router import router as tenders_router
from app.routers.auth_router import router as auth_router
from app.routers.analytics_router import router as analytics_router
from app.routers.alerts_router import router as alerts_router
from app.routers.reports_router import router as reports_router
from app.routers.ws_router import router as ws_router
from app.routers.tenders_net_router import router as tendersnet_router
from app.routers.ingestion_router import router as ingestion_router
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Prompcorp's War Room — Bid Intelligence Dashboard",
    description="Aggregates Australian Government Tender Data for Prompcorp",
    version="0.6.0",
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(tenders_router)
app.include_router(analytics_router)
app.include_router(alerts_router)
app.include_router(reports_router)
app.include_router(ws_router)
app.include_router(tendersnet_router)
app.include_router(ingestion_router)

# ── Lifecycle ─────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    start_scheduler()

@app.on_event("shutdown")
async def shutdown():
    stop_scheduler()

# ── Health ────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.6.0"}