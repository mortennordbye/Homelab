# Azure Storage Account - Homelab Terraform

Terraform configuration to create an Azure Storage Account for hosting remote state files.

## Quick Start

### Prerequisites

- [Terraform](https://www.terraform.io/downloads) >= 1.9.0
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed and configured
- An active Azure subscription

### Step 1: Authentication

```bash
# Login to Azure
az login

# Set your subscription (if you have multiple)
az account set --subscription "Your Subscription Name"

# Verify your subscription
az account show
```

### Step 2: Configure Variables

```bash
# Copy the example file
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
nano terraform.tfvars
```

**Required variables:**

- `subscription_id` - Your Azure subscription ID

### Step 3: Deploy

```bash
# Initialize Terraform (downloads providers)
terraform init

# Validate configuration
terraform fmt && terraform validate

# Preview changes
terraform plan

# Apply configuration
terraform apply
```

### Step 4: Verify Deployment

```bash
# View outputs
terraform output

# View sensitive outputs (access key)
terraform output -json storage_account_primary_access_key

# Save all outputs to file
terraform output -json > outputs.json
```

## 🔄 Migrating to Azure Backend

After initial deployment, migrate your state file to Azure:

### Step 1: Backup Local State

```bash
cp terraform.tfstate terraform.tfstate.backup
```

### Step 2: Update versions.tf

In `version.tf`, comment out the `local` backend and uncomment the `azurerm` backend block.

```hcl
# backend "local" {
#   path = "terraform.tfstate"
# }

backend "azurerm" {
  # Configuration will be provided via backend.conf
}
```

### Step 3: Migrate State

First, ensure your `backend.conf` file is populated with the correct resource names from the `terraform output` of the previous step.

**backend.conf:**

```hcl
resource_group_name  = ""
storage_account_name = ""
container_name       = ""
key                  = ""
```

Now, run `terraform init` with the `-backend-config` flag. Terraform will detect the backend change and prompt you to migrate the state.

```bash
# Re-initialize with migration
terraform init -migrate-state -backend-config=backend.conf

# Verify migration
terraform plan  # Should show no changes
```

### Step 4: Test Remote State

```bash
# Remove local state file
rm terraform.tfstate terraform.tfstate.backup

# Pull state from remote
terraform state pull > remote.tfstate
```

## 📊 Resource Naming Convention

This configuration uses Azure best practices for naming:

| Resource Type   | Pattern                                   | Example                        |
| --------------- | ----------------------------------------- | ------------------------------ |
| Resource Group  | `rg-{env}-{project}-{purpose}-{instance}` | `rg-homelab-infra-storage-001` |
| Storage Account | `st{env}{project}{purpose}{instance}`     | `sthomelabtf001`               |
| Container       | Descriptive name                          | `tfstate`                      |

## 🏷️ Tagging Strategy

All resources are tagged with:

- `Environment` - homelab, dev, staging, prod
- `Project` - Project identifier
- `Owner` - Resource owner
- `ManagedBy` - Terraform
- `CostCenter` - Homelab
- `CreatedDate` - Creation timestamp
- `Repository` - homelab-terraform

Plus resource-specific tags:

- `Purpose` - Resource purpose
- `DataType` - Type of data stored
- `Criticality` - Importance level

## 🔐 Security Features

✅ **Network Security**

- HTTPS-only traffic enforcement

✅ **Data Protection**

- TLS 1.2 minimum encryption
- Blob versioning enabled
- Soft delete (30-day retention)
- Change feed for audit trail
- Private container access

✅ **Access Control**

- Shared access keys enabled (required for Terraform)
- No public blob access
- Resource group deletion protection

## 💰 Cost Estimation

**Monthly costs (approximate):**

- Storage Account (LRS, Standard): ~$0.50
- Storage capacity (first 50GB): ~$1.00/50GB
- Operations: ~$0.10

**Total estimated cost: $0.60 - $2.00/month**

Factors affecting cost:

- Amount of state file storage
- Number of state operations
- Data egress (usually minimal)

## 🔧 Configuration Variables

### Required Variables

| Variable          | Description           | Example                                |
| ----------------- | --------------------- | -------------------------------------- |
| `subscription_id` | Azure subscription ID | `00000000-0000-0000-0000-000000000000` |

### Optional Variables

| Variable                 | Description           | Default         |
| ------------------------ | --------------------- | --------------- |
| `location`               | Azure region          | `norwayeast`    |
| `environment`            | Environment name      | `homelab`       |
| `project_name`           | Project identifier    | `infra`         |
| `owner`                  | Resource owner        | `homelab-admin` |
| `blob_retention_days`    | Soft delete retention | `30`            |
| `version_retention_days` | Version cleanup       | `90`            |

## 📝 Common Commands

```bash
# Format code
terraform fmt -recursive

# Validate configuration
terraform validate

# Plan changes
terraform plan

# Apply changes
terraform apply

# Destroy resources (careful!)
terraform destroy

# Show current state
terraform show

# List resources
terraform state list

# View specific resource
terraform state show azurerm_storage_account.tfstate
```

## 🔍 Troubleshooting

### Issue: Access Denied

### Issue: Storage Account Name Conflict

**Problem:** Storage account name already exists globally

**Solution:**

```bash
# Update project_name in terraform.tfvars
# Storage account names must be globally unique
```

### Issue: State Lock Error

**Problem:** State file is locked

**Solution:**

```bash
# Force unlock (only if you're sure no other process is running)
terraform force-unlock <LOCK_ID>
```

### Issue: Backend Migration Failed

**Problem:** Can't migrate to Azure backend

**Solution:**

```bash
# Restore from backup
cp terraform.tfstate.backup terraform.tfstate

# Re-configure backend
terraform init -reconfigure
```

## 🔄 Updating Configuration

### Update Azure Provider Version

```bash
# Update version in versions.tf
# Then run:
terraform init -upgrade
```

### Update IP Allowlist

```bash
# Edit terraform.tfvars
# Add new IP to allowed_ip_addresses

# Apply changes
terraform apply
```

### Change Retention Periods

```bash
# Edit terraform.tfvars
# Update blob_retention_days or version_retention_days

# Apply changes
terraform apply
```

## 🗑️ Cleanup

To remove all resources:

```bash
# Preview destruction
terraform plan -destroy

# Destroy resources
terraform destroy

# Remove Terraform files
rm -rf .terraform/
rm terraform.tfstate*
rm .terraform.lock.hcl
```

## 📚 Additional Resources

- [Terraform Azure Backend Documentation](https://developer.hashicorp.com/terraform/language/settings/backends/azurerm)
- [Azure Storage Security Best Practices](https://learn.microsoft.com/en-us/azure/storage/common/storage-security-guide)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)
- [Azure Naming Conventions](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming)

## 🤝 Contributing

This is a homelab project, but feel free to adapt it for your needs:

1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit improvements

## 📄 License

This configuration is provided as-is for homelab use.

## 🆘 Support

- Check Azure status: https://status.azure.com
- Terraform documentation: https://www.terraform.io/docs
- Azure CLI reference: https://docs.microsoft.com/en-us/cli/azure/

---

**Last Updated:** 2025-11-07
**Terraform Version:** >= 1.9.0
**Azure Provider:** ~> 4.0
