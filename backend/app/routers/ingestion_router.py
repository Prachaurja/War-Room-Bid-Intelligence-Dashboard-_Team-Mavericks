"""
Ingestion router — source-aware file uploads and job history.

POST /ingestion/upload          — upload Excel/CSV with a source_key
POST /ingestion/jobs/{id}/delete — password-gated delete (job + its tenders only)
GET  /ingestion/sources         — list all supported source portals
GET  /ingestion/jobs            — list all ingestion jobs
GET  /ingestion/jobs/{id}       — get single job details
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from app.core.dependencies import get_db
from app.core.security import get_current_user, verify_password
from app.core.cache import invalidate_stats_cache
from app.models.ingestion_job import IngestionJob
from app.models.tender import Tender
from app.ingestion.file_ingestor import parse_file
from app.ingestion.deduplicator import bulk_upsert
from app.ingestion.source_config import list_sources, get_source, SOURCES
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingestion", tags=["ingestion"])

ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".xlsm", ".csv"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


# ── Schemas ───────────────────────────────────────────────────────────────────
class JobResponse(BaseModel):
    id:           int
    job_name:     str
    source_name:  str
    file_name:    Optional[str]
    status:       str
    total_rows:   Optional[int]
    inserted:     Optional[int]
    updated:      Optional[int]
    skipped:      Optional[int]
    error_msg:    Optional[str]
    created_at:   datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class SourceResponse(BaseModel):
    key:   str
    label: str
    scope: str


class DeleteRequest(BaseModel):
    password: str   # current user's password — verified before deletion


# ── GET /ingestion/sources ────────────────────────────────────────────────────
@router.get("/sources", response_model=List[SourceResponse])
async def get_sources():
    """Return all supported tender source portals for the frontend dropdown."""
    return list_sources()


# ── POST /ingestion/upload ────────────────────────────────────────────────────
@router.post("/upload", response_model=JobResponse, status_code=201)
async def upload_file(
    file:        UploadFile = File(...),
    source_key:  str = Form(...),
    custom_name: str = Form(""),
    db:          AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Upload an Excel or CSV file for a specific tender portal."""
    src_config = get_source(source_key)
    if src_config is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown source '{source_key}'. Valid keys: {list(SOURCES.keys())}"
        )

    if source_key == "others" and not custom_name.strip():
        raise HTTPException(
            status_code=400,
            detail="custom_name is required when source_key is 'others'"
        )

    if source_key == "others":
        display_name = custom_name.strip()
        import re
        source_name = re.sub(r'[^a-z0-9]+', '_', display_name.lower()).strip('_')[:80] or "custom"
    else:
        display_name = src_config["label"]
        source_name  = source_key

    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large — max 10MB")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    # Create job record
    job = IngestionJob(
        job_name    = display_name,
        source_name = source_name,
        file_name   = filename,
        status      = "processing",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    logger.info(f"Ingestion job #{job.id} started: source={source_key}, file={filename}")

    # Parse file
    try:
        records, warnings = parse_file(
            content, filename, source_name, display_name,
            source_key=source_key,
        )
    except ValueError as e:
        job.status       = "failed"
        job.error_msg    = str(e)
        job.completed_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(job)
        logger.error(f"Ingestion job #{job.id} parse failed: {e}")
        return job

    if not records:
        job.status       = "failed"
        job.error_msg    = "No valid records found in file"
        job.completed_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(job)
        return job

    # Stamp every record with this job's ID so we can delete precisely later
    for r in records:
        r["job_id"] = job.id

    # Upsert into tenders table
    try:
        summary = await bulk_upsert(db, records)
        job.status       = "complete"
        job.total_rows   = len(records)
        job.inserted     = summary.get("inserted", 0)
        job.updated      = summary.get("updated", 0)
        job.skipped      = summary.get("skipped", 0)
        job.completed_at = datetime.now(timezone.utc)
        if warnings:
            job.error_msg = "; ".join(warnings[:5])
        await db.commit()
        await db.refresh(job)
        logger.info(
            f"Ingestion job #{job.id} complete: "
            f"{job.inserted} inserted, {job.updated} updated, {job.skipped} skipped"
        )
    except Exception as e:
        job.status       = "failed"
        job.error_msg    = f"Database error: {str(e)[:200]}"
        job.completed_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(job)
        logger.error(f"Ingestion job #{job.id} DB error: {e}", exc_info=True)
        return job

    try:
        await invalidate_stats_cache()
    except Exception:
        pass

    return job


# ── GET /ingestion/jobs ───────────────────────────────────────────────────────
@router.get("/jobs", response_model=List[JobResponse])
async def list_jobs(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(IngestionJob).order_by(IngestionJob.created_at.desc())
    )
    return result.scalars().all()


# ── GET /ingestion/jobs/{job_id} ──────────────────────────────────────────────
@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(IngestionJob).where(IngestionJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# ── POST /ingestion/jobs/{job_id}/delete ─────────────────────────────────────
@router.post("/jobs/{job_id}/delete", status_code=200)
async def delete_job(
    job_id: int,
    body:   DeleteRequest,
    db:     AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Password-gated delete.
    Deletes ONLY the tenders created by this specific job (matched by job_id),
    not all tenders from the same source. Then deletes the job record itself.
    """
    # ── 1. Verify password ────────────────────────────────────────────────
    # Use 403 NOT 401 — 401 triggers the apiClient interceptor which logs the user out
    if not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(
            status_code=403,
            detail="Incorrect password. Deletion cancelled."
        )

    # ── 2. Find job ───────────────────────────────────────────────────────
    result = await db.execute(
        select(IngestionJob).where(IngestionJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # ── 3. Delete only THIS job's tenders by job_id ──────────────────────
    # Precise — only removes tenders stamped with this specific job_id.
    # Pre-migration tenders (job_id = NULL) are left alone intentionally;
    # the old source_name fallback was removed because it incorrectly
    # deleted ALL tenders from the same portal (e.g. both WA uploads).
    delete_result = await db.execute(
        delete(Tender).where(Tender.job_id == job_id)
    )
    tenders_deleted = delete_result.rowcount

    # ── 4. Delete the job record ──────────────────────────────────────────
    await db.delete(job)
    await db.commit()

    try:
        await invalidate_stats_cache()
    except Exception:
        pass

    logger.info(
        f"Job #{job_id} ({job.job_name}) deleted by {current_user.email} — "
        f"{tenders_deleted} tenders removed"
    )

    return {
        "deleted":          True,
        "job_id":           job_id,
        "tenders_removed":  tenders_deleted,
    }