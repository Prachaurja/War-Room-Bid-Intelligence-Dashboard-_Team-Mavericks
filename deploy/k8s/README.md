# MicroK8s Deployment

These manifests target MicroK8s with the built-in registry and ingress addons.

## 1. Enable MicroK8s addons

```bash
microk8s enable dns registry ingress
```

The local registry is usually exposed at `localhost:32000`.

## 2. Build and push images

From the repository root:

```bash
docker build -f deploy/docker/backend.Dockerfile -t localhost:32000/bid-dashboard-backend:dev .
docker build -f deploy/docker/frontend.Dockerfile -t localhost:32000/bid-dashboard-frontend:dev .

docker push localhost:32000/bid-dashboard-backend:dev
docker push localhost:32000/bid-dashboard-frontend:dev
```

## 3. Create secrets

Copy the example and replace values:

```bash
cp deploy/k8s/secret.example.yaml deploy/k8s/secret.yaml
```

Do not commit `deploy/k8s/secret.yaml`.

## 4. Deploy

```bash
microk8s kubectl apply -k deploy/k8s
microk8s kubectl -n bid-dashboard get pods
```

## 5. Access locally

Add a hosts entry pointing `bid-dashboard.local` to the MicroK8s node IP. For a single local node, this is often `127.0.0.1`.

```text
127.0.0.1 bid-dashboard.local
```

Open:

```text
http://bid-dashboard.local
```

## Migrations

Run Alembic after the backend is deployed and database connectivity is configured:

```bash
microk8s kubectl -n bid-dashboard exec deploy/backend -- alembic upgrade head
```

## Design Notes

- Frontend is served by nginx and proxies backend routes to the `backend` service.
- Browser-facing API calls use same-origin URLs, which works better behind Ingress.
- WebSocket `/ws/live` is proxied through the frontend nginx container; ingress timeout annotations are included.
- Redis runs in-cluster.
- Postgres is intentionally not included by default. Use an external managed Postgres/Supabase URL in `secret.yaml`, or add a StatefulSet later if the project must be fully self-contained.
