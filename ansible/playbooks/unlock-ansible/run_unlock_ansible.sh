#!/bin/bash

# Define variables
INVENTORY="inventory.yaml"
PLAYBOOK="main.yml"
USER="mnordbye"
LIMIT="homelab"

# Run the Ansible playbook
ansible-playbook -i "$INVENTORY" "$PLAYBOOK" -u "$USER" -k --limit "$LIMIT"
