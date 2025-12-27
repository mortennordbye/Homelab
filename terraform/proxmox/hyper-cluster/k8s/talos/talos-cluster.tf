locals {
  control_plane_nodes    = { for k, v in var.nodes : k => v if v.node_type == "controlplane" }
  worker_nodes           = { for k, v in var.nodes : k => v if v.node_type == "worker" }
  first_control_plane_ip = values(local.control_plane_nodes)[0].ip
  kubernetes_endpoint    = coalesce(var.cluster_vip, local.first_control_plane_ip)
}

resource "talos_machine_secrets" "cluster" {
  talos_version = var.talos_version
}

# Custom image with Intel microcode and QEMU guest agent
resource "talos_image_factory_schematic" "this" {
  schematic = yamlencode({
    customization = {
      systemExtensions = {
        officialExtensions = [
          "siderolabs/intel-ucode",
          "siderolabs/qemu-guest-agent",
        ]
      }
    }
  })
}

resource "proxmox_virtual_environment_download_file" "talos_image" {
  for_each = toset(distinct([for node in var.nodes : node.proxmox_node]))

  node_name               = each.key
  content_type            = "iso"
  datastore_id            = var.proxmox_iso_storage
  file_name               = "talos-${var.talos_version}-${talos_image_factory_schematic.this.id}.img"
  url                     = "https://factory.talos.dev/image/${talos_image_factory_schematic.this.id}/${var.talos_version}/nocloud-amd64.raw.gz"
  decompression_algorithm = "gz"
  overwrite               = false

  # Ignore changes - upgrades done via talosctl
  lifecycle {
    ignore_changes = [file_name, url]
  }
}

data "talos_machine_configuration" "controlplane" {
  for_each = local.control_plane_nodes

  cluster_name     = var.cluster_name
  cluster_endpoint = "https://${local.kubernetes_endpoint}:6443"
  machine_type     = "controlplane"
  machine_secrets  = talos_machine_secrets.cluster.machine_secrets
  talos_version    = var.talos_version

  config_patches = [
    yamlencode({
      machine = {
        network = {
          hostname = each.key
          interfaces = [{
            interface = "eth0"
            addresses = ["${each.value.ip}/${var.network_subnet_mask}"]
            routes = [{
              network = "0.0.0.0/0"
              gateway = var.network_gateway
            }]
            dhcp = false
            vip = var.cluster_vip != "" ? {
              ip = var.cluster_vip
            } : null
          }]
        }
        nodeLabels = {
          "topology.kubernetes.io/zone" = each.value.proxmox_node
        }
      }
      cluster = {
        allowSchedulingOnControlPlanes = true
        network = {
          cni = {
            name = "none" # Cilium installed via Helm
          }
        }
        proxy = {
          disabled = true # Cilium kube-proxy replacement
        }
      }
    })
  ]
}

data "talos_machine_configuration" "worker" {
  for_each = local.worker_nodes

  cluster_name     = var.cluster_name
  cluster_endpoint = "https://${local.kubernetes_endpoint}:6443"
  machine_type     = "worker"
  machine_secrets  = talos_machine_secrets.cluster.machine_secrets
  talos_version    = var.talos_version

  config_patches = [
    yamlencode({
      machine = {
        network = {
          hostname = each.key
          interfaces = [{
            interface = "eth0"
            addresses = ["${each.value.ip}/${var.network_subnet_mask}"]
            routes = [{
              network = "0.0.0.0/0"
              gateway = var.network_gateway
            }]
            dhcp = false
          }]
        }
        nodeLabels = {
          "topology.kubernetes.io/zone" = each.value.proxmox_node
        }
      }
      cluster = {
        network = {
          cni = {
            name = "none"
          }
        }
        proxy = {
          disabled = true
        }
      }
    })
  ]
}

resource "talos_machine_configuration_apply" "controlplane" {
  for_each = local.control_plane_nodes

  endpoint                    = each.value.ip
  node                        = each.value.ip
  client_configuration        = talos_machine_secrets.cluster.client_configuration
  machine_configuration_input = data.talos_machine_configuration.controlplane[each.key].machine_configuration
  apply_mode                  = "auto"

  timeouts = {
    create = "10m"
    update = "10m"
  }
}

resource "talos_machine_configuration_apply" "worker" {
  for_each = local.worker_nodes

  endpoint                    = each.value.ip
  node                        = each.value.ip
  client_configuration        = talos_machine_secrets.cluster.client_configuration
  machine_configuration_input = data.talos_machine_configuration.worker[each.key].machine_configuration
  apply_mode                  = "auto"

  timeouts = {
    create = "10m"
    update = "10m"
  }
}

resource "talos_machine_bootstrap" "cluster" {
  depends_on           = [talos_machine_configuration_apply.controlplane]
  endpoint             = local.first_control_plane_ip
  node                 = local.first_control_plane_ip
  client_configuration = talos_machine_secrets.cluster.client_configuration

  timeouts = {
    create = "10m"
  }
}

data "talos_client_configuration" "cluster" {
  cluster_name         = var.cluster_name
  client_configuration = talos_machine_secrets.cluster.client_configuration
  endpoints            = [for node in var.nodes : node.ip]
}

resource "local_sensitive_file" "talosconfig" {
  depends_on      = [talos_machine_bootstrap.cluster]
  content         = data.talos_client_configuration.cluster.talos_config
  filename        = "${path.module}/talosconfig"
  file_permission = "0600"
}

resource "talos_cluster_kubeconfig" "cluster" {
  depends_on = [talos_machine_bootstrap.cluster]

  endpoint             = local.first_control_plane_ip
  node                 = local.first_control_plane_ip
  client_configuration = talos_machine_secrets.cluster.client_configuration

  timeouts = {
    create = "5m"
    read   = "1m"
  }
}
