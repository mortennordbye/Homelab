variable "proxmox_endpoint" {
  description = "Proxmox API URL"
  type        = string
}

variable "proxmox_api_token" {
  description = "API token (user@realm!tokenid=secret)"
  type        = string
  sensitive   = true
}

variable "proxmox_insecure" {
  description = "Skip TLS verification"
  type        = bool
  default     = true
}

variable "proxmox_ssh_username" {
  description = "SSH username"
  type        = string
  default     = "root"
}

variable "proxmox_ssh_password" {
  description = "SSH password (empty = use agent)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "proxmox_iso_storage" {
  description = "ISO storage pool"
  type        = string
  default     = "local"
}

variable "cluster_name" {
  description = "Cluster name"
  type        = string
}

variable "cluster_vip" {
  description = "Control plane VIP"
  type        = string
}

variable "network_gateway" {
  description = "Gateway IP"
  type        = string
}

variable "network_subnet_mask" {
  description = "Subnet mask"
  type        = string
  default     = "24"
}

variable "talos_version" {
  description = "Talos version"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
}

variable "nodes" {
  description = "Node configuration"
  type = map(object({
    proxmox_node = string
    ip           = string
    mac_address  = string
    vmid         = number
    cpu_cores    = number
    memory_mb    = number
    disk_size_gb = number
    datastore    = string
    node_type    = string
  }))
}

variable "enable_talos_upgrade" {
  description = "Enable Talos upgrade"
  type        = bool
  default     = false
}

variable "enable_kubernetes_upgrade" {
  description = "Enable Kubernetes upgrade"
  type        = bool
  default     = false
}
