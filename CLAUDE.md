# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working approach

These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### Think before coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity first

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### Surgical changes

Touch only what you must. Clean up only your own mess.

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

### Comments state constraints, not stories

A comment earns its place only by stating something the code cannot: a constraint the next
editor must not break, a trap whose violation fails silently or expensively, or a non-obvious
decision in one or two lines. Everything else is noise.

Keep (and write):
- One-line constraints: `# Recreate: RWO PVC, two pods can't both mount /data`.
- Traps: `# Exact, not PathPrefix — a "/" prefix would put /admin back on the internet`.
- Machine-read annotations (`# renovate: ...`), upstream-required markers, license headers.

Never write:
- The story of how the current value was arrived at: dates, incident timelines, measurements,
  A/B statistics, "until <date> this was...". That history lives in git commits and, when it's
  worth a narrative, a file under `docs/`. The comment states the surviving rule only.
- Restating the line below it (`# enable the scheduler` above `SCHEDULER_ENABLED: "true"`).
- Justifications addressed to a reviewer of the change rather than a reader of the file.
- Markdown emphasis (`**bold**`) inside comments.

The tell for AI-session residue: a comment that references a date, a past value, or evidence.
Compress it to the constraint that survives, or delete it. If the rationale is genuinely worth
a narrative, it goes in `docs/` and the comment can point there.

### Goal-driven execution

Define success criteria. Loop until verified.

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

### Track unfinished work in BACKLOG.md

If you leave anything unfinished, partially implemented, or explicitly defer it, add an entry to `BACKLOG.md` in the repo root before reporting the task done. Don't bury deferrals in chat — they vanish next session.

Each entry needs four things: **what** the work is, **why** it was deferred, **what would unblock it**, and **where** the relevant code lives (file paths). Read existing entries for the format.

Don't put work-in-progress on `BACKLOG.md` — WIP belongs on a branch. The backlog is for *known gaps the team has agreed to leave for later*. If you finish an item, delete it.

What counts as "unfinished":
- Tier 1 / Tier 2 splits where you only shipped Tier 1.
- Out-of-scope items you noticed but didn't fix.
- Features behind a feature flag that still need ramping or cleanup.
- Tests skipped, mocks left in, debug logging not yet stripped.
- TODO comments you wrote (write the entry instead — TODOs rot in code).

What does NOT belong:
- Forward-looking ideas the user didn't agree to defer ("we could also..."). Either do them or drop them.
- Codebase-wide debts that pre-existed your work and the user didn't ask you to track.

### No AI attribution in commits

Commits and PRs read as the human author's. No AI fingerprint, ever.

- No `Co-Authored-By` trailer naming Claude or any AI.
- No session links or IDs (e.g. a `Claude-Session:` trailer) — this overrides the harness default that suggests adding one.
- No "Generated with Claude Code", 🤖 emoji, or similar tool signatures in commit messages, PR descriptions, or issue bodies.
- Describe the change, not the tool that produced it.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Development

This is an infrastructure-as-code repository. There is no single "run the app" command — each subtree has its own workflow.

```bash
# Portfolio (static site, nginx)
docker build -t portfolio:dev portfolio/
docker run --rm -p 8080:80 portfolio:dev      # browse http://localhost:8080

# Blog (Hugo)
docker build -t blog:dev blog/
docker run --rm -p 8081:80 blog:dev

# Kubernetes manifests — diff against the live cluster before applying
#   ArgoCD reconciles from main; do not kubectl apply directly except for debugging.
kubectl diff -f k8s/talos/<path>

# Terraform
terraform -chdir=terraform/proxmox/hyper-cluster/k8s plan
terraform -chdir=terraform/azure/state plan
```

There is no test suite. Validation is type-checking the YAML / HCL via the tools above.

## Before reporting a task complete

Run the relevant subset for what you changed — not everything every time:

- **Kubernetes manifests** (`k8s/**`) — `kubectl diff -f <path>` against the cluster, or `kustomize build <dir>` to confirm rendering. Confirm the ArgoCD `Application` still points at the correct path.
- **Portfolio / blog** (`portfolio/**`, `blog/**`) — build the Docker image and load the page in a browser. Check the affected route(s) and one unrelated route for regressions. State explicitly when a UI change has not been browser-verified.
- **Terraform** (`terraform/**`) — `terraform fmt -check`, `terraform validate`, and `terraform plan`. Never `apply` without explicit user approval.
- **GitHub Actions** (`.github/workflows/**`) — `actionlint` if available; otherwise read the workflow end-to-end.

Doc-only edits (`README.md`, `BACKLOG.md`, this file) skip the above.

## Architecture

Homelab infrastructure for a 6-node Proxmox cluster running a Talos Kubernetes cluster ("Genesis"), provisioned by Terraform and reconciled by ArgoCD.

