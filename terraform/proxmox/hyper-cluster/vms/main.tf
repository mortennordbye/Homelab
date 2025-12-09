# Proxmox VM configurations for homelab
# VMs use cloud-init for initial configuration

resource "proxmox_vm_qemu" "adguard" {
  vmid        = 125
  name        = "adguard"
  target_node = "hyper1"
  agent       = local.common_vm_config.qemu_agent

  cpu {
    cores   = 1
    sockets = 1
    type    = local.common_vm_config.cpu_type
  }

  memory           = 1048
  boot             = local.common_vm_config.boot_order
  clone            = var.template_name
  full_clone       = local.common_vm_config.full_clone
  scsihw           = local.common_vm_config.scsi_controller_type
  vm_state         = "running"
  automatic_reboot = local.common_vm_config.automatic_reboot
  onboot           = local.common_vm_config.on_boot
  tags             = local.common_vm_config.tags

  # Cloud-Init configuration
  cicustom     = local.cloudinit_defaults.custom_vendor
  ciupgrade    = local.cloudinit_defaults.upgrade
  nameserver   = local.cloudinit_defaults.nameserver
  searchdomain = local.cloudinit_defaults.searchdomain
  ipconfig0    = "ip=10.3.10.25/${local.network.netmask},gw=${local.network.gateway}"
  skip_ipv6    = local.cloudinit_defaults.skip_ipv6
  ciuser       = local.cloudinit_defaults.user
  cipassword   = var.ci_user_password
  sshkeys      = var.ci_ssh_key

  serial {
    id = 0
  }

  disks {
    scsi {
      scsi0 {
        disk {
          storage = local.common_vm_config.disk_storage
          size    = "10G"
          format  = local.common_vm_config.disk_format
        }
      }
    }
    ide {
      ide1 {
        cloudinit {
          storage = local.common_vm_config.disk_storage
        }
      }
    }
  }

  network {
    id     = 0
    bridge = local.common_vm_config.network_bridge
    model  = local.common_vm_config.network_model
  }
}
