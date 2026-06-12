# canflows.ca

> AI-native, open-source forms + workflow + analytics platform for governments and regulated enterprises.  
> Built for compliance. Bilingual EN/FR. PIPEDA compliant. WCAG 2.1 AA (96%).

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](../LICENSE)
[![WCAG 2.1 AA](https://img.shields.io/badge/WCAG%202.1-AA%2096%25-green)](https://canflows.ca/trust)
[![PIPEDA](https://img.shields.io/badge/PIPEDA-Compliant-red)](https://canflows.ca/trust)
[![SOC 2](https://img.shields.io/badge/SOC%202-In%20Progress-orange)](https://canflows.ca/trust)

---

## What is canflows.ca?

canflows.ca is a production-ready, AI-first forms and workflow automation platform designed specifically for Government of Canada departments, provincial/municipal governments, and regulated enterprises (healthcare, finance, education).

**Live demo:** [canflows.ca](https://canflows.ca)  
**Trust Centre:** [canflows.ca/trust](https://canflows.ca/trust)

---

## Features

### Platform Modules (14)

| Module | Description |
|--------|-------------|
| AI Form Builder | Describe a form in plain English — AI generates fields, validation, and layout |
| Drag-and-Drop Form Builder | 28+ field types, conditional logic, multi-page wizards |
| BPMN 2.0 Workflow Engine | Visual workflow designer, parallel gateways, decision tables |
| Public Submission Portal | Citizens submit without an account; real-time status tracking |
| Staff Task Queue | Unified inbox, bulk operations, claim model, SLA tracking |
| SLA & Deadline Management | Service standards, auto-escalation, breach detection |
| Analytics Dashboard | Submission volume, completion rates, SLA compliance, CSV export |
| AI Process Intelligence | Bottleneck detection, predictive SLA breach, optimization |
| Native eSignature | Multi-party signing, legal audit trail, decline flow |
| Document Generation | PDF template population from form submissions |
| REST API & Integrations | OpenAPI 3.0 spec, Slack/Teams/SendGrid connectors |
| Accessibility Management | WCAG 2.1 AA audit reports, high-contrast mode |
| Security & Compliance Centre | Audit logs, SSO/MFA, IP allowlist, GDPR erasure |
| Compliance Dashboard | Live control status, framework tracking, Trust Centre |
| Multi-tenancy | Isolated tenant spaces with custom branding and SSO |

### Compliance Posture

- **PIPEDA Compliant** — Privacy notices, consent management, 72-hr breach workflow
- **WCAG 2.1 AA** — 96% conformance (June 2026 audit); ACA-aligned
- **ITSG-33 Aligned** — Security controls mapped to Annex 4A; assessment in progress
- **SOC 2 Type II** — Audit in progress, targeting Q4 2026
- **Canada Data Residency** — All data in AWS ca-central-1 (DR: ca-west-1)
- **GDPR-Aligned** — Data subject rights, DPA available for enterprise customers
- **TLS 1.3 + AES-256** — Encryption in transit and at rest
- **Bilingual EN/FR** — Official Languages Act compliant

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, TypeScript 5, Tailwind CSS 4 |
| UI Components | shadcn/ui |
| Backend | Convex (reactive document DB + serverless functions) |
| Auth | Hercules Auth (OIDC) |
| Animations | Motion (Framer Motion v12) |
| PDF | jsPDF |
| Routing | React Router v7 |
| Runtime | Node.js 22 |

---

## Quick Start

### Prerequisites
- Node.js 22+
- pnpm 11+
- A Convex account (free at convex.dev)

### Local Development

```bash
git clone https://github.com/dchatpar/canflows.git
cd canflows
pnpm install
cp .env.example .env.local
# Fill in .env.local (see docs/ENVIRONMENT.md)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker (Self-Hosted)

```bash
git clone https://github.com/dchatpar/canflows.git
cd canflows
cp .env.example .env
# Edit .env with production values
docker compose up --build -d
```

App available at `http://localhost:3000`.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/ENVIRONMENT.md](ENVIRONMENT.md) | Environment variable reference |
| [docs/DEPLOYMENT.md](DEPLOYMENT.md) | Deployment & production configuration guide |
| [docs/CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [docs/SECURITY.md](SECURITY.md) | Vulnerability disclosure policy |
| [docs/CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards |

---

## Legal

- [Privacy Policy](https://canflows.ca/privacy) — PIPA BC + PIPEDA + CASL
- [Terms of Service](https://canflows.ca/terms) — BC/Canada governing law
- [Cookie Policy](https://canflows.ca/cookies)
- [Trust Centre](https://canflows.ca/trust)

**CanFlows** is incorporated in British Columbia, Canada.

Licensed under [Apache 2.0](../LICENSE). Copyright 2026 CanFlows
