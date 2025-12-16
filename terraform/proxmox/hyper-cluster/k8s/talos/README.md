# Talos Kubernetes on Proxmox

Deploy a Talos Kubernetes cluster on Proxmox VE using Terraform.

## Prerequisites

- Proxmox VE 8.x with SSH access
- Terraform/OpenTofu 1.13.0+
- kubectl for cluster management
- Network: 10.3.10.0/24 with gateway at 10.3.10.1
- Available IPs: 10.3.10.30-36
- Resources: 12 CPU cores, 12GB RAM, 90GB disk (for 6-node cluster)

## Quick Start

### 1. Initialize

```bash
cd terraform/proxmox/hyper-cluster/k8s/talos
terraform init
```

### 2. Configure

Edit `terraform.tfvars` with your environment settings. Default is a 6-node cluster (3 control plane + 3 workers).

### 3. Deploy

```bash
terraform apply
```

Deployment takes ~10-15 minutes for a 6-node cluster.

### 4. Access Cluster

```bash
# Save credentials
terraform output -raw talosconfig > talosconfig
terraform output -raw kubeconfig > kubeconfig

# Export paths
export TALOSCONFIG=$(pwd)/talosconfig
export KUBECONFIG=$(pwd)/kubeconfig

# Verify nodes
kubectl get nodes
```

All nodes should show STATUS "Ready".

### 5. Access ArgoCD

ArgoCD is automatically installed with LoadBalancer IP 10.3.10.100.

```bash
# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d

# Access UI
# Open browser to: https://10.3.10.100
# Username: admin
# Password: (from command above)
```

## What's Deployed

**Cluster:**

- 3 control plane nodes (10.3.10.31-33)
- 3 worker nodes (10.3.10.34-36)
- VIP: 10.3.10.30

**Software:**

- Talos Linux v1.8.3
- Kubernetes v1.31.3
- Cilium v1.19.0-pre.3 (CNI + kube-proxy replacement)
- ArgoCD v9.1.7

## Common Tasks

### Scale Cluster

Edit `terraform.tfvars` to add/remove nodes, then:

```bash
terraform apply
```

### Upgrade Cluster

Update `talos_version` or `kubernetes_version` in `terraform.tfvars`:

```bash
terraform apply
```

### Reset Node

```bash
talosctl reset --nodes 10.3.10.XX
```

### Destroy Cluster

```bash
terraform destroy
```

## Troubleshooting

### Nodes Not Ready

Check Cilium pods:

```bash
kubectl get pods -n kube-system -l k8s-app=cilium
```

All Cilium pods must be Running before nodes show Ready.

### ArgoCD Not Accessible

Verify LoadBalancer IP:

```bash
kubectl get svc argocd-server -n argocd
```

External IP should show 10.3.10.100.

### Bootstrap Fails

Check Talos node health:

```bash
talosctl health --nodes 10.3.10.31
```

### Network Issues

Verify Cilium L2 announcements:

```bash
kubectl get ciliuml2announcementpolicies -A
kubectl get ciliumloadbalancerippool -A
```

## Architecture Notes

- **SeaBIOS** for fast boot (~30s vs 8+ min with OVMF)
- **CNI set to "none"** (Cilium installed separately)
- **Kube-proxy disabled** (Cilium handles proxy)
- **Lifecycle ignore_changes** on Cilium/ArgoCD (enables GitOps management)
- **30s sleep delays** before applying CRD-dependent resources

## Files

- `main.tf` - Provider configuration
- `vms.tf` - VM definitions
- `talos.tf` - Cluster configuration and bootstrap
- `cilium.tf` - CNI installation
- `argocd.tf` - GitOps platform installation
- `variables.tf` - Input variables
- `outputs.tf` - Cluster credentials output

- **GitOps**: ArgoCD v7.7.12 (Terraform bootstrapped, ready for GitOps workflows)
- **Kube-Proxy**: Disabled (Cilium kube-proxy replacement)
- **IPAM**: Kubernetes mode (uses PodCIDRs from Node resources)
- **KubePrism**: localhost:7445 (Talos-provided K8s API endpoint)

