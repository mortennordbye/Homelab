# Input variables for Talos cluster deployment

# Proxmox Connection
variable "proxmox_endpoint" {
  description = "URL of the Proxmox API endpoint"
  type        = string
}

variable "proxmox_api_token" {
  description = "Proxmox API token (format: user@realm!tokenid=secret)"
  type        = string
  sensitive   = true
}

variable "proxmox_insecure" {
  description = "Whether to skip TLS verification for Proxmox API"
  type        = bool
  default     = true
}

variable "proxmox_ssh_username" {
  description = "SSH username for Proxmox host"
  type        = string
  default     = "root"
}

variable "proxmox_ssh_password" {
  description = "SSH password for Proxmox host (leave empty to use SSH agent)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "proxmox_iso_storage" {
  description = "Proxmox storage pool for ISO images"
  type        = string
  default     = "local"
}

# Cluster Configuration
variable "cluster_name" {
  description = "Name of the Talos cluster"
  type        = string
}

variable "cluster_vip" {
  description = "Virtual IP address for the cluster control plane"
  type        = string
}

variable "network_gateway" {
  description = "Network gateway IP address"
  type        = string
}

variable "network_subnet_mask" {
  description = "Network subnet mask"
  type        = string
  default     = "24"
}

variable "talos_version" {
  description = "Talos Linux version"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
}

# Node Configuration
variable "nodes" {
  description = "Configuration for cluster nodes"
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
