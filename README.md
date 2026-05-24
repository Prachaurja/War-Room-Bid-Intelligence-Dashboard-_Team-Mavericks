# Bid Intelligence Dashboard

## Overview
This project is a self-hosted, web bid intelligence dashboard developed for Prompcorp.
<br>
It aggregates tender opportunities from Australian public procurement sources including AusTender, Queensland Tenders, and configured Tenders.Net feeds.
<br>
It presents an interactive operational view for tracking tenders, alerts, analytics, reports, profile settings, and customer-facing bid intelligence.

## Features
- **Tender Ingestion Pipeline**: Fetches and normalises records from AusTender, Queensland Tenders, and active Tenders.Net URLs.
- **Interactive Dashboard**: View active, upcoming, and recently closed tender opportunities with live summary metrics.
- **Tender Search, Filter, Sort, and Export**: Search and filter tenders by sector, state/territory, value range, close date, close year, publish year, and data source. Sort by tender name, publish date, close date, value, and agency.
- **Alerts and Saved Searches**: Create, edit, delete, and toggle saved searches with toast feedback.
- **Notification Channels**: Manage alert notification channels, including browser push notification support where the browser permits it.
- **Analytics and Reports**: Review sector, regional, source, status, state, value, and high-value tender summaries with visual charts and PDF export.
- **Settings and Profile**: Manage profile display details, appearance preferences, security options, password settings, API keys, and notification channel preferences.
- **Secure Access**: User registration and login are handled through JWT-based authentication.
- **Container Deployment**: Docker Compose support for frontend, backend, Redis, and optional local PostgreSQL.
- **Kubernetes Deployment**: K8s manifests for frontend, backend, Redis, PostgreSQL, and Ingress, with notes for both standard Kubernetes and MicroK8s.

## Tech Stack
- **Frontend**: React, TypeScript, Vite, TanStack Query, Framer Motion, Recharts
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

Clone the project and enter the repository:

```bash
git clone https://github.com/Prachaurja/War-Room-Bid-Intelligence-Dashboard-_Team-Mavericks
cd War-Room-Bid-Intelligence-Dashboard-_Team-Mavericks
```

Create `.env` in `/backend` before starting the backend. The backend reads this file through Pydantic settings, and it is required for database and JWT configuration.

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

Prerequisites:

- Git
- Docker Desktop or Docker Engine with Docker Compose
- PostgreSQL, unless you use the included local database override

Create the Docker Compose environment file:

```bash
cp deploy/.env.example deploy/.env
```

Edit `deploy/.env` before starting the containers. At minimum, replace `SECRET_KEY` and set the database connection strings for your environment:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@host.docker.internal:5432/bid_dashboard
SYNC_DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/bid_dashboard
SECRET_KEY=replace-me-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

Start frontend, backend, and Redis with an external PostgreSQL database:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up --build
```

Run database migrations:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml exec backend alembic upgrade head
```

Run a full local Docker stack with PostgreSQL, Redis, backend, and frontend:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml -f deploy/docker-compose.local-db.yml up --build
docker compose --env-file deploy/.env -f deploy/docker-compose.yml -f deploy/docker-compose.local-db.yml exec backend alembic upgrade head
```

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8000/health`

Useful Docker commands:

```bash
docker compose -f deploy/docker-compose.yml logs -f
docker compose -f deploy/docker-compose.yml down
docker compose -f deploy/docker-compose.yml down -v
```

`down -v` removes volumes, so use it only when you intentionally want to delete Redis/PostgreSQL container data.

Frontend container builds use same-origin API and WebSocket URLs by default, so browser requests go through the nginx proxy instead of directly calling `localhost:8000`.
Do not set `VITE_API_URL` or `VITE_WS_URL` for Docker unless you intentionally want the browser to bypass nginx.

### Run on Kubernetes

Kubernetes manifests are stored under `deploy/k8s`.

The manifests deploy:

- PostgreSQL with a persistent volume claim
- Redis
- FastAPI backend
- Frontend nginx container
- Ingress

Create the secret file:

```bash
cp deploy/k8s/secret.example.yaml deploy/k8s/secret.yaml
```

Edit `deploy/k8s/secret.yaml`:

```yaml
stringData:
  DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/bid_dashboard
  SYNC_DATABASE_URL: postgresql://postgres:postgres@postgres:5432/bid_dashboard
  POSTGRES_PASSWORD: postgres
  SECRET_KEY: replace-me-with-a-long-random-secret
```

Do not commit `deploy/k8s/secret.yaml`.

The default Kubernetes manifests use these Docker Hub images:

```text
1030283726/bid-dashboard-backend:main
1030283726/bid-dashboard-frontend:main
```

If you want to use your own images, build and push images to a registry your cluster can pull from:

```bash
docker build -f deploy/docker/backend.Dockerfile -t your-dockerhub-user/bid-dashboard-backend:main .
docker build -f deploy/docker/frontend.Dockerfile -t your-dockerhub-user/bid-dashboard-frontend:main .
docker push your-dockerhub-user/bid-dashboard-backend:main
docker push your-dockerhub-user/bid-dashboard-frontend:main
```

Then update image names in:

- `deploy/k8s/backend.yaml`
- `deploy/k8s/frontend.yaml`

Then deploy:

```bash
kubectl apply -k deploy/k8s
kubectl -n bid-dashboard get pods
kubectl -n bid-dashboard get svc
kubectl -n bid-dashboard get ingress
kubectl -n bid-dashboard exec deploy/backend -- alembic upgrade head
```

If Ingress is not configured yet, test with port-forward:

```bash
kubectl -n bid-dashboard port-forward svc/frontend 8080:80
```

Open:

```text
http://localhost:8080
```

### Run on MicroK8s

MicroK8s can use the same `deploy/k8s` manifests. The default image names point at Docker Hub:

```text
1030283726/bid-dashboard-backend:main
1030283726/bid-dashboard-frontend:main
```

Enable required addons:

```bash
microk8s enable dns registry ingress storage
```

If you want to use the MicroK8s local registry instead of Docker Hub, build and push images:

```bash
docker build -f deploy/docker/backend.Dockerfile -t localhost:32000/bid-dashboard-backend:main .
docker build -f deploy/docker/frontend.Dockerfile -t localhost:32000/bid-dashboard-frontend:main .
docker push localhost:32000/bid-dashboard-backend:main
docker push localhost:32000/bid-dashboard-frontend:main
```

Then update `deploy/k8s/backend.yaml` and `deploy/k8s/frontend.yaml` to use the `localhost:32000/...` images.

Deploy:

```bash
microk8s kubectl apply -k deploy/k8s
microk8s kubectl -n bid-dashboard get pods
microk8s kubectl -n bid-dashboard exec deploy/backend -- alembic upgrade head
```

Add a local hosts entry:

```text
127.0.0.1 bid-dashboard.local
```

Open:

```text
http://bid-dashboard.local
```

For more deployment detail, see:

- `deploy/README.md`
- `deploy/k8s/README.md`

## Acknowledgments & Licenses
This project is built upon the open-source foundations of:
- [Sovereign_watch](https://github.com/d3mocide/Sovereign_Watch)
- [worldmonitor](https://github.com/koala73/worldmonitor)