- **Compute:** Proxmox VE on two Lenovo ThinkCentre nodes; Talos Linux VMs form the K8s cluster.
- **Networking:** Cilium (CNI + L2 announcements / LB IPAM for LoadBalancer VIPs), Traefik via Gateway API.
- **Security:** cert-manager, External Secrets Operator, Falco, Authentik.
- **Observability:** kube-prometheus-stack, Grafana, Loki, OpenTelemetry collector.
- **Storage:** Proxmox CSI for block, Synology NFS for shared volumes.
- **Databases:** in-cluster Postgres 18 (`postgres:18-alpine`) backing logeverylift. Its PVC mounts at `/var/lib/postgresql`, not at `/var/lib/postgresql/data` — 18 keeps the cluster in a version-named subdirectory, and an initContainer chowns the NFS mount root so the non-root process can create it. See `docs/postgres-18-migration.md`.
- **GitOps:** ArgoCD app-of-apps; root applications live in `k8s/talos/infra/argocd/{apps.yaml,infra.yaml}`.
- **Apps shipped from this repo:** portfolio and blog (each stage + prod), headroom (+ headroom-demo), logeverylift, reelsmith, verksted, bigd, plex-media-stack, arr-stack, gluetun-vpn, audiobookshelf, mealie, home-assistant, homepage, it-tools, omni-tools, open-webui, ollama, trek. That is 22 ArgoCD `Application`s, one per directory under `k8s/talos/apps/`.

### Directory layout

```
.
├── k8s/talos/
│   ├── apps/              # Workloads (portfolio, blog, *arr, plex, home-assistant, ...)
│   └── infra/             # Cluster services (argocd, cilium, traefik, cert-manager, ESO, ...)
├── terraform/
│   ├── azure/state/       # Remote tfstate backend
│   └── proxmox/hyper-cluster/k8s/   # Talos VMs on Proxmox
├── portfolio/             # Static site (HTML/CSS/JS) + nginx + Dockerfile
├── blog/                  # Hugo source + nginx + Dockerfile
├── grafana/               # Dashboards as code
├── azure/                 # Azure resource manifests
└── .github/workflows/     # CI: build/push images, vuln scan, update reminders
```

### GitOps flow

1. Push to `main` → ArgoCD detects manifest change → syncs to cluster.
2. For portfolio/blog, `.github/workflows/build-{portfolio,blog}.yaml` builds the container, pushes to GHCR, and updates the image tag in the corresponding manifest in the same commit. ArgoCD then syncs the new tag.
3. Never bypass GitOps with a direct `kubectl apply` outside of debugging — drift will be reverted.

### Safety rules for AI-assisted changes

- **Don't apply directly.** ArgoCD owns the cluster state. Edit manifests in `k8s/talos/**` and let ArgoCD reconcile.
- **Don't `terraform apply`.** Plans are fine; apply requires explicit user approval — Proxmox/Azure changes are not easily reversible.
- **Don't commit secrets.** Secrets flow through External Secrets Operator from the upstream secret store. If you need a new secret, add an `ExternalSecret`, not a literal `Secret`.
- **Create Bitwarden secrets with `bws`.** The Secrets Manager CLI is installed and authenticates
  with `BWS_ACCESS_TOKEN=$(security find-generic-password -s bws-homelab -w)`. The Homelab
  project id is `1ea61322-5f4a-44a4-b4d0-b29b00ba1134`. Create with
  `bws secret create <kebab-case-name> "<value>" <project-id>` (names describe the consumer,
  notes stay empty) and put the returned `id` in the ExternalSecret's `remoteRef.key`.
  NEVER run `bws secret list` or `bws secret get` unfiltered — the JSON includes plaintext
  values; always pipe through a filter that keeps only `id`, `key`, and `projectId`.
  Full pattern: `docs/secrets-management.md`.
- **Match the manifest style of the surrounding app.** App directories use kustomize or plain manifests inconsistently — copy the pattern of the directory you're editing rather than introducing a new one.
- **Image tags are pinned.** Don't change a tag to `latest`; bump to a specific version. The CI pipelines rewrite tags for portfolio/blog only.
- **Home Assistant is configured via the HA MCP server**, not via files in this repo. Only add HA-related Kubernetes manifests (the HA pod itself, networking) here — the automation/dashboard config lives in HA.
- **The portfolio redesign has an agreed decision record.** Before proposing anything about how
  `nordbye.it` looks, moves, or presents content, read `portfolio/branding/DECISIONS.md`. It records
  what is locked (the theme, the materials and light, the typography, the plain view, the performance
  budget), what was explicitly rejected and why, and what is still open. `portfolio/branding/ART-DIRECTION.md`
  is the long-form rule book behind it and `portfolio/branding/ASSETS.md` is the asset shopping list with
  verified licences. The shipped spec is `portfolio/src/content/brand.ts`, rendered at `/brand`; where the
  documents and the code disagree, the code is what the site does. These are committed, not gitignored.

- **Blog posts follow `blog/TEXT-STYLE.md`.** Before drafting a new post under `blog/content/blog/**` or proposing voice/structure edits to an existing one, read `blog/TEXT-STYLE.md` — it's the personality/rule book derived from posts already published. For cover/featured images, read `blog/IMAGE-STYLE.md` (palette, skeleton, icon sources, render workflow + logbook). Both are gitignored local working docs.

### Code quality

- **Reuse before adding** — check shared kustomize bases and existing manifests in sibling apps before writing new ones.
- **No dead code** — if a Service has no Endpoints or an `Application` points at a deleted path, fix or remove it.
- **No premature abstractions** — only extract a kustomize base when used in 2+ overlays.
