# Talos Kubernetes Cluster

## Getting Started

### Deploy

```bash
export TF_VAR_proxmox_ssh_password='Password'
terraform init
terraform apply
```

### Access

```bash
# Talos
terraform output -raw talosconfig > talosconfig
export TALOSCONFIG=./talosconfig
talosctl --endpoints 10.3.10.30 --nodes 10.3.10.30 health

# Kubernetes
export KUBECONFIG=./kubeconfig
kubectl get nodes

# ArgoCD (username: admin)
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

## Cluster Operations

### Scale Up (Add Nodes)

Add node to `terraform.tfvars`:

```hcl
nodes = {
  # ... existing nodes ...
  "talos-worker-04" = {
    proxmox_node = "hyper1"
    ip           = "10.3.10.37"
    mac_address  = "BC:24:11:2E:C8:06"
    vmid         = 806
    cpu_cores    = 4
    memory_mb    = 6144
    disk_size_gb = 40
    datastore    = "local-lvm"
    node_type    = "worker"
  }
}
```

```bash
terraform apply
```

Node automatically joins the cluster.

### Scale Down (Remove Nodes)

```bash
# Drain workloads
kubectl drain talos-worker-04 --ignore-daemonsets --delete-emptydir-data

# Delete from Kubernetes
kubectl delete node talos-worker-04
```

Remove node from `terraform.tfvars`, then:

```bash
terraform apply
```

### Migrate VM to Different Node

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

## Resource Management

### Resize Disk

Edit `disk_size_gb` in `terraform.tfvars` (increase only):

```bash
terraform apply
```

Talos automatically detects and uses the expanded disk space.

### Change CPU or Memory

Edit `cpu_cores` or `memory_mb` in `terraform.tfvars`:

```bash
terraform apply
```

**Note:** CPU changes apply immediately. Memory changes require node reboot:

```bash
# Drain workloads
kubectl drain talos-worker-01 --ignore-daemonsets --delete-emptydir-data

# Reboot node
talosctl --endpoints 10.3.10.34 --nodes 10.3.10.34 reboot

# Wait for node to be ready, then uncordon
kubectl uncordon talos-worker-01
```

## Upgrades

### Talos Upgrade

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

### Kubernetes Upgrade

**Step 1: Kubernetes Upgrade**

Edit `terraform.tfvars`:

```hcl
kubernetes_version = "v1.34.2"

enable_kubernetes_upgrade = true
```

```bash
terraform apply
```

**Step 2: Disable Kubernetes Upgrade Flag**

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

## Certificate Management

### Check Expiration

Client certificates in talosconfig and kubeconfig expire after 1 year. Server certificates rotate automatically on node reboot/upgrade.

```bash
# Talosconfig
grep "crt:" ./talosconfig | head -1 | awk '{print $2}' | base64 -d | openssl x509 -noout -enddate

# Kubeconfig
grep "client-certificate-data:" ./kubeconfig | awk '{print $2}' | base64 -d | openssl x509 -noout -enddate
```

### Renew Certificates (Before Expiration)

**Renew talosconfig:**

```bash
# Get config from Terraform state
terraform output -raw talosconfig > talosconfig

# Generate new config from controlplane
talosctl --talosconfig=./talosconfig -n 10.3.10.30 config new talosconfig-new --roles os:admin --crt-ttl 8760h
```

**Renew kubeconfig:**

```bash
talosctl --talosconfig=./talosconfig --endpoints 10.3.10.30 kubeconfig ./kubeconfig --nodes 10.3.10.30 --force
```

### Certificate Recovery (After Expiration)

If certificates expire, recreate them using the secrets stored in Terraform state.

```bash
# Convert Terraform secrets to talosctl format
./convert-secrets.sh > machine-secrets.yaml

# Generate new configs with existing secrets
talosctl gen config --with-secrets machine-secrets.yaml hyper-cluster https://10.3.10.30:6443 --force

# Test access
export TALOSCONFIG=./talosconfig
talosctl --endpoints 10.3.10.30 --nodes 10.3.10.30 health

# Generate kubeconfig
talosctl --endpoints 10.3.10.30 kubeconfig ./kubeconfig --nodes 10.3.10.30 --force

# Clean up temporary files
rm -f machine-secrets.yaml controlplane.yaml worker.yaml
```

The `convert-secrets.sh` script extracts machine secrets from Terraform state and converts them to the format expected by talosctl.
