# Bid Intelligence Dashboard

## Overview
This project is a self-hosted, web bid intelligence dashboard developed for Prompcorp.
<br>
It aggregates tender opportunities from Australian public procurement sources including AusTender, Queensland Tenders, and configured Tenders.Net feeds.
<br>It presents an interactive operational view for tracking tenders, alerts, analytics, reports, and customer-facing bid intelligence.


## Features
- **Tender Ingestion Pipeline**: Fetches and normalises records from AusTender, Queensland Tenders, and active Tenders.Net URLs.
- **Interactive Dashboard**: View active, upcoming, and recently closed tender opportunities with live summary metrics.
- **Advanced Filtering and Search**: Filter tenders by sector, state/territory, value range, close date, close year, publish year, and data source.
- **Alerts and Saved Searches**: Create saved searches and receive matched tender alerts from newly ingested data.
- **Analytics and Reports**: Review sector, regional, source, and high-value tender summaries, with CSV exports.
- **Secure Access**: User registration and login are handled through JWT-based authentication.
- **Container Deployment**: Docker Compose support for local validation and MicroK8s manifests for Kubernetes deployment.

## Tech Stack
- **Frontend**: React, TypeScript, Vite, TanStack Query, Framer Motion
- **Backend**: Python, FastAPI, SQLAlchemy, Alembic
- **Database & Caching**: PostgreSQL, Redis
- **Realtime**: WebSocket updates for live tender and alert activity
- **Deployment**: Docker, Docker Compose, Kubernetes, MicroK8s

## Architecture
```mermaid
graph TD
  extData[External Data]
  intData[Internal Data]
  
  extData --> ingestion
  intData --> ingestion
  
  ingestion[Data Ingestion Layer<br/>Python Clients and Scheduler]
  
  ingestion --> storage
  
  storage[Storage and Caching Layer<br/>PostgreSQL and Redis]
  
  storage --> backend
  
  backend[Backend API<br/>FastAPI + JWT Auth]
  
  backend -->|REST API and WebSocket| frontend
  
  frontend[Frontend UI<br/>React + TypeScript]
  
  frontend --> users[Decision Makers]
  
  users -.->|Feedback| storage
```

## Getting Started

### Run Locally

Create `backend/.env` before starting the backend. The backend reads this file through Pydantic settings, and it is required for database and JWT configuration.

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/bid_dashboard
SYNC_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bid_dashboard
SECRET_KEY=replace-me-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
REDIS_URL=redis://localhost:6379/0
```

Backend setup:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

Frontend setup:

```bash
cd frontend
npm install
npm run dev
```

Local frontend development can use `frontend/.env` to point Vite at the backend:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/live
```

### Run with Docker Compose

```bash
# optional: copy backend environment defaults
cp deploy/.env.example deploy/.env

# start frontend, backend, and redis
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up --build

# view logs
docker compose -f deploy/docker-compose.yml logs -f
```

Frontend: `http://localhost:5173`
Backend health: `http://localhost:8000/health`

By default, Docker Compose expects PostgreSQL to be reachable from the host using the connection strings in `deploy/.env`.
For a fully local PostgreSQL container, use the optional local-db override:

```bash
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.local-db.yml up --build
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.local-db.yml exec backend alembic upgrade head
```

Frontend container builds use same-origin API and WebSocket URLs by default, so browser requests go through the nginx proxy instead of directly calling `localhost:8000`.
Do not set `VITE_API_URL` or `VITE_WS_URL` for Docker unless you intentionally want the browser to bypass nginx.

### Run on MicroK8s

Kubernetes manifests for MicroK8s are stored under `deploy/k8s`.

```bash
microk8s enable dns registry ingress
docker build -f deploy/docker/backend.Dockerfile -t localhost:32000/bid-dashboard-backend:dev .
docker build -f deploy/docker/frontend.Dockerfile -t localhost:32000/bid-dashboard-frontend:dev .
docker push localhost:32000/bid-dashboard-backend:dev
docker push localhost:32000/bid-dashboard-frontend:dev
```

Before applying manifests, copy `deploy/k8s/secret.example.yaml` to `deploy/k8s/secret.yaml` and replace the placeholder values. See `deploy/k8s/README.md` for the full MicroK8s workflow.

## Acknowledgments & Licenses
This project is built upon the open-source foundations of:
- [Sovereign_watch](https://github.com/d3mocide/Sovereign_Watch)
- [worldmonitor](https://github.com/koala73/worldmonitor)
