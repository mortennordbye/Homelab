output "backend_config" {
  description = "Backend configuration for migration"
  value = {
    resource_group_name  = azurerm_resource_group.homelab.name
    storage_account_name = azurerm_storage_account.tfstate.name
    container_name       = azurerm_storage_container.tfstate.name
    key                  = "core/state-backend.tfstate"
  }
}
