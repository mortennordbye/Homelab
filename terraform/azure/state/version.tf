terraform {
  required_version = ">= 1.9.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  # Stage 1: Use local backend to bootstrap Azure storage resources
  backend "local" {
    path = "terraform.tfstate"
  }

  # Stage 2: After storage resources are created, comment out 'local' backend above,
  # uncomment this block, and run: terraform init -migrate-state -backend-config=backend.conf
  #backend "azurerm" {}
}
