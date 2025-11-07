output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.homelab.name
}

output "resource_group_id" {
  description = "ID of the resource group"
  value       = azurerm_resource_group.homelab.id
}

output "storage_account_name" {
  description = "Name of the storage account"
  value       = azurerm_storage_account.tfstate.name
}

output "storage_account_id" {
  description = "ID of the storage account"
  value       = azurerm_storage_account.tfstate.id
}

output "storage_account_primary_access_key" {
  description = "Primary access key for storage account"
  value       = azurerm_storage_account.tfstate.primary_access_key
  sensitive   = true
}

output "storage_account_primary_connection_string" {
  description = "Primary connection string for storage account"
  value       = azurerm_storage_account.tfstate.primary_connection_string
  sensitive   = true
}

output "storage_container_name" {
  description = "Name of the storage container"
  value       = azurerm_storage_container.tfstate.name
}

output "storage_container_id" {
  description = "ID of the storage container"
  value       = azurerm_storage_container.tfstate.id
}

output "backend_config" {
  description = "Backend configuration for migration to Azure backend"
  value = {
    resource_group_name  = azurerm_resource_group.homelab.name
    storage_account_name = azurerm_storage_account.tfstate.name
    container_name       = azurerm_storage_container.tfstate.name
    key                  = "terraform.tfstate"
  }
}

output "migration_instructions" {
  description = "Instructions for migrating to Azure backend"
  value       = <<-EOT
    To migrate from local backend to Azure backend:

    1. Backup your local state:
       cp terraform.tfstate terraform.tfstate.backup

    2. Update versions.tf to use azurerm backend (uncomment the backend block)

    3. Run migration:
       terraform init -migrate-state

    Backend Configuration:
    resource_group_name  = "${azurerm_resource_group.homelab.name}"
    storage_account_name = "${azurerm_storage_account.tfstate.name}"
    container_name       = "${azurerm_storage_container.tfstate.name}"
    key                  = "terraform.tfstate"
  EOT
}
