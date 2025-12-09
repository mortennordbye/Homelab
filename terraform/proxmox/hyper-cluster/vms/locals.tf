# Local values for common VM configurations
locals {
  # Common VM defaults
  common_vm_config = {
    qemu_agent           = 1
    cpu_type             = "host"
    boot_order           = "order=scsi0"
    scsi_controller_type = "virtio-scsi-single"
    network_bridge       = "vmbr0"
    network_model        = "virtio"
    disk_storage         = "nfs-vmstore"
    disk_format          = "qcow2"
    full_clone           = true
    on_boot              = true
    automatic_reboot     = true
    tags                 = "homelab"
  }

  # Cloud-Init defaults
  cloudinit_defaults = {
    upgrade       = true
    nameserver    = "10.3.10.1"
    searchdomain  = "local.bigd.no"
    skip_ipv6     = true
    user          = "mnordbye"
    custom_vendor = "vendor=nfs-vmstore:snippets/qemu-guest-agent.yml"
  }

  # Network configuration
  network = {
    gateway = "10.3.10.1"
    netmask = "24"
  }
}
