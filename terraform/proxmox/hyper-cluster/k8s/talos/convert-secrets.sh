#!/bin/bash

# Convert Terraform machine_secrets to talosctl-compatible format
# Usage: ./convert-secrets.sh > machine-secrets.yaml

set -e

# Get terraform output as JSON
SECRETS=$(terraform output -json talos_secrets)

# Extract values from JSON
ETCD_CERT=$(echo "$SECRETS" | jq -r '.certs.etcd.cert')
ETCD_KEY=$(echo "$SECRETS" | jq -r '.certs.etcd.key')
K8S_CERT=$(echo "$SECRETS" | jq -r '.certs.k8s.cert')
K8S_KEY=$(echo "$SECRETS" | jq -r '.certs.k8s.key')
K8S_AGG_CERT=$(echo "$SECRETS" | jq -r '.certs.k8s_aggregator.cert')
K8S_AGG_KEY=$(echo "$SECRETS" | jq -r '.certs.k8s_aggregator.key')
K8S_SA_KEY=$(echo "$SECRETS" | jq -r '.certs.k8s_serviceaccount.key')
OS_CERT=$(echo "$SECRETS" | jq -r '.certs.os.cert')
OS_KEY=$(echo "$SECRETS" | jq -r '.certs.os.key')
CLUSTER_ID=$(echo "$SECRETS" | jq -r '.cluster.id')
CLUSTER_SECRET=$(echo "$SECRETS" | jq -r '.cluster.secret')
BOOTSTRAP_TOKEN=$(echo "$SECRETS" | jq -r '.secrets.bootstrap_token')
SECRETBOX_SECRET=$(echo "$SECRETS" | jq -r '.secrets.secretbox_encryption_secret')
TRUSTD_TOKEN=$(echo "$SECRETS" | jq -r '.trustdinfo.token')

# Generate YAML output with lowercase field names and base64-encoded certificates
cat <<EOF
cluster:
    id: $CLUSTER_ID
    secret: $CLUSTER_SECRET
secrets:
    bootstraptoken: $BOOTSTRAP_TOKEN
    secretboxencryptionsecret: $SECRETBOX_SECRET
trustdinfo:
    token: $TRUSTD_TOKEN
certs:
    etcd:
        crt: $ETCD_CERT
        key: $ETCD_KEY
    k8s:
        crt: $K8S_CERT
        key: $K8S_KEY
    k8saggregator:
        crt: $K8S_AGG_CERT
        key: $K8S_AGG_KEY
    k8sserviceaccount:
        key: $K8S_SA_KEY
    os:
        crt: $OS_CERT
        key: $OS_KEY
EOF
