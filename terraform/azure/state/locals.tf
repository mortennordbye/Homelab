locals {
  # Standardized naming convention: {type}-{env}-{project}-{purpose}-{instance}
  # Example: rg-homelab-infra-storage-001
  base_name = "${var.environment}-${var.project_name}"

  # Common tags to be applied to all resources
  common_tags = {
    Owner       = var.owner
    Environment = var.environment
    Project     = var.project_name
    CostCenter  = var.cost_center
    Repository  = var.repository
    ManagedBy   = "Terraform"
    UpdatedDate = timestamp()
  }

  resource_group_name  = "rg-${local.base_name}-storage-001"
  storage_account_name = "st${replace(local.base_name, "-", "")}tf001" # Storage accounts have stricter naming rules
  container_name       = "tfstate"
}
