# Homelab GitOps Repository

---

## Overview

This repository is the single source of truth for a resilient k3s Kubernetes cluster running on a self-hosted Proxmox server. It demonstrates:

- **Highly-available topology** with three control-plane nodes and three worker nodes.
- **End-to-end GitOps**: all Kubernetes manifests, Helm value overrides, and ArgoCD Application/ApplicationSet CRDs are stored in Git and applied automatically.
- **Modular multi-source deployments**: each ArgoCD Application merges an external Helm chart, custom values, and raw Git manifests into a cohesive release.
- **Automated drift correction**: `syncPolicy.automated` (with `prune` and `selfHeal`) ensures live state matches Git.


---

## Architecture

```text
Developer ──push──▶ Git Repo
             │
             ▼
       GitHub Actions
       (kubectl apply CRDs)
             │
             ▼
    ArgoCD Control Plane
             │
    ┌────────┴────────┐
    │ Chart & Manifests│
    └────────┬────────┘
             ▼
    k3s Cluster: 3 control-plane & 3 worker nodes
```

---

## Folder Structure (Example)

```text
k8s/
├── argo/
│   ├── applications/          # ArgoCD Applications per service
│   │   ├── service1.yaml       # Helm + manifests
│   │   ├── service2.yaml       # Helm + manifests
│   │   └── service3.yaml       # Raw manifests only
│   └── applicationsets/       # ApplicationSet definitions
│       └── service3-set.yaml   # Multi-env (prod, stage)
└── clusters/
    └── k3sa/
        ├── helm-values/         # Helm overrides per service
        │   ├── service1-values.yaml
        │   └── service2-values.yaml
        └── manifests/           # Raw manifests per service
            ├── service1/
            │   └── service1-sa.yaml
            ├── service2/
            │   └── service2-config.yaml
            └── service3/
                ├── prod/
                │   └── service3-deployment.yaml
                └── stage/
                    └── service3-configmap.yaml
```
---

## How It Works

1. **CRD Deployment**  
   - Developers push changes under `k8s/argo/`.  
   - GitHub Actions runs `kubectl apply` to update Application/ApplicationSet CRDs in ArgoCD.

2. **Source Pull & Merge**  
   - ArgoCD detects updated CRDs and for each Application:  
     - Fetches external Helm chart (repo & version).  
     - Loads Helm overrides from `clusters/k3sa/helm-values/<service-values.yaml>`.  
     - Reads raw manifests from `clusters/k3sa/manifests/<service>/`.  
   - Merges chart, values, and manifests into a final manifest set.

3. **Apply & Reconcile**  
   - ArgoCD applies the merged manifests to the k3s cluster.  
   - Automated sync policy prunes stale resources and self-heals drift.  
   - Status (`Synced`/`OutOfSync`, `Healthy`/`Degraded`) visible via CLI/UI.

4. **Updates & Scaling**  
   - Update chart versions or values in Git and push.  
   - ArgoCD rolls out changes automatically.  
   - Add new services or scale nodes by defining new Applications and manifests.

