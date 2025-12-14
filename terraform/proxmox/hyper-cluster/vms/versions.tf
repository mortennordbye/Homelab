terraform {
  required_version = ">= 1.13.0"

  required_providers {
    proxmox = {
      source  = "Telmate/proxmox"
      version = "3.0.2-rc06"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-tfstate-homelab"
    storage_account_name = "sttfstatemvnhomelab"
    container_name       = "tfstate"
    key                  = "proxmox/hyper-cluster/vms.tfstate"
  }
}

provider "proxmox" {
  pm_api_url          = var.pm_api_url
  pm_api_token_id     = var.pm_api_token_id
  pm_api_token_secret = var.pm_api_token_secret
  pm_tls_insecure     = true
}
