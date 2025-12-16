# Cilium CNI installation
# Bootstrap via Terraform, lifecycle.ignore_changes allows ArgoCD management

# Wait 90s for Kubernetes API
resource "time_sleep" "wait_for_kubernetes" {
  depends_on = [talos_machine_bootstrap.cluster]

  create_duration = "90s"
}

# Write kubeconfig for Helm provider
resource "local_sensitive_file" "kubeconfig" {
  depends_on = [time_sleep.wait_for_kubernetes]

  content         = talos_cluster_kubeconfig.cluster.kubeconfig_raw
  filename        = "${path.module}/kubeconfig"
  file_permission = "0600"
}

# Install Cilium CNI
resource "helm_release" "cilium" {
  depends_on = [local_sensitive_file.kubeconfig]

  name             = "cilium"
  repository       = "https://helm.cilium.io/"
  chart            = "cilium"
  version          = "1.19.0-pre.3"
  namespace        = "kube-system"
  create_namespace = false
  atomic           = false
  wait             = true
  wait_for_jobs    = true
  timeout          = 600

  # Allow ArgoCD to manage updates
  lifecycle {
    ignore_changes = [version, values]
  }
  values = [file("${path.module}/../../../../../k8s/talos/infra/cilium/values.yaml")]

  # Apply IP pool after CRDs are installed
  provisioner "local-exec" {
    command = "sleep 30 && kubectl apply -f ${path.module}/../../../../../k8s/talos/infra/cilium/ippool.yaml --kubeconfig=${path.module}/kubeconfig"
  }
}

output "cilium_info" {
  description = "Cilium installation information"
  value = {
    installed = helm_release.cilium.status == "deployed"
    version   = helm_release.cilium.version
    namespace = helm_release.cilium.namespace
  }
}
