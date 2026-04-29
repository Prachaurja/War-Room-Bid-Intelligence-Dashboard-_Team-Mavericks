# Deploy Guide

This project can run as containers for local validation and as Kubernetes workloads for MicroK8s.

## Docker Compose

Default mode reads backend database/auth settings from your shell environment and starts Redis locally.
For convenience, copy `deploy/backend.env.example` and pass it with `--env-file`:

```bash
cp deploy/backend.env.example deploy/backend.env
docker compose --env-file deploy/backend.env -f deploy/docker-compose.yml up --build
```

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8000/health`

Optional local Postgres:

```bash
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.local-db.yml up --build
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.local-db.yml exec backend alembic upgrade head
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
