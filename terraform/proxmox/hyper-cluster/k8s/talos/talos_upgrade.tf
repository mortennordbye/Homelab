resource "null_resource" "upgrade_ctrl_1" {
  count = var.enable_talos_upgrade ? 1 : 0

  triggers = {
    talos_version = var.talos_version
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Upgrading control plane 1 to Talos ${var.talos_version}..."
      cd ${path.module}
      unset TF_LOG
      terraform output -raw talosconfig > talosconfig

      talosctl --talosconfig=./talosconfig upgrade \
        --endpoints ${join(",", [for n in local.control_plane_nodes : n.ip])} \
        --nodes ${values(local.control_plane_nodes)[0].ip} \
        --image factory.talos.dev/installer/${talos_image_factory_schematic.this.id}:${var.talos_version} \
        --preserve --wait

      echo "Control plane 1 upgraded"
      sleep 60
    EOT
  }

  depends_on = [talos_cluster_kubeconfig.cluster]
}

resource "null_resource" "upgrade_ctrl_2" {
  count = var.enable_talos_upgrade ? 1 : 0

  triggers = {
    talos_version = var.talos_version
    prev_complete = null_resource.upgrade_ctrl_1[0].id
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Upgrading control plane 2 to Talos ${var.talos_version}..."
      cd ${path.module}
      unset TF_LOG
      terraform output -raw talosconfig > talosconfig

      talosctl --talosconfig=./talosconfig upgrade \
        --endpoints ${join(",", [for n in local.control_plane_nodes : n.ip])} \
        --nodes ${values(local.control_plane_nodes)[1].ip} \
        --image factory.talos.dev/installer/${talos_image_factory_schematic.this.id}:${var.talos_version} \
        --preserve --wait

      echo "Control plane 2 upgraded"
      sleep 60
    EOT
  }

  depends_on = [null_resource.upgrade_ctrl_1]
}

resource "null_resource" "upgrade_ctrl_3" {
  count = var.enable_talos_upgrade ? 1 : 0

  triggers = {
    talos_version = var.talos_version
    prev_complete = null_resource.upgrade_ctrl_2[0].id
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Upgrading control plane 3 to Talos ${var.talos_version}..."
      cd ${path.module}
      unset TF_LOG
      terraform output -raw talosconfig > talosconfig

      talosctl --talosconfig=./talosconfig upgrade \
        --endpoints ${join(",", [for n in local.control_plane_nodes : n.ip])} \
        --nodes ${values(local.control_plane_nodes)[2].ip} \
        --image factory.talos.dev/installer/${talos_image_factory_schematic.this.id}:${var.talos_version} \
        --preserve --wait

      echo "Control plane 3 upgraded"
      sleep 60
    EOT
  }

  depends_on = [null_resource.upgrade_ctrl_2]
}

resource "null_resource" "upgrade_worker_1" {
  count = var.enable_talos_upgrade ? 1 : 0

  triggers = {
    talos_version = var.talos_version
    prev_complete = null_resource.upgrade_ctrl_3[0].id
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Upgrading worker 1 to Talos ${var.talos_version}..."
      cd ${path.module}
      unset TF_LOG
      terraform output -raw talosconfig > talosconfig

      talosctl --talosconfig=./talosconfig upgrade \
        --endpoints ${join(",", [for n in local.control_plane_nodes : n.ip])} \
        --nodes ${values(local.worker_nodes)[0].ip} \
        --image factory.talos.dev/installer/${talos_image_factory_schematic.this.id}:${var.talos_version} \
        --preserve --wait

      echo "Worker 1 upgraded"
      sleep 30
    EOT
  }

  depends_on = [null_resource.upgrade_ctrl_3]
}

resource "null_resource" "upgrade_worker_2" {
  count = var.enable_talos_upgrade ? 1 : 0

  triggers = {
    talos_version = var.talos_version
    prev_complete = null_resource.upgrade_worker_1[0].id
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Upgrading worker 2 to Talos ${var.talos_version}..."
      cd ${path.module}
      unset TF_LOG
      terraform output -raw talosconfig > talosconfig

      talosctl --talosconfig=./talosconfig upgrade \
        --endpoints ${join(",", [for n in local.control_plane_nodes : n.ip])} \
        --nodes ${values(local.worker_nodes)[1].ip} \
        --image factory.talos.dev/installer/${talos_image_factory_schematic.this.id}:${var.talos_version} \
        --preserve --wait

      echo "Worker 2 upgraded"
      sleep 30
    EOT
  }

  depends_on = [null_resource.upgrade_worker_1]
}

resource "null_resource" "upgrade_worker_3" {
  count = var.enable_talos_upgrade ? 1 : 0

  triggers = {
    talos_version = var.talos_version
    prev_complete = null_resource.upgrade_worker_2[0].id
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Upgrading worker 3 to Talos ${var.talos_version}..."
      cd ${path.module}
      unset TF_LOG
      terraform output -raw talosconfig > talosconfig

      talosctl --talosconfig=./talosconfig upgrade \
        --endpoints ${join(",", [for n in local.control_plane_nodes : n.ip])} \
        --nodes ${values(local.worker_nodes)[2].ip} \
        --image factory.talos.dev/installer/${talos_image_factory_schematic.this.id}:${var.talos_version} \
        --preserve --wait

      echo "Worker 3 upgraded"
      sleep 30
    EOT
  }

  depends_on = [null_resource.upgrade_worker_2]
}
