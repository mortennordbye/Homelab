provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }

  use_cli         = true
  subscription_id = var.subscription_id

}
