locals {
  # Simple naming with initials for global uniqueness
  resource_group_name  = "rg-tfstate-homelab"
  storage_account_name = "sttfstatemvnhomelab" # mvn = initials for uniqueness
  container_name       = "tfstate"

  common_tags = {
    ManagedBy = "Terraform"
  }
}
