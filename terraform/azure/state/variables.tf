variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
  sensitive   = true
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "northeurope"

  validation {
    condition     = can(regex("^[a-z]+$", var.location))
    error_message = "Location must be a valid Azure region name in lowercase."
  }
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "homelab"

  validation {
    condition     = contains(["homelab", "dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: homelab, dev, staging, prod."
  }
}

variable "project_name" {
  description = "Project identifier"
  type        = string
  default     = "infra"

  validation {
    condition     = can(regex("^[a-z0-9]{2,10}$", var.project_name))
    error_message = "Project name must be 2-10 characters, lowercase alphanumeric only."
  }
}

variable "owner" {
  description = "Resource owner"
  type        = string
  default     = "mnordbye"
}

variable "cost_center" {
  type        = string
  description = "The cost center associated with the resources for billing and tracking."
  default     = "Homelab"
}

variable "repository" {
  type        = string
  description = "The source code repository where the Terraform configuration is stored."
  default     = "Homelab"
}

variable "blob_retention_days" {
  description = "Number of days to retain deleted blobs"
  type        = number
  default     = 10

  validation {
    condition     = var.blob_retention_days >= 1 && var.blob_retention_days <= 365
    error_message = "Blob retention days must be between 1 and 365."
  }
}

variable "version_retention_days" {
  description = "Number of days to retain old blob versions"
  type        = number
  default     = 30

  validation {
    condition     = var.version_retention_days >= 1 && var.version_retention_days <= 365
    error_message = "Version retention days must be between 1 and 365."
  }
}
