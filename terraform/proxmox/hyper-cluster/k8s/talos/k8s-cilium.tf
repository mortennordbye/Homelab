# Wait for Kubernetes API readiness
resource "time_sleep" "wait_for_kubernetes" {
  depends_on      = [talos_machine_bootstrap.cluster]
  create_duration = "90s"
}

resource "local_sensitive_file" "kubeconfig" {
  depends_on      = [time_sleep.wait_for_kubernetes]
  content         = talos_cluster_kubeconfig.cluster.kubeconfig_raw
  filename        = "${path.module}/kubeconfig"
  file_permission = "0600"
}

resource "helm_release" "cilium" {
  depends_on       = [local_sensitive_file.kubeconfig]
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

  # Allow ArgoCD to manage after bootstrap
  lifecycle {
    ignore_changes = [version, values]
  }
  values = [file("${path.module}/../../../../../k8s/talos/infra/cilium/values.yaml")]
}

# Wait for CRD registration
resource "time_sleep" "wait_for_cilium_crds" {
  depends_on      = [helm_release.cilium]
  create_duration = "60s"
}

# Apply manifests via kubectl (provider timing issue workaround)
resource "null_resource" "cilium_manifests" {
  depends_on = [time_sleep.wait_for_cilium_crds]

  provisioner "local-exec" {
    command = <<-EOT
      kubectl --kubeconfig=${path.module}/kubeconfig apply -f ${path.module}/../../../../../k8s/talos/infra/cilium/loadbalancer-ippool.yaml
      kubectl --kubeconfig=${path.module}/kubeconfig apply -f ${path.module}/../../../../../k8s/talos/infra/cilium/l2-announcement-policy.yaml
    EOT
  }
}

output "cilium_version" {
  value = helm_release.cilium.version
}
