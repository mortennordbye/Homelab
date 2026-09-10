import {
  certSchema,
  educationSchema,
  experienceSchema,
  type Cert,
  type Education,
  type Experience,
} from "./schemas";

const certsRaw: Cert[] = [
  {
    title: "Microsoft Certified: DevOps Engineer Expert",
    issuer: "Microsoft",
    date: "Sep 2026",
    credentialId: "F8616ED44F1AA2F4",
  },
  {
    title: "GitHub Actions Certification",
    issuer: "GitHub (Microsoft)",
    date: "Jul 2026",
    credentialId: "90FCBE7771D404BA",
  },
  {
    title: "Microsoft Certified: Azure Solutions Architect Expert",
    issuer: "Microsoft",
    date: "Feb 2026",
    credentialId: "1F5A74303E8DEC46",
  },
  {
    title: "Microsoft Certified: Azure Administrator Associate",
    issuer: "Microsoft",
    date: "Jan 2026",
    credentialId: "9AC5167520292789",
  },
  {
    title: "CKA: Certified Kubernetes Administrator",
    issuer: "The Linux Foundation",
    date: "Jan 2024",
    href: "/pdf/CKA.pdf",
  },
  {
    title: "LFS458: Kubernetes Administration",
    issuer: "The Linux Foundation",
    date: "Jan 2024",
    href: "/pdf/LFS458.pdf",
  },
  {
    title: "AWS Certified Cloud Practitioner",
    issuer: "Amazon Web Services",
    date: "Sep 2021",
  },
];

const educationRaw: Education[] = [
  {
    title: "Trade Certificate — Skilled ICT Service Operator",
    institution: "Royal Norwegian Ministry of Education & Research",
    period: "Issued Aug 2023",
    detail:
      "Apprenticeship hosted by Basefarm / Orange Business. Two-year programme culminating in nationally recognised trade certificate. Passed with distinction.",
  },
  {
    title: "ICT Service Operator (vocational)",
    institution: "Kuben High School, Oslo",
    period: "2020 — 2021",
    detail:
      "Year-long programme covering ICT service fundamentals — troubleshooting, user communication, and maintaining IT systems and services. Hands-on work with Linux and Windows servers in real-world scenarios.",
  },
  {
    title: "Vocational Education in Electrical Studies",
    institution: "Ullern High School, Oslo",
    period: "2019 — 2020",
    detail:
      "Year-long programme in electrical engineering fundamentals. Built and analysed circuits, deepening the foundational hardware knowledge that informs my infrastructure work today.",
  },
];

