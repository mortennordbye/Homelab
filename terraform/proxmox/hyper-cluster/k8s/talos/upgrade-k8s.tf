resource "null_resource" "upgrade_kubernetes" {
  count = var.enable_kubernetes_upgrade ? 1 : 0

  triggers = {
    kubernetes_version = var.kubernetes_version
    talos_complete     = var.enable_talos_upgrade ? null_resource.upgrade_worker_3[0].id : "none"
  }

  provisioner "local-exec" {
    command = <<-EOT
      cd ${path.module}
      unset TF_LOG
      terraform output -raw talosconfig > talosconfig
      export TALOSCONFIG=./talosconfig

      [ "${var.enable_talos_upgrade}" = "true" ] && sleep 120  # Wait after Talos upgrade

      talosctl upgrade-k8s \
        --endpoints ${values(local.control_plane_nodes)[0].ip} \
        --nodes ${values(local.control_plane_nodes)[0].ip} \
        --to ${var.kubernetes_version}

      sleep 60
    EOT
  }

  depends_on = [talos_cluster_kubeconfig.cluster]
}
