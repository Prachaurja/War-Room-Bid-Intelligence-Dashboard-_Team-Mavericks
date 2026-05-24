# Deploy Guide

This project can run as containers for local validation and as Kubernetes workloads for standard Kubernetes clusters or MicroK8s.

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

Start frontend, backend, and Redis with an external PostgreSQL database:

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

Run a full local Docker stack with Postgres, Redis, backend, and frontend:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml -f deploy/docker-compose.local-db.yml up --build
docker compose --env-file deploy/.env -f deploy/docker-compose.yml -f deploy/docker-compose.local-db.yml exec backend alembic upgrade head
```

When using `deploy/docker-compose.local-db.yml`, the backend connects to the Docker Compose `db` service automatically:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/bid_dashboard
SYNC_DATABASE_URL=postgresql://postgres:postgres@db:5432/bid_dashboard
```

Useful commands:

```bash
docker compose -f deploy/docker-compose.yml logs -f backend
docker compose -f deploy/docker-compose.yml logs -f frontend
docker compose -f deploy/docker-compose.yml down
docker compose -f deploy/docker-compose.yml down -v
```

`down -v` removes volumes, so use it only when you want to delete Redis/Postgres container data.

## Kubernetes

The manifests in `deploy/k8s` deploy:

- PostgreSQL
- Redis
- Backend
- Frontend
- Ingress

For a standard Kubernetes cluster:

```bash
cp deploy/k8s/secret.example.yaml deploy/k8s/secret.yaml
```

Edit `deploy/k8s/secret.yaml`, then apply the manifests. The default Kubernetes manifests use these Docker Hub images:

```text
1030283726/bid-dashboard-backend:main
1030283726/bid-dashboard-frontend:main
```

Deploy:

```bash
kubectl apply -k deploy/k8s
kubectl -n bid-dashboard exec deploy/backend -- alembic upgrade head
```

If you build and push your own images, update image names in `deploy/k8s/backend.yaml` and `deploy/k8s/frontend.yaml` before applying.

For MicroK8s, enable the built-in addons and deploy the same manifests:

```bash
microk8s enable dns registry ingress storage
microk8s kubectl apply -k deploy/k8s
microk8s kubectl -n bid-dashboard exec deploy/backend -- alembic upgrade head
```

If you want MicroK8s to use its local registry instead of Docker Hub, build and push to `localhost:32000`, then update the image names in the Kubernetes manifests.

See `deploy/k8s/README.md` for the full Kubernetes and MicroK8s workflows.

## Notes

- Do not copy real `.env` values into Dockerfiles. They are injected at runtime through compose or Kubernetes secrets.
- Frontend uses same-origin API/WebSocket URLs by default, which works behind nginx and Kubernetes Ingress.
- Do not set `VITE_API_URL` or `VITE_WS_URL` for the Docker frontend unless you intentionally want the browser to bypass nginx.
