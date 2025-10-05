variable "project" {
  type    = string
  default = "portfolio"
}

variable "location" {
  type    = string
  default = "northeurope"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "context" {
  type    = string
  default = "homelab"
}

variable "image" {
  type    = string
  default = "ghcr.io/mortennordbye/portfolio:latest"
}

variable "container_port" {
  type    = number
  default = 80
}