### VM Specifications (per node)

**Control Plane Nodes:**

- **CPU**: 2 cores
- **Memory**: 3072 MB (3 GB)
- **Disk**: 10 GB on local-lvm
- **BIOS**: SeaBIOS (standard BIOS)
- **Machine**: q35
- **Network**: virtio with explicit MAC address

**Worker Nodes:**

- **CPU**: 2 cores
- **Memory**: 2048 MB
- **Disk**: 20 GB on local-lvm
- **Disk**: 20 GB on local-lvm
- **BIOS**: SeaBIOS (standard BIOS)
- **Machine**: q35
- **Network**: virtio with explicit MAC address

### High Availability Features

**Control Plane HA:**

- ✅ 3-node etcd cluster (survives 1 node failure)
- ✅ VIP (10.3.10.30) with automatic failover
- ✅ KubePrism on each node (local API endpoint)
- ✅ Zero-downtime upgrades (2 nodes maintain quorum)

**Workload HA:**

- ✅ 3 worker nodes for pod distribution
- ✅ Supports pod anti-affinity rules
- ✅ Can drain one worker without service interruption
- ✅ Horizontal pod autoscaling across nodes

**Network HA:**

- ✅ Cilium CNI on all nodes
- ✅ Automatic pod IP redistribution on node failure
- ✅ Service mesh capabilities (optional Hubble)

### Cluster Resources (Total)

- **CPU**: 12 cores (6 control plane + 6 workers)
- **Memory**: 15 GB (9 control plane + 6 workers)
- **Disk**: 90 GB (30 control plane + 60 workers)
- **Network**: 10.3.10.0/24 subnet

## Architecture

```
┌─────────────────────────────────────────────┐
│ Proxmox Node: hyper1                        │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ ctrl-00 (VM ID: 800)                 │  │
│  │ - IP: 10.3.10.31/24                  │  │
│  │ - Talos v1.8.3                       │  │
│  │ - K8s v1.34.0                        │  │
│  │ - Role: control-plane                │  │
│  │ - Storage: local-lvm (10GB)          │  │
│  │ - CNI: Cilium v1.16.5                │  │
│  │ - Status: Running, Ready ✅          │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  3 Workers: talos-worker-01, 02, 03        │
│  ┌──────────────────────────────────────┐  │
│  │ 10.3.10.34/35/36 - 2 cores, 2GB RAM │  │
│  │ - Talos v1.8.3                       │  │
│  │ - K8s v1.34.0                        │  │
│  │ - Role: worker                       │  │
│  │ - Storage: local-lvm (20GB)          │  │
│  │ - CNI: Cilium v1.16.5                │  │
│  │ - Status: Running, Ready ✅          │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  VIP: 10.3.10.30 (HA control plane access) │
└─────────────────────────────────────────────┘
```

## Configuration Files

- `main.tf` - Provider configuration (Proxmox, Talos, Helm, Time, Local)
- `vms.tf` - VM resource definitions for all 6 nodes
- `talos.tf` - Talos configuration (control plane + workers), bootstrap, kubeconfig
- `cilium.tf` - ArgoCD-compatible Cilium CNI installation via Helm
- `argocd.tf` - ArgoCD GitOps installation via Helm (installed after Cilium)
- `variables.tf` - Input variable definitions (including node_type support)
- `terraform.tfvars` - 6-node cluster configuration with minimal hardware specs
- `outputs.tf` - Outputs (talosconfig, kubeconfig, endpoints, cilium_status, argocd_info)

## How Automated Cilium Installation Works

The Cilium CNI is automatically installed during `terraform apply` using the official Helm chart with Talos-specific configuration. Here's the deployment flow:

### Deployment Sequence

1. **VMs Created** - Proxmox provisions VMs with Talos Linux
2. **Talos Bootstrap** - Cluster initializes, Kubernetes control plane starts
3. **90-Second Wait** - Time for Kubernetes API to become fully ready (`time_sleep` resource)
4. **Kubeconfig Export** - Terraform writes kubeconfig to local file for Helm provider
5. **Cilium Deployment** - Helm installs Cilium with Talos-specific settings
6. **60-Second Wait** - Time for Cilium CNI to become fully operational
7. **ArgoCD Deployment** - Helm installs ArgoCD for GitOps management
8. **Node Ready** - After Cilium pods start (~60-90s), node transitions to Ready state

