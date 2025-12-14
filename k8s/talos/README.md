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
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Port forward to access UI
kubectl port-forward svc/argo-cd-argocd-server -n argocd 8080:443
# Open https://localhost:8080
# Username: admin
# Password: (from command above)
```

## Adding New Applications

### Infrastructure App

1. Create folder under `infra/`:

   ```bash
   mkdir -p k8s/talos/infra/my-app
   ```

2. Add `kustomization.yaml`:

   ```yaml
   apiVersion: kustomize.config.k8s.io/v1beta1
   kind: Kustomization

   namespace: my-app

   resources:
     - namespace.yaml

   helmCharts:
     - name: my-chart
       repo: https://charts.example.com
       version: 1.0.0
       releaseName: my-app
       namespace: my-app
       valuesFile: ./values.yaml
   ```

3. Commit and push - ArgoCD auto-discovers it!

### User App

Same process, but create under `apps/` instead of `infra/`.

## Application Pattern

Each app follows this structure:

```
app-name/
├── kustomization.yaml       # Required - Kustomize entry point
├── values.yaml              # For Helm charts
├── namespace.yaml           # Namespace definition
└── (additional resources)   # Custom configs, secrets, etc.
```

### Helm Chart Example

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: my-app

resources:
  - namespace.yaml

helmCharts:
  - name: my-chart
    repo: https://charts.example.com
    version: 1.0.0
    releaseName: my-app
    namespace: my-app
    valuesFile: ./values.yaml
```

### Raw Manifests Example

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: my-app

resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - ingress.yaml
```

## Notes

- **ArgoCD bootstrap**: `infra/argocd/` is applied manually first, then manages itself and everything else
- **ApplicationSets**: Auto-discover apps using Git directory generator
- **Flat structure**: All apps at same level for simplicity
- **Method agnostic**: Use Helm, Kustomize, or raw manifests per app
- **GitOps**: All changes via Git commits

## Useful Commands

```bash
# List all ArgoCD applications
kubectl get applications -n argocd

# Sync an app manually
kubectl patch application <app-name> -n argocd \
  --type merge -p '{"spec":{"syncPolicy":{"syncOptions":["Prune=true"]}}}'

# Delete an app (and all resources)
kubectl delete application <app-name> -n argocd

# View app status
kubectl get application <app-name> -n argocd -o yaml
```

## Migration from k3sa

To migrate an app from k3sa to talos:

1. Copy the app folder from `k8s/k3sa/infra/` or `k8s/k3sa/apps/`
2. Place in corresponding `k8s/talos/infra/` or `k8s/talos/apps/`
3. Update any cluster-specific configs (domain names, storage classes, etc.)
4. Commit and push
5. ArgoCD automatically deploys it!
