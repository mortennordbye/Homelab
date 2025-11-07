# Resource Group
resource "azurerm_resource_group" "homelab" {
  name     = local.resource_group_name
  location = var.location

  tags = merge(local.common_tags, {
    Purpose = "Terraform State Storage"
  })

  lifecycle {
    ignore_changes = [tags["UpdatedDate"]]
  }
}

# Storage Account for Terraform State
resource "azurerm_storage_account" "tfstate" {
  name                     = local.storage_account_name
  resource_group_name      = azurerm_resource_group.homelab.name
  location                 = azurerm_resource_group.homelab.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  # Security settings
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  public_network_access_enabled   = true

  # Blob properties
  blob_properties {
    versioning_enabled       = true
    change_feed_enabled      = true
    last_access_time_enabled = true

    container_delete_retention_policy {
      days = var.blob_retention_days
    }

    delete_retention_policy {
      days = var.blob_retention_days
    }
  }

  tags = merge(local.common_tags, {
    Purpose = "Terraform State Backend"
  })

  lifecycle {
    ignore_changes = [tags["UpdatedDate"]]
  }
}

# Storage Container for Terraform State
resource "azurerm_storage_container" "tfstate" {
  name                  = local.container_name
  storage_account_id    = azurerm_storage_account.tfstate.id
  container_access_type = "private"
}

# Storage Management Policy for lifecycle management
resource "azurerm_storage_management_policy" "tfstate" {
  storage_account_id = azurerm_storage_account.tfstate.id

  rule {
    name    = "deleteOldVersions"
    enabled = true

    filters {
      prefix_match = ["tfstate/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      version {
        delete_after_days_since_creation = var.version_retention_days
      }
    }
  }
}
