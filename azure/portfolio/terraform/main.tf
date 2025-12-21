locals {
  rg_name  = "rg-${var.project}-${var.environment}"
  law_name = "log-${var.project}-${var.environment}"
  env_name = "cae-${var.project}-${var.environment}"
  app_name = "ca-${var.project}-web"

  tags = {
    environment = var.environment
    context     = var.context
    source      = "terraform"
    project     = var.project
  }
}

resource "azurerm_resource_group" "rg" {
  name     = local.rg_name
  location = var.location
  tags     = local.tags
}

resource "azurerm_container_app_environment" "env" {
  name                       = local.env_name
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  tags                       = local.tags
}

resource "azurerm_container_app" "app" {
  name                         = "ca-${var.project}-web"
  resource_group_name          = azurerm_resource_group.rg.name
  container_app_environment_id = azurerm_container_app_environment.env.id
  revision_mode                = "Single"
  tags                         = local.tags

  template {
    min_replicas                     = 1
    max_replicas                     = 2
    termination_grace_period_seconds = 15

    container {
      name   = "web"
      image  = var.image # e.g. ghcr.io/mortennordbye/portfolio:latest
      cpu    = 0.25
      memory = "0.5Gi"

      # Writable scratch for nginx temp files (equivalent to k8s emptyDir)
      volume_mounts {
        name = "nginx-cache"
        path = "/var/cache/nginx"
      }

      readiness_probe {
        transport               = "HTTP"
        port                    = var.container_port # 8080
        path                    = "/healthz"
        initial_delay           = 2
        interval_seconds        = 10
        timeout                 = 3
        failure_count_threshold = 3
        success_count_threshold = 1
      }

      liveness_probe {
        transport               = "HTTP"
        port                    = var.container_port
        path                    = "/healthz"
        initial_delay           = 10
        interval_seconds        = 15
        timeout                 = 3
        failure_count_threshold = 3
      }
    }

    # Define the EmptyDir volume
    volume {
      name         = "nginx-cache"
      storage_type = "EmptyDir"
    }
  }

  ingress {
    external_enabled = true
    target_port      = var.container_port # 8080
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }
}

output "containerapp_default_fqdn" {
  value = azurerm_container_app.app.ingress[0].fqdn
}
