# Proxmox Provider Configuration
variable "pm_api_url" {
  description = "Proxmox API URL"
  type        = string
}

variable "pm_api_token_id" {
  description = "Proxmox API Token ID"
  type        = string
  sensitive   = true
}

variable "pm_api_token_secret" {
  description = "Proxmox API Token Secret"
  type        = string
  sensitive   = true
}

# VM Template Configuration
variable "template_name" {
  description = "Name of the cloud-init template to clone"
  type        = string
  default     = "debian13-cloudinit"
}

# Cloud-Init Secrets
variable "ci_user_password" {
  description = "Cloud-init user password"
  type        = string
  sensitive   = true
}

variable "ci_ssh_key" {
  description = "SSH public key for cloud-init user"
  type        = string
  sensitive   = true
}