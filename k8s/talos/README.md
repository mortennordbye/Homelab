# Talos Kubernetes Cluster

GitOps-managed Kubernetes cluster running on Talos Linux.

## Structure

```
k8s/talos/
├── infra/                   # Infrastructure applications
│   ├── argocd/              # ArgoCD (bootstrap this first!)
│   │   ├── kustomization.yaml
│   │   ├── values.yaml
│   │   ├── namespace.yaml
│   │   ├── project-homelab.yaml
│   │   ├── infra.yaml       # Infrastructure ApplicationSet
│   │   └── apps.yaml        # Applications ApplicationSet
│   ├── cert-manager/
│   ├── external-secrets/
│   ├── sealed-secrets/
│   ├── reflector/
│   ├── cilium/
│   ├── metrics-server/
│   ├── metallb/
│   ├── traefik/
│   ├── external-dns/
│   ├── proxmox-csi/
│   ├── nfs-provisioner/
│   ├── longhorn/
│   ├── kyverno/
│   ├── falco/
│   ├── prometheus-stack/
│   ├── loki/
│   └── grafana/
│
└── apps/                    # User applications
    ├── plex/
    ├── jellyfin/
    ├── audiobookshelf/
    ├── sonarr/
    ├── radarr/
    ├── prowlarr/
    ├── homarr/
    ├── it-tools/
    ├── omni-tools/
    ├── portfolio/
    └── portfolio-stage/
```

## Bootstrap Process

### 1. Install ArgoCD (Manual Bootstrap)

Since kustomize has Helm compatibility issues, bootstrap ArgoCD with Helm directly:

```bash
# Create namespace
kubectl apply -f k8s/talos/infra/argocd/namespace.yaml

# Add Helm repo
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

# Install ArgoCD
helm install argo-cd argo/argo-cd \
  --namespace argocd \
  --version 9.1.7 \
  --values k8s/talos/infra/argocd/values.yaml

# Apply projects
kubectl apply -f k8s/talos/infra/argocd/project-homelab.yaml

# Wait for ArgoCD to be ready
kubectl wait --for=condition=available --timeout=300s \
  deployment/argo-cd-argocd-server -n argocd
```

### 2. Deploy ApplicationSets

```bash
# Apply ApplicationSets to auto-discover all apps (including ArgoCD itself)
kubectl apply -f k8s/talos/infra/argocd/infra.yaml
kubectl apply -f k8s/talos/infra/argocd/apps.yaml
```

> **Note:** ArgoCD is bootstrapped manually first, then manages itself via the infrastructure ApplicationSet. Any changes to `infra/argocd/` will be auto-synced by ArgoCD.

### 3. Access ArgoCD UI

```bash
# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward to access UI
kubectl port-forward svc/argo-cd-argocd-server -n argocd 8080:443
# Open https://localhost:8080
# Username: admin
# Password: (from command above)
```