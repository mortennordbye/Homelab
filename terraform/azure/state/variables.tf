variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
  sensitive   = true
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "swedencentral" # Closest to Norway with low latency and competitive pricing
}

variable "blob_retention_days" {
  description = "Number of days to retain deleted blobs"
  type        = number
  default     = 7
}

variable "version_retention_days" {
  description = "Number of days to retain old blob versions"
  type        = number
  default     = 30
}