const experienceRaw: Experience[] = [
  {
    role: "Cloud Engineer",
    company: "Orange Business",
    location: "Oslo",
    period: "Jan 2026 — Present",
    current: true,
    description: [
      "Cloud engineer in Orange's engagement team, placed onto customer accounts under a consultancy delivery model. Currently on two engagements in parallel, a betting-platform customer's Azure migration and an internal Orange department's Azure platform I architect solo.",
      "On the betting-platform engagement, took over architect responsibility on the Orange side in April 2026 when the previous architect exited; all technical decisions on the account now go through me. Did the bulk of the Terraform module work across the platform (AKS, vWAN, Front Door, ACR, Log Analytics, Managed Grafana, ArgoCD core services), rewriting large parts as the architecture evolved, and built the observability stack from scratch with production alerts in Terraform against the AMBA baseline. Executed the service-by-service migration of roughly 30 microservices from Orange-hosted Windows Server and .NET onto AKS, with peaks above 33 million requests per day on betting days.",
      "Drove the post-migration architecture, including the ServiceBus migration into the customer's new subscription, policy-as-code rollout via EPAC, and a cold-redeploy DR plan for Azure region failure with runbooks for first-line. Also worked alongside the customer's team to stabilise production after migration, where a recurring .NET thread-pool starvation pattern was surfaced via observability, reproduced in a replication harness built from the customer's components, and resolved through an async refactor led by the customer's developers.",
      "During the migration, the betting-platform customer was moved off NGINX Ingress Controller onto Traefik with Gateway API. Serving multiple TLS certificates on a single listener required a hack (one listener name per cert), so I contributed the upstream patch that taught Gateway API to resolve multiple cert secrets on one listener natively. Merged and released in Traefik v3.7.0.",
      "For the internal Orange department, designed and delivered the Azure platform under their IAM and Microsoft 365 automation app, covering the WAF Application Landing Zone subscription layout, ACR and Container Apps for hosting, Azure DNS, and the GitHub repository with Terraform pipelines so the receiving team runs it themselves.",
      "Daily stack: Azure (AKS, vWAN, Front Door, Key Vault, ACR, AMW, LAW, Managed Grafana), Terraform, ArgoCD, Helm, Kustomize, External Secrets Operator, cert-manager, OpenTelemetry Collector, Traefik.",
    ],
    timeline: {
      note: "Azure platforms, Terraform, GitOps, observability.",
    },
  },
  {
    role: "System Consultant / Technical Account Manager",
    company: "Orange Business",
    location: "Oslo",
    period: "Aug 2025 — Jan 2026",
    description: [
      "Returned to Orange Service Delivery 3 in the same System Consultant and TAM role after national service, working a parallel portfolio of managed customers. Carried TAM on a B2B SaaS customer and a patient-facing healthcare customer, de facto technical owner of the aviation customer's RHEL fleet where the assigned TAM was Windows-focused, and team-member responsibilities on two healthcare Kubernetes clusters.",
      "On the aviation customer's PCI fleet, owned the RHEL major-version programme. ClamAV reaching end-of-life on RHEL7 (under extended support) while the application could not be redeployed within the available window forced an in-place upgrade of the roughly 40-host PCI fleet to RHEL8. IPA does not survive in-place, so the IPA nodes were rebuilt as a fresh install on new VMs landing on RHEL9, with the auth layer switching from password sync to AD trust against the PCI Windows AD domain. Rebuilt CIS hardening as an Ansible role to restore the baseline that in-place upgrade had partially reset, and as a parallel track rolled out the Sumologic OpenTelemetry agent across all 150 RHEL hosts via Ansible.",
      "On two healthcare customers, ran coordinated rolling upgrade programmes across three layers (Kubernetes, OS, and core services including Traefik and Fluent Bit) on stage and prod environments at each, while keeping NHN-connected clinical workloads online. Norsk Helsenett (NHN, the regulated clinical network with strict peering and compliance controls) was an active dependency at both customers.",
      "Daily stack: RHEL 7/8/9, Kubernetes, Ansible, PostgreSQL, F5 BIG-IP, Sumologic with OpenTelemetry, IPA, Active Directory.",
    ],
    timeline: {
      role: "System Consultant",
      note: "Healthcare and aviation, on-prem Kubernetes and RHEL.",
    },
  },
  {
    role: "SSS Fire & Accident Instructor",
    company: "Royal Norwegian Navy",
    location: "KNM Tordenskjold",
    period: "Aug 2024 — Aug 2025",
    description: [
      "Mandatory national service at the Royal Norwegian Navy's smoke-diving and damage-control school at KNM Tordenskjold. Certified as a solo instructor after a six-month qualification programme. Taught recruits, officers, coast-guard and naval-officer trainees through live-fire drills, smoke dives and damage-control simulations.",
      "Designed and rolled out the security baseline for the unit's digital examination workstation fleet, which had been operating without centralised Group Policy and with end-user accounts running with local administrator rights. Implemented a GPO-driven hardening profile (privileged-access removal, account lockout enforcement, password policy enforcement) via PowerShell, bringing the fleet in line with standard workstation policy. Replaced manual account provisioning and status reporting with automated PowerShell tooling that the unit owns going forward.",
      "Kept a self-hosted Kubernetes, GitOps and CI platform running across the conscript year as continued engineering practice, building the foundation the current Homelab platform sits on.",
    ],
    timeline: {
      role: "Navy Instructor",
      company: "KNM Tordenskjold",
      note: "Incident response, taught calmly under load.",
    },
  },
  {
    role: "System Consultant / Technical Account Manager",
    company: "Orange Business",
    location: "Oslo",
    period: "Aug 2023 — Aug 2024",
    description: [
      "System Consultant on Orange Service Delivery 3, holding a parallel consulting portfolio across roughly seven clients in aviation (PCI and non-PCI), transport, healthcare (two), B2B SaaS and public sector. TAM on two of them, de facto technical owner on others where the engagement model required it. Consulting work centred on Linux and RHEL platforms, Kubernetes, automation and networking, extending to Windows Server and full infra-team scope where the customer required it. Norsk Helsenett (NHN, the regulated clinical network with strict peering and compliance controls) integrations for clinical data exchange were a recurring cross-customer dependency.",
      "Migrated a transport-sector customer's production Kubernetes platform off a major public cloud provider to on-prem Kubernetes for GDPR and data-residency compliance. Chose a blue-green strategy with storage rebuilt on NetApp NFS, covering the two clusters (test and prod) that made up the internal developer platform and resulting in a clean cutover. The customer fleet under operational management was five clusters of six nodes each.",
      "Ran a Puppet-to-Ansible configuration management migration at a B2B SaaS customer, writing all Ansible roles solo, stored in GitLab on-prem and deployed via Jenkins, replacing mail, application, jump-host and Postgres servers. Ran a parallel RHEL7-to-RHEL8/9 blue-green redeploy of the application fleet at the same time. Both tracks ran concurrently through the pre-service engagement.",
      "At a patient-facing healthcare customer, built a custom Prometheus-to-TICK access-log bridge that fed the customer's preferred Prometheus data model into the centralised TICK stack. Also deployed eight new VMs alongside the existing fleet and redeployed the F5 WAF with policy migration onto a cleaner network segment.",
      "On two other healthcare customers, owned the Postgres host stack with a full RHEL7-to-RHEL9 redeploy followed by a TLS connection-string migration with certificates, and ran the Kubernetes core services (Traefik, Fluent Bit) plus OS-level cluster operations (CoreDNS overrides, ulimit tuning) across their environments. NHN integration for clinical data exchange was an active dependency at both.",
      "For a Norwegian public-sector customer, owned the self-hosted Atlassian platform (Jira, Confluence, MySQL), delivered major version upgrades, and ran the surrounding F5 and Cisco network edge with TICK-based monitoring.",
      "Daily stack: Kubernetes, RHEL, Ansible, Jenkins, ArgoCD, Terraform, PostgreSQL, F5 BIG-IP, TICK (Telegraf, InfluxDB, Chronograf, Kapacitor), GitLab (on-prem). Python, Bash and PowerShell where needed.",
    ],
    timeline: {
      role: "System Consultant",
      note: "Kubernetes and Linux for regulated customers.",
    },
  },
  {
    role: "Operations Technician",
    company: "Basefarm / Orange Business",
    location: "Oslo",
    period: "Aug 2021 — Aug 2023",
    description: [
      "Operations Center role at Basefarm, later Orange Business. First line for around 250 customers across Norway, Sweden and the Netherlands, covering incidents, change requests, alarms, and the full ITIL event, incident, change and service-request flow across the OSI model.",
      "Within five months of joining, took on the Incident Team (INO) lead role (a rotating internal role on the OC team), later also Change Team (CNO) lead. In the final phase of the role, moved into the senior shift rotation, which meant sole first-line responsibility overnight across all 250 customers.",
      "Front-line operational exposure to customer environments spanning on-prem, Azure and AWS, covering platform monitoring, alarm response and change execution across the 250-customer estate.",
      "Carried multiple internal responsibilities beyond the shift desk, including maintenance manager for larger CAB-approved infra changes overnight (roll-back decisions, escalation calls and hourly status reporting), CMDB administration, and onboarding plus CNO-team intro training for around 25 new hires.",
      "Standalone deliverables across the period included an AWS-hosted shared-secret tool adopted across the operations centre (replacing a manual handoff process), a Squid forward proxy built from scratch via Ansible while on loan to an internal development department, and a fallback SMS provider sourced and integrated to remove a single-provider dependency on RSA-token delivery and password resets.",
      "Daily stack: Linux and Windows Server, VMware ESXi, NetApp and Rubrik, Cisco firewalls and switches, F5 BIG-IP, SolidDNS, Digicert, Squid, Ansible, Azure and AWS. AWS Fundamentals certification during the period.",
    ],
    timeline: {
      note: "Hybrid estate, alarm gateway, full shift rotation.",
    },
  },
  {
    role: "Programming Course Holder",
    company: "Oslo Municipality",
    location: "Oslo",
    period: "2018 — 2019",
    description: [
      "Part-time programming instructor for Oslo Municipality's after-school programme (Utdanningsetaten), while still in lower-secondary school. Taught fifth-grade groups basic programming through guided game-building exercises at four schools across Oslo, paired with another instructor. First time teaching technology, and a lesson in how much explaining something simply actually helps.",
    ],
  },
];

