output "talosconfig" {
  description = "Talos client configuration"
  value       = data.talos_client_configuration.cluster.talos_config
  sensitive   = true
}

output "kubeconfig" {
  description = "Kubernetes client configuration"
  value       = talos_cluster_kubeconfig.cluster.kubeconfig_raw
  sensitive   = true
}

output "kubernetes_endpoint" {
  description = "Kubernetes API endpoint"
  value       = "https://${local.kubernetes_endpoint}:6443"
}

output "node_ips" {
  description = "All node IPs"
  value       = [for node in var.nodes : node.ip]
}

output "cluster_name" {
  description = "Cluster name"
  value       = var.cluster_name
}

output "talos_secrets" {
  description = "Talos machine secrets bundle for disaster recovery"
  value       = talos_machine_secrets.cluster.machine_secrets
  sensitive   = true
}
