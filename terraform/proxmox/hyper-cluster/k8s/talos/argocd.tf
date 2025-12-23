resource "helm_release" "argocd" {
  depends_on       = [null_resource.cilium_manifests]
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

  lifecycle {
    ignore_changes = all
  }

  values = [file("${path.module}/../../../../../k8s/talos/infra/argocd/values.yaml")]
}

resource "null_resource" "argocd_manifests" {
  depends_on = [helm_release.argocd]

  provisioner "local-exec" {
    command = <<-EOT
      kubectl --kubeconfig=${path.module}/kubeconfig apply -f ${path.module}/../../../../../k8s/talos/infra/argocd/project-infra.yaml
      kubectl --kubeconfig=${path.module}/kubeconfig apply -f ${path.module}/../../../../../k8s/talos/infra/argocd/project-apps.yaml
      kubectl --kubeconfig=${path.module}/kubeconfig apply -f ${path.module}/../../../../../k8s/talos/infra/argocd/infra.yaml
    EOT
  }
}

output "argocd_url" {
  value = "https://10.3.10.100"
}
