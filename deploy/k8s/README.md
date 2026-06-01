# Kubernetes Deployment

These manifests deploy the application as Kubernetes workloads:

- Frontend nginx service
- FastAPI backend service
- Redis service
- PostgreSQL service with a persistent volume claim
- Ingress route for browser access

Run all commands from the repository root.

## Shared setup

Create the Kubernetes secret file:

```bash
cp deploy/k8s/secret.example.yaml deploy/k8s/secret.yaml
```

Edit `deploy/k8s/secret.yaml` before deploying:

```yaml
stringData:
  DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/bid_dashboard
  SYNC_DATABASE_URL: postgresql://postgres:postgres@postgres:5432/bid_dashboard
  POSTGRES_PASSWORD: postgres
  SECRET_KEY: replace-me-with-a-long-random-secret
```

Do not commit `deploy/k8s/secret.yaml`.

## Deploy on a standard Kubernetes cluster

The default manifests use these Docker Hub images:

```text
1030283726/bid-dashboard-backend:main
1030283726/bid-dashboard-frontend:main
```

If you want to deploy those existing images, apply the manifests directly after creating `deploy/k8s/secret.yaml`.

If you want to build and publish your own images instead, use a real image registry that your cluster can pull from, such as Docker Hub, GHCR, ECR, ACR, or GCR.

Build and push images:

```bash
docker build -f deploy/docker/backend.Dockerfile -t your-dockerhub-user/bid-dashboard-backend:main .
docker build -f deploy/docker/frontend.Dockerfile -t your-dockerhub-user/bid-dashboard-frontend:main .

docker push your-dockerhub-user/bid-dashboard-backend:main
docker push your-dockerhub-user/bid-dashboard-frontend:main
```

Update image names in:

- `deploy/k8s/backend.yaml`
- `deploy/k8s/frontend.yaml`

For example:

```yaml
image: your-dockerhub-user/bid-dashboard-backend:main
```

Check your Ingress class. The manifest currently uses:

```yaml
ingressClassName: public
```

If your cluster uses NGINX Ingress, change it to:

```yaml
ingressClassName: nginx
```

Deploy:

```bash
kubectl apply -k deploy/k8s
kubectl -n bid-dashboard get pods
kubectl -n bid-dashboard get svc
kubectl -n bid-dashboard get ingress
```

Run database migrations:

```bash
kubectl -n bid-dashboard exec deploy/backend -- alembic upgrade head
```

If Ingress is not ready yet, test with port-forward:

```bash
kubectl -n bid-dashboard port-forward svc/frontend 8080:80
```

Open:

```text
http://localhost:8080
```

## Deploy on MicroK8s

Enable required addons:

```bash
microk8s enable dns registry ingress storage
```

The default manifests use Docker Hub images, so MicroK8s can deploy them without using the MicroK8s local registry.

If you prefer to build your own local images, MicroK8s local registry is usually exposed at `localhost:32000`.

Build and push images:

```bash
docker build -f deploy/docker/backend.Dockerfile -t localhost:32000/bid-dashboard-backend:main .
docker build -f deploy/docker/frontend.Dockerfile -t localhost:32000/bid-dashboard-frontend:main .

docker push localhost:32000/bid-dashboard-backend:main
docker push localhost:32000/bid-dashboard-frontend:main
```

If using the MicroK8s local registry, update image names in `deploy/k8s/backend.yaml` and `deploy/k8s/frontend.yaml` to:

```yaml
image: localhost:32000/bid-dashboard-backend:main
image: localhost:32000/bid-dashboard-frontend:main
```

Deploy:

```bash
microk8s kubectl apply -k deploy/k8s
microk8s kubectl -n bid-dashboard get pods
```

Run database migrations:

```bash
microk8s kubectl -n bid-dashboard exec deploy/backend -- alembic upgrade head
```

Access through Ingress:

```text
http://bid-dashboard.local
```

For local testing, add a hosts entry:

```text
127.0.0.1 bid-dashboard.local
```

On Windows, the hosts file is:

```text
C:\Windows\System32\drivers\etc\hosts
```

## Useful commands

Check status:

```bash
kubectl -n bid-dashboard get pods
kubectl -n bid-dashboard describe pod <pod-name>
```

View logs:

```bash
kubectl -n bid-dashboard logs deploy/backend -f
kubectl -n bid-dashboard logs deploy/frontend -f
kubectl -n bid-dashboard logs deploy/postgres -f
kubectl -n bid-dashboard logs deploy/redis -f
```

Restart deployments after pushing new images:

```bash
kubectl -n bid-dashboard rollout restart deploy/backend
kubectl -n bid-dashboard rollout restart deploy/frontend
```

Delete the stack:

```bash
kubectl delete -k deploy/k8s
```

Delete the Postgres data volume only if you intentionally want to remove database data:

```bash
kubectl -n bid-dashboard delete pvc postgres-data
```

## Notes

- PostgreSQL is now included for self-contained local or demo Kubernetes deployments.
- For production, a managed external PostgreSQL service is still safer than running a single-replica in-cluster database.
- The included Postgres deployment uses one replica and one `ReadWriteOnce` PVC.
- Frontend uses same-origin API and WebSocket paths behind nginx and Ingress.
