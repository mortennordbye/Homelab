terraform {
  required_version = ">= 1.9.0"

  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = "0.111.1"
    }
    tailscale = {
      source  = "tailscale/tailscale"
      version = "~> 0.29"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-tfstate-homelab"
    storage_account_name = "sttfstatemvnhomelab"
    container_name       = "tfstate"
    key                  = "proxmox/hyper-cluster/tailscale.tfstate"
  }
}