### Talos-Specific Cilium Configuration

The installation follows the [official Cilium documentation for Talos Linux](https://docs.cilium.io/en/stable/installation/k8s-install-helm/#talos-linux):

| Setting                                    | Value            | Reason                                                |
| ------------------------------------------ | ---------------- | ----------------------------------------------------- |
| `ipam.mode`                                | `kubernetes`     | Uses PodCIDRs assigned to Node resources by Talos     |
| `kubeProxyReplacement`                     | `true`           | Cilium replaces kube-proxy (disabled in Talos config) |
| `k8sServiceHost`                           | `localhost`      | Uses Talos KubePrism endpoint                         |
| `k8sServicePort`                           | `7445`           | KubePrism port (Talos-provided K8s API load balancer) |
| `cgroup.autoMount.enabled`                 | `false`          | Talos provides cgroupv2 mounts                        |
| `cgroup.hostRoot`                          | `/sys/fs/cgroup` | Talos cgroupv2 mount point                            |
| `securityContext.capabilities.ciliumAgent` | No `SYS_MODULE`  | Talos doesn't allow kernel module loading             |

### KubePrism Integration

**KubePrism** is a Talos-specific feature that provides a local Kubernetes API endpoint on every node at `localhost:7445`. This allows Cilium to reliably access the Kubernetes API without depending on:

- External load balancers
- VIP (which only works with 3+ nodes)
- Node-specific API endpoints

Benefits:

- ✅ Works on single-node clusters
- ✅ No external dependencies
- ✅ Automatic failover in HA setups
- ✅ Consistent configuration across all nodes

### Files Involved

- **[cilium.tf](cilium.tf)** - Helm release resource with all Talos-specific settings
- **[main.tf](main.tf)** - Helm provider configuration (uses local kubeconfig)
- **kubeconfig** - Generated by Terraform, used by Helm provider (gitignored)

### Verification Commands

```bash
# Check Cilium deployment
kubectl get pods -n kube-system -l k8s-app=cilium
kubectl wait --for=condition=ready pod -l k8s-app=cilium -n kube-system --timeout=5m

# Check Helm release
helm list -n kube-system

# Check Terraform output
terraform output cilium_status

# Verify node is Ready
kubectl get nodes
```

## Troubleshooting

### VM Creation Takes Longer Than Expected

**If VM creation exceeds 5 minutes**, check:

1. **Proxmox API user permissions** - Ensure the user has proper permissions:
   - `VM.Allocate`, `VM.Config.*`, `VM.Monitor`, `VM.Audit` on VMs
   - `Datastore.AllocateSpace`, `Datastore.Audit` on storage
   - Previous 15-minute delay was caused by missing permissions
2. QEMU guest agent status: `ssh root@proxmox 'qm agent <vmid> ping'`
3. Storage performance on local-lvm datastore
4. Network connectivity between Terraform host and Proxmox

**Normal timing:**

- First VM: 2-3 minutes (image download + provisioning)
- Subsequent VMs: 1-2 minutes (image cached)

### Node Shows "NotReady"

**Temporary during Cilium installation**. Nodes show NotReady for ~60-90 seconds while Cilium deploys. If NotReady persists beyond 5 minutes:

```bash
# Check Cilium pod status
kubectl get pods -n kube-system -l k8s-app=cilium

# Check Cilium logs
kubectl logs -n kube-system -l k8s-app=cilium --tail=50

# Verify Helm release
helm list -n kube-system
```

### Cannot Access VIP (10.3.10.30)

**Expected with single-node**. VIP only activates with 3+ nodes. Use direct node IP:

```bash
kubectl get nodes --server=https://10.3.10.31:6443
```

### "nodes ctrl-00 not found" Error

**Expected during initial bootstrap**. Wait 1-2 minutes for:

1. Kubelet to start
2. API server to become ready
3. Node registration to complete

Check logs:

```bash
talosctl --nodes 10.3.10.31 logs kubelet | tail -20
```

### SSH Authentication Failure to Proxmox

Ensure `proxmox_ssh_password` is set in `terraform.tfvars` or use SSH agent:

```bash
# With password
export TF_VAR_proxmox_ssh_password="your-password"

# With SSH agent
ssh-add ~/.ssh/proxmox_key
```

### Cilium Installation Fails or Pods CrashLooping

If Cilium pods fail to start or node remains NotReady beyond 5 minutes:

```bash
# Check Cilium pod status
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Check Cilium logs
kubectl logs -n kube-system -l k8s-app=cilium --tail=100

# Verify Helm deployment
helm list -n kube-system
helm status cilium -n kube-system

# Check for resource issues
kubectl describe pod -n kube-system -l k8s-app=cilium

# Verify Talos KubePrism is running
talosctl --nodes 10.3.10.31 service kubelet status

# Manual reinstall if needed
helm uninstall cilium -n kube-system
terraform apply -replace=helm_release.cilium
```

**Common issues:**

- **ImagePullBackOff**: Check internet connectivity from Proxmox node
- **Insufficient permissions**: Verify capabilities in cilium.tf match Talos requirements
- **API connection errors**: KubePrism not ready - wait 60s after bootstrap

## Cluster Upgrades

This setup supports **in-place rolling upgrades** for both Talos and Kubernetes with zero downtime on multi-node clusters.

### Upgrade Strategy

Talos uses an **immutable infrastructure** approach:

- **No package managers** - entire OS is upgraded atomically
- **A/B partition system** - new version installed to inactive partition, then switched
- **Automatic rollback** - if boot fails, system reverts to previous version
- **Zero downtime** - rolling upgrades across nodes (HA cluster only)

### Upgrade Order (Important!)

Always upgrade in this order to maintain cluster health:

1. **Talos OS** on all nodes (control plane first, then workers)
2. **Kubernetes** version
3. **Cilium CNI** (if needed)

### Talos OS Upgrade

#### Option 1: Terraform (Recommended - Declarative)

Update version in `terraform.tfvars`:

```hcl
talos_version = "v1.9.0"  # Update to new version
```

Then apply changes:

```bash
# Preview changes
terraform plan

# Apply - Talos will upgrade nodes one at a time
terraform apply
```

**How it works:**

- Terraform updates the schematic URL with new version
- `talos_machine_configuration_apply` detects version change
- Each node downloads new Talos image and reboots into it
- Automatic rolling upgrade (one node at a time)
- Total time: ~5-10 minutes per node

#### Option 2: Talosctl (Manual - Imperative)

For fine-grained control:

```bash
# Check current version
talosctl --nodes 10.3.10.31,10.3.10.32,10.3.10.33,10.3.10.34 version

# Upgrade control plane nodes one at a time
talosctl upgrade --nodes 10.3.10.31 --image factory.talos.dev/installer/[schematic-id]:v1.9.0
# Wait for node to become Ready
kubectl wait --for=condition=ready node ctrl-00 --timeout=10m

talosctl upgrade --nodes 10.3.10.32 --image factory.talos.dev/installer/[schematic-id]:v1.9.0
kubectl wait --for=condition=ready node ctrl-01 --timeout=10m

talosctl upgrade --nodes 10.3.10.33 --image factory.talos.dev/installer/[schematic-id]:v1.9.0
kubectl wait --for=condition=ready node ctrl-02 --timeout=10m

# Then upgrade worker nodes
talosctl upgrade --nodes 10.3.10.34 --image factory.talos.dev/installer/[schematic-id]:v1.9.0
kubectl wait --for=condition=ready node worker-00 --timeout=10m
```

**Get schematic ID:**

```bash
terraform output -raw talos_schematic_id
# Or from talos.tf: talos_image_factory_schematic.this.id
```

### Kubernetes Upgrade

Update version in `terraform.tfvars`:

```hcl
kubernetes_version = "v1.32.0"  # Update to new version
```

Apply via Terraform:

```bash
terraform plan
terraform apply
```

**Or manually via talosctl:**

```bash
# Upgrade Kubernetes on control plane (one at a time)
talosctl upgrade-k8s --nodes 10.3.10.31 --to v1.32.0
# Repeat for other control plane nodes

# Worker nodes upgrade automatically
```

**Important:** Only upgrade one minor version at a time (1.31 → 1.32, not 1.31 → 1.33)

### Cilium Upgrade

Update version in `cilium.tf`:

```hcl
version = "1.17.0"  # Update to new version
```

Apply:

```bash
terraform plan
terraform apply
```

**Or manually via Helm:**

```bash
helm repo update
helm upgrade cilium cilium/cilium --version 1.17.0 --namespace kube-system --reuse-values
```

### Pre-Upgrade Checklist

Before upgrading, verify:

```bash
# 1. All nodes are Ready
kubectl get nodes

# 2. All pods are Running
kubectl get pods -A

# 3. Etcd is healthy (control plane)
talosctl --nodes 10.3.10.31 service etcd status

# 4. Check for deprecated APIs (if upgrading K8s)
kubectl api-resources --verbs=list --namespaced -o name | xargs -n 1 kubectl get --show-kind --ignore-not-found -A

# 5. Backup etcd (optional but recommended)
talosctl --nodes 10.3.10.31 etcd snapshot /var/lib/etcd.backup

# 6. Check upgrade compatibility
# Visit: https://www.talos.dev/v1.9/introduction/support-matrix/
```

### Post-Upgrade Validation

After upgrade:

```bash
# 1. Verify all nodes upgraded
talosctl --nodes 10.3.10.31,10.3.10.32,10.3.10.33,10.3.10.34 version

# 2. Check node status
kubectl get nodes -o wide

# 3. Verify control plane health
kubectl get cs

# 4. Check Cilium status
kubectl get pods -n kube-system -l k8s-app=cilium
cilium status

# 5. Run connectivity test
cilium connectivity test

# 6. Verify workloads still running
kubectl get pods -A
```

### Rollback Procedure

If upgrade fails:

**Automatic rollback:**

- Talos automatically rolls back if it can't boot the new version
- System will reboot into previous working version

**Manual rollback (if needed):**

```bash
# Talos OS rollback
talosctl rollback --nodes 10.3.10.31

# Kubernetes rollback - update terraform.tfvars to previous version
kubernetes_version = "v1.31.0"
terraform apply

# Cilium rollback
helm rollback cilium -n kube-system
```

### Upgrade Example: v1.8.3 → v1.9.0

Complete example workflow:

```bash
# 1. Check current state
kubectl get nodes
talosctl version --nodes 10.3.10.31

# 2. Update terraform.tfvars
# talos_version = "v1.9.0"

# 3. Apply Terraform
terraform plan
terraform apply  # This will upgrade all nodes

# 4. Monitor upgrade progress
watch kubectl get nodes

# 5. Wait for all nodes Ready
kubectl wait --for=condition=ready nodes --all --timeout=20m

# 6. Verify upgrade
talosctl version --nodes 10.3.10.31,10.3.10.32,10.3.10.33,10.3.10.34
kubectl get nodes -o wide

# 7. Test cluster
kubectl run test --image=nginx --rm -it -- curl -I http://kubernetes.default.svc
```

### Maintenance Windows

**Zero-downtime upgrades** require:

- ✅ 3+ control plane nodes (HA etcd quorum)
- ✅ Workloads with multiple replicas
- ✅ Pod disruption budgets configured
- ✅ Node draining during upgrades

**With current setup (3 control plane + 1 worker):**

- Control plane: Zero downtime ✅ (2 nodes maintain quorum)
- Workloads: Brief interruption ⚠️ (single worker - pods restart on same node)

**To achieve full zero-downtime:**

- Add 1-2 more worker nodes
- Use pod anti-affinity for workloads
- Configure pod disruption budgets

### Update Frequency

**Talos releases:**

- Major: ~2x per year
- Minor: ~every 2-3 months
- Patch: As needed for security

**Kubernetes releases:**

- Minor: ~3x per year
- Patch: Monthly

**Recommended schedule:**

- Patch updates: Within 1 month
- Minor updates: Within 3 months
- Security updates: Within 1 week

## Next Steps After Cluster Bootstrap

1. ✅ **Cluster deployed** - Talos v1.8.3 + Kubernetes v1.34.0
2. ✅ **Cilium CNI installed** - Automated via Terraform, node is Ready
3. ✅ **ArgoCD installed** - Ready for GitOps workflows
4. **Configure ArgoCD for GitOps**:
   ```bash
   # Deploy your first application or infrastructure components
   # Example: Let ArgoCD manage Cilium updates
   kubectl apply -f argocd-cilium-application.yaml
   ```
5. **Test workload deployment**:
   ```bash
   kubectl run nginx --image=nginx
   kubectl expose pod nginx --port=80
   kubectl get pods -o wide
   ```
6. **Scale to 3 nodes** - Uncomment ctrl-01 and ctrl-02 in terraform.tfvars
7. **Enable Hubble Observability** - Edit cilium.tf, set hubble.enabled=true
8. **Add persistent storage** - Proxmox CSI plugin or Longhorn

## GitOps Integration with ArgoCD

### Current Setup: Terraform-Managed Cilium

By default, Cilium is installed and managed by Terraform's Helm provider. This works great for automated deployment but **conflicts with GitOps tools** like ArgoCD because both try to manage the same resources.

### Migrating to ArgoCD Management

To let ArgoCD manage Cilium (recommended for GitOps workflows):

#### Step 1: Switch to ArgoCD-Compatible Mode

Replace the current Cilium installation with one that ArgoCD can adopt:

```bash
# Backup current setup
cp cilium.tf cilium.tf.backup

# Use ArgoCD-compatible version
cp cilium-argocd.tf.example cilium.tf

# Apply changes
terraform apply
```

The key difference is the `lifecycle` block that tells Terraform to ignore changes after initial installation:

```hcl
lifecycle {
  ignore_changes = [
    version,
    values,
    set,
  ]
}
```

#### Step 2: Create Cilium Values in Git

Create a values file for Cilium in your Git repository (recommended location):

```bash
# In your Homelab repo
mkdir -p k8s/k3sa/infra/network/cilium
```

**k8s/k3sa/infra/network/cilium/values-talos.yaml:**

```yaml
ipam:
  mode: kubernetes

kubeProxyReplacement: true

securityContext:
  capabilities:
    ciliumAgent:
      - CHOWN
      - KILL
      - NET_ADMIN
      - NET_RAW
      - IPC_LOCK
      - SYS_ADMIN
      - SYS_RESOURCE
      - DAC_OVERRIDE
      - FOWNER
      - SETGID
      - SETUID
    cleanCiliumState:
      - NET_ADMIN
      - SYS_ADMIN
      - SYS_RESOURCE

cgroup:
  autoMount:
    enabled: false
  hostRoot: /sys/fs/cgroup

k8sServiceHost: localhost
k8sServicePort: 7445

hubble:
  enabled: true
  relay:
    enabled: true
  ui:
    enabled: true
```

#### Step 3: Deploy ArgoCD Application

Apply the ArgoCD Application manifest (see [argocd-cilium-application.yaml.example](argocd-cilium-application.yaml.example)):

```bash
kubectl apply -f argocd-cilium-application.yaml
```

Or create it in your existing ArgoCD ApplicationSet.

#### Step 4: Verify ArgoCD Adoption

```bash
# Check ArgoCD Application status
kubectl get applications -n argocd cilium

# Check sync status
argocd app get cilium

# Verify Cilium pods still running
kubectl get pods -n kube-system -l k8s-app=cilium
```

### Benefits of ArgoCD Management

Once ArgoCD manages Cilium:

- ✅ **Single source of truth**: Git repository
- ✅ **Automated sync**: Changes in Git auto-deploy
- ✅ **Drift detection**: ArgoCD alerts on manual changes
- ✅ **Rollback capability**: Git revert = automatic rollback
- ✅ **Audit trail**: All changes tracked in Git commits
- ✅ **Multi-cluster**: Same config across multiple clusters

### Hybrid Approach: Terraform Bootstrap + ArgoCD Management

**Best practice workflow:**

1. **Terraform**: Deploys Talos cluster + initial Cilium installation
2. **ArgoCD**: Manages all applications including Cilium updates
3. **Git**: Source of truth for all configurations

This separates concerns:

- **Infrastructure layer** (VMs, Talos, bootstrap) = Terraform
- **Application layer** (Cilium, apps, configs) = ArgoCD/Git

### Troubleshooting ArgoCD Adoption

If ArgoCD shows `OutOfSync` or conflicts:

```bash
# Option 1: Force sync (overwrite with Git values)
argocd app sync cilium --force

# Option 2: Delete and recreate (if issues persist)
helm uninstall cilium -n kube-system
kubectl delete application cilium -n argocd
kubectl apply -f argocd-cilium-application.yaml

# Option 3: Check for resource conflicts
kubectl get all -n kube-system -l app.kubernetes.io/name=cilium
```

## Useful Commands

### Cilium Operations

```bash
# Check Cilium status
kubectl get pods -n kube-system -l k8s-app=cilium

# Cilium CLI (install: brew install cilium-cli)
cilium status
cilium connectivity test

# Helm operations
helm list -n kube-system
helm status cilium -n kube-system
helm get values cilium -n kube-system

# Check Cilium agent health
kubectl exec -n kube-system ds/cilium -- cilium-health status
```

### Talos Operations

```bash
# Check all services
talosctl --nodes 10.3.10.31 services

# View system logs
talosctl --nodes 10.3.10.31 dmesg

# Check etcd status
talosctl --nodes 10.3.10.31 service etcd status

# View machine config
talosctl --nodes 10.3.10.31 get machineconfig

# Interactive dashboard
talosctl --nodes 10.3.10.31 dashboard
```

### Kubernetes Operations

````bash
# Get all resources
kubectl get all -A

# Check control plane health
kubectl get cs

### Kubernetes Operations

```bash
# Check all cluster nodes
kubectl get nodes -o wide

# View all pods across the cluster
kubectl get pods -A

# Check control plane health
kubectl get componentstatuses

# View node details
kubectl describe node talos-ctrl-01

# Check CNI pods across all nodes
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Verify Cilium network connectivity
kubectl exec -n kube-system ds/cilium -- cilium status
````

### Proxmox Operations

```bash
# SSH to Proxmox and check all VM status
ssh root@10.3.10.10
qm list | grep 80

# Check QEMU guest agent on all nodes
for vm in {800..805}; do echo "=== VM $vm ===" && qm agent $vm ping; done

# View specific VM status
qm status 800

# View VM logs
qm terminal 800
```

## Clean Up

### Destroy Entire Cluster

```bash
# Destroy all 6 nodes
terraform destroy
```

### Selective Destroy (Workers Only)

```bash
# Destroy only worker nodes
terraform destroy -target='proxmox_virtual_environment_vm.talos_nodes["worker-01"]' \
                  -target='proxmox_virtual_environment_vm.talos_nodes["worker-02"]' \
                  -target='proxmox_virtual_environment_vm.talos_nodes["worker-03"]'
```

### Force Remove Stuck Resources

```bash
# Remove specific VM from Proxmox directly
ssh root@10.3.10.10 "qm stop 800 && qm destroy 800"

# Clean Terraform state
terraform state rm 'proxmox_virtual_environment_vm.talos_nodes["ctrl-01"]'

# Remove all VMs if needed
for vm in {800..805}; do ssh root@10.3.10.10 "qm stop $vm && qm destroy $vm"; done
```

## References

- [Talos Documentation](https://www.talos.dev/v1.8/)
- [Talos on Proxmox Guide](https://blog.stonegarden.dev/articles/2024/08/talos-proxmox-tofu/)
- [Cilium Installation on Talos](https://docs.cilium.io/en/stable/installation/k8s-install-helm/#talos-linux)
- [Proxmox Terraform Provider](https://registry.terraform.io/providers/bpg/proxmox/latest/docs)
