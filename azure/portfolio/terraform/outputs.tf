output "resource_group" { value = azurerm_resource_group.rg.name }
output "aca_env" { value = azurerm_container_app_environment.env.name }
output "aca_app" { value = azurerm_container_app.app.name }
