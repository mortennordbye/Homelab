# Talos Kubernetes Cluster

## Deploy

```bash
export TF_VAR_proxmox_ssh_password='Password'
terraform init
terraform apply
```

## Upgrade

**Important:** Upgrade Talos first, then Kubernetes. Two applies required: enable flags → apply → disable flags → apply.

**Step 1: Talos Upgrade**

Edit `terraform.tfvars`:

```hcl
talos_version = "v1.11.6"

enable_talos_upgrade = true
```

```bash
terraform apply
```

Wait for completion. Upgrades sequentially: ctrl-1 → ctrl-2 → ctrl-3 → worker-1 → worker-2 → worker-3

**Step 2: Disable Talos Upgrade Flag**

Edit `terraform.tfvars`:

```hcl
enable_talos_upgrade = false
```

```bash
terraform apply
```

**Step 3: Kubernetes Upgrade**

Edit `terraform.tfvars`:

```hcl
kubernetes_version = "v1.34.2"

enable_kubernetes_upgrade = true
```

```bash
terraform apply
```

**Step 4: Disable Kubernetes Upgrade Flag**

Edit `terraform.tfvars`:

```hcl
enable_kubernetes_upgrade = false
```

```bash
terraform apply
```

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

## Certificate Renewal

Client certificates in talosconfig and kubeconfig expire after 1 year. Renew before expiration. Server certificates rotate automatically on node reboot/upgrade.

**Check expiration:**

```bash
# Talosconfig
grep "crt:" ./talosconfig | head -1 | awk '{print $2}' | base64 -d | openssl x509 -noout -enddate

# Kubeconfig
grep "client-certificate-data:" ./kubeconfig | awk '{print $2}' | base64 -d | openssl x509 -noout -enddate
```

**Renew talosconfig (before expiration):**

```bash
# Get config from Terraform state
terraform output -raw talosconfig > talosconfig

# Generate new config from controlplane
talosctl --talosconfig=./talosconfig -n 10.3.10.30 config new talosconfig-new --roles os:admin --crt-ttl 8760h
```

**Renew kubeconfig (before expiration):**

```bash
talosctl --talosconfig=./talosconfig kubeconfig ./kubeconfig --nodes 10.3.10.30 --force
```

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
