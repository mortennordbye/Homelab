# My Homelab: A GitOps-Powered Infrastructure

Welcome to my homelab repository! This is the central hub for my entire home infrastructure, managed as code. This project showcases a modern, cloud-native approach to self-hosting, leveraging enterprise-grade tools and practices. It serves as a testament to my skills in automation, containerization, orchestration, and CI/CD.

## Key Features

*   **Fully Automated with GitOps:** The entire state of the Kubernetes cluster is defined in this repository and managed by ArgoCD. Any change to the Git repository is automatically reflected in the cluster.
*   **Infrastructure as Code (IaC):** Servers are provisioned and configured using Ansible, ensuring consistency and repeatability.
*   **High-Availability Kubernetes Cluster:** A 3-master, 3-worker k3s cluster provides a resilient platform for applications.
*   **Secure Secret Management:** External Secrets Operator integrates with Bitwarden to securely manage secrets without storing them in Git.
*   **Automated CI/CD:** GitHub Actions are used to validate and deploy changes to the ArgoCD control plane.
*   **Comprehensive Monitoring:** The `kube-prometheus-stack` provides in-depth monitoring and alerting for the cluster and applications.
*   **Automatic DNS Management:** The `bind_zone_manager` Ansible role automates DNS zone file updates.
*   **Containerized Services:** Both Kubernetes and Docker Compose are used to run a variety of self-hosted services.

## Architecture

The homelab is built on a Proxmox VE server, with virtual machines running Ubuntu Server. The core of the application platform is a k3s Kubernetes cluster, but some services also run in Docker on dedicated VMs.

### High-Level Overview

```
+-----------------------------------------------------------------+
|                                                                 |
|                            Proxmox VE                           |
|                                                                 |
+-----------------------------------------------------------------+
|                                                                 |
|  +-----------------+  +-----------------+  +-----------------+  |
|  |   k3s Master 1  |  |   k3s Master 2  |  |   k3s Master 3  |  |
|  +-----------------+  +-----------------+  +-----------------+  |
|                                                                 |
|  +-----------------+  +-----------------+  +-----------------+  |
|  |   k3s Worker 1  |  |   k3s Worker 2  |  |   k3s Worker 3  |  |
|  +-----------------+  +-----------------+  +-----------------+  |
|                                                                 |
|  +-----------------+                                            |
|  |  Docker Host VM |                                            |
|  +-----------------+                                            |
|                                                                 |
+-----------------------------------------------------------------+
```

### GitOps Workflow

The Kubernetes cluster is managed entirely through a GitOps workflow with ArgoCD.

```
+----------+     +----------------+     +----------------+     +----------+
|          |     |                |     |                |     |          |
| Developer|---->|   Git Push     |---->|  GitHub Actions|---->|  ArgoCD  |
|          |     | (This Repo)    |     | (Apply CRDs)   |     |          |
+----------+     +----------------+     +----------------+     +----------+
                                                                    |
                                                                    |
                                                                    v
                                                         +-------------------+
                                                         |                   |
                                                         |   k3s Cluster     |
                                                         | (Syncs with Git)  |
                                                         |                   |
                                                         +-------------------+
```

1.  **Commit & Push:** I make changes to the Kubernetes manifests, Helm values, or ArgoCD applications in this repository.
2.  **CI Pipeline:** A GitHub Actions workflow is triggered on push, which applies the ArgoCD `Application` and `ApplicationSet` resources to the cluster.
3.  **ArgoCD Sync:** ArgoCD detects the changes and syncs the state of the cluster to match the Git repository. This includes deploying Helm charts, applying manifests, and ensuring all resources are in the desired state.
4.  **Self-Healing:** ArgoCD continuously monitors the cluster for any manual changes or "drift" and automatically reverts them to the state defined in Git.

## Technologies Used

This project utilizes a wide range of technologies:

*   **Virtualization:** Proxmox VE
*   **Operating System:** Ubuntu Server
*   **Configuration Management:** Ansible
*   **Containerization:** Docker, Docker Compose
*   **Orchestration:** k3s (a lightweight Kubernetes distribution)
*   **GitOps:** ArgoCD
*   **CI/CD:** GitHub Actions
*   **Ingress & Networking:** Traefik, MetalLB
*   **Service Mesh:** (Not currently implemented, but a future goal)
*   **Monitoring & Alerting:** Prometheus, Grafana, Alertmanager, Gatus
*   **Log Management:** (Not currently implemented)
*   **Security:** Cert-Manager (for TLS certificates), External Secrets Operator
*   **Secrets Backend:** Bitwarden
*   **DNS:** BIND9 (managed by Ansible)
*   **Applications:** Home Assistant, Nginx Proxy Manager, Portainer, Plex, Servarr stack, OwnCloud, and many more.

## Repository Structure

*   `ansible/`: Contains Ansible playbooks and roles for server configuration.
    *   `playbooks/`: High-level playbooks for tasks like bootstrapping servers.
    *   `roles/`: Reusable Ansible roles for specific configurations.
*   `containers/`: Docker Compose configurations for services running outside of Kubernetes.
*   `k8s/`: All Kubernetes-related configurations.
    *   `argo/`: ArgoCD `Application` and `ApplicationSet` definitions.
    *   `clusters/k3sa/`: Cluster-specific configurations.
        *   `helm-values/`: Overrides for Helm charts.
        *   `manifests/`: Raw Kubernetes manifests.

## How to Replicate

While this repository is tailored to my specific hardware and needs, it can be adapted for your own homelab. You would need:

1.  A server capable of running Proxmox VE.
2.  A domain name for your services.
3.  A Bitwarden instance for secret management.
4.  A GitHub account for the GitOps workflow.

The general steps would be:

1.  Fork this repository.
2.  Set up your Proxmox server and create virtual machines.
3.  Use the Ansible playbooks to configure your VMs.
4.  Install k3s on your cluster nodes.
5.  Install ArgoCD in your cluster.
6.  Configure the ArgoCD applications in `k8s/argo/` to point to your forked repository.
7.  Set up GitHub Actions secrets to allow the CI pipeline to connect to your cluster.

## Disclaimer

This is a personal project and is under continuous development. While I strive for best practices, some configurations may be specific to my environment.

## License

This project is licensed under the Apache-2.0 license  License. See the `LICENSE` file for details.
