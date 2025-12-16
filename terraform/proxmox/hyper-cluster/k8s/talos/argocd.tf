# ArgoCD installation
# Bootstrap via Terraform, lifecycle.ignore_changes allows self-management

# Wait 60s for Cilium
resource "time_sleep" "wait_for_cilium" {
  depends_on = [helm_release.cilium]

  create_duration = "60s"
}

# Install ArgoCD
resource "helm_release" "argocd" {
  depends_on = [time_sleep.wait_for_cilium]

  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "9.1.7"
  namespace        = "argocd"
  create_namespace = true
  atomic           = false
  wait             = true
  wait_for_jobs    = true
  timeout          = 600

  # Allow ArgoCD self-management
  lifecycle {
    ignore_changes = [version, values]
  }
  values = [file("${path.module}/../../../../../k8s/talos/infra/argocd/values.yaml")]

  # Apply ArgoCD project and apps after CRDs are installed
  provisioner "local-exec" {
    command = "sleep 30 && kubectl apply -f ${path.module}/../../../../../k8s/talos/infra/argocd/project-homelab.yaml --kubeconfig=${path.module}/kubeconfig && kubectl apply -f ${path.module}/../../../../../k8s/talos/infra/argocd/infra.yaml --kubeconfig=${path.module}/kubeconfig"
  }
}

output "argocd_info" {
  description = "ArgoCD access information"
  value = {
    namespace       = helm_release.argocd.namespace
    status          = helm_release.argocd.status
    loadbalancer_ip = "10.3.10.100"
    message         = "Access ArgoCD: https://10.3.10.100 or http://10.3.10.100 (insecure mode enabled)"
    password        = "Get initial password: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"
  }
}
