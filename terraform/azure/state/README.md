# Azure Terraform State Backend
This Terraform configuration provisions the Azure resources (Resource Group, Storage Account, Container) required for a secure remote state backend.
## Prerequisites

* Terraform ≥ 1.9.0
* Azure CLI
* Active Azure subscription

## Deployment

### 1. Authenticate

```bash
az login
az account set --subscription "<Your-Subscription-ID-or-Name>"
```

### 2. Configure Variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

**Required:** `subscription_id` — your Azure subscription ID

### 3. Deploy

```bash
terraform init
terraform fmt && terraform validate
terraform plan
terraform apply
```

---

## Migrate State to Azure

### 1. Backup

```bash
cp terraform.tfstate terraform.tfstate.backup
```

### 2. Update Backend

Edit `versions.tf`:

```hcl
# backend "local" { path = "terraform.tfstate" }
backend "azurerm" {}
```

### 3. Configure & Migrate

Fill `backend.conf` with values from `terraform output`:

```hcl
resource_group_name  = ""
storage_account_name = ""
container_name       = ""
key                  = ""
```

Then migrate:

```bash
terraform init -migrate-state -backend-config=backend.conf
terraform plan  # should show no changes
```

### 4. Verify Remote State

```bash
rm terraform.tfstate terraform.tfstate.backup
terraform state pull > remote.tfstate
```

---

## Naming Convention

| Resource        | Pattern                             | Example                        |
| --------------- | ----------------------------------- | ------------------------------ |
| Resource Group  | `rg-{env}-{project}-{purpose}-{id}` | `rg-homelab-infra-storage-001` |
| Storage Account | `st{env}{project}{purpose}{id}`     | `sthomelabtf001`               |
| Container       | Descriptive                         | `tfstate`                      |

---

## Tagging

Common tags:

* `Environment`, `Project`, `Owner`, `ManagedBy`, `CostCenter`, `CreatedDate`, `Repository`
  Extra: `Purpose`, `DataType`, `Criticality`

---

## Security

* HTTPS-only access
* TLS ≥ 1.2
* Blob versioning & 30-day soft delete
* Change feed enabled
* Private container
* Shared keys enabled (Terraform required)
* No public blob access
* Resource group deletion lock

---

## Cost Estimate (monthly)

| Item                  | Est. Cost       |
| --------------------- | --------------- |
| Storage Account (LRS) | ~$0.50          |
| Data (50GB)           | ~$1.00          |
| Ops                   | ~$0.10          |
| **Total**             | **$0.60–$2.00** |

Costs vary by file size, ops count, and egress volume.

---

## Variables

| Variable                 | Description           | Default / Example                      |
| ------------------------ | --------------------- | -------------------------------------- |
| `subscription_id`        | Azure subscription ID | `00000000-0000-0000-0000-000000000000` |
| `location`               | Azure region          | `norwayeast`                           |
| `environment`            | Environment name      | `homelab`                              |
| `project_name`           | Project identifier    | `infra`                                |
| `owner`                  | Resource owner        | `mnordbye`                        |
| `blob_retention_days`    | Soft delete retention | `30`                                   |
| `version_retention_days` | Version cleanup       | `90`                                   |

---

## Troubleshooting

| Issue                        | Cause                            | Fix                                               |
| ---------------------------- | -------------------------------- | ------------------------------------------------- |
| **Access denied**            | Auth or role issue               | Re-login, check permissions                       |
| **Name conflict**            | Storage account name taken       | Change `project_name`                             |
| **State lock**               | Locked by another process        | `terraform force-unlock <LOCK_ID>`                |
| **Backend migration failed** | Wrong config or interrupted init | Restore backup, run `terraform init -reconfigure` |

---

## Maintenance

### Update Provider

```bash
terraform init -upgrade
```

### Destroy Resources

```bash
terraform plan -destroy
terraform destroy
rm -rf .terraform/ terraform.tfstate* .terraform.lock.hcl
```

---

## References

* [Terraform Azure Backend](https://developer.hashicorp.com/terraform/language/settings/backends/azurerm)
* [Azure Storage Security](https://learn.microsoft.com/en-us/azure/storage/common/storage-security-guide)
* [Terraform Best Practices](https://www.terraform-best-practices.com/)
* [Azure Naming](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming)

---

**Last Updated:** 2025-11-07
**Terraform:** ≥ 1.9.0 **Azure Provider:** ~> 4.0
