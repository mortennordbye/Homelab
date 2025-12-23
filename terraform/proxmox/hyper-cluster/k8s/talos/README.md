# Talos Kubernetes Cluster

## Deploy

```bash
terraform init
terraform apply
```

## Upgrade

Edit `terraform.tfvars`:

```hcl
talos_version      = "v1.11.6"
kubernetes_version = "v1.34.2"

enable_talos_upgrade      = true
enable_kubernetes_upgrade = true
```

```bash
terraform apply
```

Talos upgrades: ctrl-1 → ctrl-2 → ctrl-3 → worker-1 → worker-2 → worker-3

**Version sources:**

- Talos: https://github.com/siderolabs/talos/releases
- Kubernetes: https://kubernetes.io/releases/

## Update Apps

Edit values:

- `k8s/talos/infra/cilium/values.yaml`
- `k8s/talos/infra/argocd/values.yaml`

ArgoCD syncs automatically.

## Migrate VM to New Node

Edit `terraform.tfvars` and change `proxmox_node`:

```hcl
nodes = {
  "talos-ctrl-01" = {
    proxmox_node = "hyper2"  # Changed from hyper1
    # ... rest unchanged
  }
}
```

```bash
terraform apply
```

Terraform will live migrate the VM to the new node. No downtime if shared storage is used.

## Access

```bash
# Talos
terraform output -raw talosconfig > talosconfig
export TALOSCONFIG=./talosconfig
talosctl --endpoints 10.3.10.30 health

# Kubernetes
export KUBECONFIG=./kubeconfig
kubectl get nodes

# ArgoCD: https://10.3.10.100 (admin)
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```
