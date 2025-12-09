# Azure Terraform State Backend

Bootstrap process to create Azure Storage for Terraform state, then migrate the state into itself.

## Prerequisites

- Terraform >= 1.9.0
- Azure CLI
- Azure subscription

## Stage 1: Create Storage

```bash
az login
az account set --subscription "xxxxxxxx"
terraform init
terraform plan
terraform apply
```

## Stage 2: Migrate to Remote State

Edit `version.tf` - comment out local backend, uncomment azurerm backend.

```bash
cp terraform.tfstate terraform.tfstate.backup
terraform init -migrate-state -backend-config=backend.conf
terraform plan  # Should show no changes
```

## Stage 3: Use in Other Projects

Add to your Terraform projects:

```terraform
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-tfstate-homelab"
    storage_account_name = "sttfstatemvn001"
    container_name       = "tfstate"
    key                  = "workloads/myproject/terraform.tfstate"
  }
}
```

State file paths:

- `critical/do-not-delete-state-backend.tfstate` - This backend (DO NOT DELETE)
- `proxmox/*` - Proxmox resources

## Resources Created

- Resource Group: `rg-tfstate-homelab` (Sweden Central)
- Storage Account: `sttfstatemvn001` (LRS, versioning enabled)
- Container: `tfstate` (private)
- Lifecycle: Delete versions after 7 days

## Verify

```bash
az storage blob list --account-name sttfstatemvn001 --container-name tfstate --output table
terraform state pull
```
