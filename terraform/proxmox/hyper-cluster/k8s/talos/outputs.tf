# Talos Kubernetes Cluster - Outputs
#
# This file defines outputs that provide access to cluster credentials and metadata.
#
# Sensitive Outputs (talosconfig, kubeconfig):
# - Marked as sensitive to prevent accidental exposure in logs
# - Extract with: terraform output -raw <output_name> > <filename>
#
# Usage Examples:
#   terraform output -raw talosconfig > talosconfig
#   terraform output -raw kubeconfig > kubeconfig
#   export KUBECONFIG=$(pwd)/kubeconfig
#   export TALOSCONFIG=$(pwd)/talosconfig

output "talosconfig" {
  description = "Talos configuration - save to file with: terraform output -raw talosconfig > talosconfig"
  value       = data.talos_client_configuration.cluster.talos_config
  sensitive   = true
}

output "kubeconfig" {
  description = "Kubernetes configuration - save to file with: terraform output -raw kubeconfig > kubeconfig"
  value       = talos_cluster_kubeconfig.cluster.kubeconfig_raw
  sensitive   = true
}

output "kubernetes_endpoint" {
  description = "Kubernetes API endpoint"
  value       = "https://${local.kubernetes_endpoint}:6443"
}

output "node_ips" {
  description = "IP addresses of all nodes"
  value       = [for node in var.nodes : node.ip]
}

output "cluster_name" {
  description = "Name of the Talos cluster"
  value       = var.cluster_name
}