export const certs: Cert[] = certsRaw.map((c) => certSchema.parse(c));
export const education: Education[] = educationRaw.map((e) => educationSchema.parse(e));
export const experience: Experience[] = experienceRaw.map((e) => experienceSchema.parse(e));

export type CareerStop = {
  year: string;
  role: string;
  company: string;
  note: string;
  current: boolean;
};

function startYearOf(period: string): string {
  return period.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? "";
}

/**
 * Career timeline rendered in the About section. Derived from `experience` —
 * every entry appears here by default, sorted chronologically (oldest first).
 * To opt an entry out, add `timeline: { hidden: true }` to it. To clean up
 * verbose résumé titles for the visual, use `timeline.role` / `timeline.company`.
 */
export const careerPath: CareerStop[] = experience
  .filter((e) => !e.timeline?.hidden)
  .map((e) => ({
    year: startYearOf(e.period),
    role: e.timeline?.role ?? e.role,
    company: e.timeline?.company ?? e.company,
    note: e.timeline?.note ?? "",
    current: e.current ?? false,
  }))
  .sort((a, b) => Number(a.year) - Number(b.year));

/**
 * Résumé summary paragraph. Drives the LaTeX `resume/summary.tex` and is
 * available for the website /resume page header should we choose to render it.
 */
export const summary =
  "Cloud engineer working on automated, secure infrastructure in regulated industries. Focus on Azure-native platforms, Kubernetes (AKS and on-prem with Talos), GitOps with ArgoCD, and Terraform-based CI/CD. Worked with healthcare and aviation customers where F5 WAF, SIEM and IDS integrations are needed to meet strict compliance and availability requirements. Day to day I work with the platform pieces a cluster relies on, including Traefik, Cilium, External Secrets Operator, cert-manager, Prometheus and OpenTelemetry. I also run a six-node Talos cluster at home as an open lab. Configurations and experiments live on GitHub.";
