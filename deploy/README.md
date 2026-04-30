# Deploy Guide

This project can run as containers for local validation and as Kubernetes workloads for MicroK8s.

## Docker Compose

These commands must be run from the repository root, not from inside the `deploy` folder.

Prerequisites:

- Git
- Docker Desktop or Docker Engine with Docker Compose
- PostgreSQL, unless you use the local database override below

Clone the project and enter the repository:

```bash
git clone <repository-url>
cd War-Room-Bid-Intelligence-Dashboard-_Team-Mavericks
```

Create an environment file for Docker Compose:

```bash
cp deploy/.env.example deploy/.env
```

Edit `deploy/.env` before starting the containers. Replace `SECRET_KEY` and set the database connection strings for your environment:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@host.docker.internal:5432/bid_dashboard
SYNC_DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/bid_dashboard
SECRET_KEY=replace-me-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

Start frontend, backend, and Redis:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up --build
```

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8000/health`

Run migrations after the backend is running:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml exec backend alembic upgrade head
```

Optional local Postgres:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml -f deploy/docker-compose.local-db.yml up --build
docker compose --env-file deploy/.env -f deploy/docker-compose.yml -f deploy/docker-compose.local-db.yml exec backend alembic upgrade head
```

Useful commands:

```bash
docker compose -f deploy/docker-compose.yml logs -f backend
docker compose -f deploy/docker-compose.yml logs -f frontend
docker compose -f deploy/docker-compose.yml down
docker compose -f deploy/docker-compose.yml down -v
```

`down -v` removes volumes, so use it only when you want to delete Redis/Postgres container data.

## MicroK8s

See `deploy/k8s/README.md`.

## Notes

- Do not copy real `.env` values into Dockerfiles. They are injected at runtime through compose or Kubernetes secrets.
- Frontend uses same-origin API/WebSocket URLs by default, which works behind nginx and MicroK8s Ingress.
- Do not set `VITE_API_URL` or `VITE_WS_URL` for the Docker frontend unless you intentionally want the browser to bypass nginx.
