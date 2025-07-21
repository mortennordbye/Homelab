# Conventional Commits Instructions

When making commits, follow these patterns:

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## Types

- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- style: Changes that don't affect the code's meaning
- refactor: Code change that neither fixes a bug nor adds a feature
- perf: Code change that improves performance
- test: Adding missing tests or correcting existing tests
- chore: Changes to build process or auxiliary tools
- ci: Changes to CI configuration files and scripts

## Scope

Optional, specifies the section of the codebase:

- k8s
- infra
- apps
- docs
- tofu
- monitoring
- network
- storage

## Examples

```
feat(k8s): add new monitoring stack
fix(infra): correct network policy for cilium
docs(monitoring): update architecture diagrams
chore(deps): update helm chart versions
```

## Breaking Changes

Add BREAKING CHANGE: in the footer:

```
feat(k8s): replace nginx ingress with cilium gateway api

BREAKING CHANGE: removes nginx ingress controller in favor of cilium gateway API
```
