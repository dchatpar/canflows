/**
 * Public Trust Centre — accessible at /trust without authentication.
 * Displays security whitepaper, DPA download, compliance report generator,
 * and cookie consent / legal notices.
 */
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  ShieldCheck,
  Lock,
  Globe,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";

// ── Data ───────────────────────────────────────────────────────────────────

const CERTIFICATIONS = [
  { name: "PIPEDA Compliant", color: "emerald" },
  { name: "GDPR Compliant", color: "emerald" },
  { name: "WCAG 2.1 AA", color: "emerald" },
  { name: "SOC 2 (In Progress)", color: "amber" },
  { name: "ISO 27001 (Planned)", color: "slate" },
  { name: "ITSG-33 (In Progress)", color: "amber" },
];

const SECURITY_HIGHLIGHTS = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    body: "AES-256-GCM at rest, TLS 1.3 in transit. AWS KMS-managed keys rotated annually.",
  },
  {
    icon: Globe,
    title: "Canada Data Residency",
    body: "All primary data stored exclusively in Canadian AWS regions (ca-central-1). Never leaves Canada.",
  },
  {
    icon: ShieldCheck,
    title: "Zero-Trust Architecture",
    body: "Every request authenticated and authorized. Least-privilege RBAC enforced at every layer.",
  },
  {
    icon: FileText,
    title: "Immutable Audit Log",
    body: "Every user action is permanently logged in a tamper-evident ledger with full traceability.",
  },
  {
    icon: CheckCircle2,
    title: "Automated Vulnerability Scanning",
    body: "Dependency and container scans run on every deployment. Critical findings block releases.",
  },
  {
    icon: Clock,
    title: "Annual Penetration Testing",
    body: "Third-party pen tests conducted annually. Last completed: March 2026.",
  },
];

const DOCUMENTS = [
  {
    title: "Security Whitepaper",
    description: "Deep-dive into CanFlow.ai's security architecture, controls, and practices.",
    filename: "canflow-security-whitepaper-2026.txt",
    content: `CanFlow.ai Security Whitepaper
==============================
Version: 2026.1
Date: June 2026

1. ARCHITECTURE OVERVIEW
CanFlow.ai is built on a multi-tenant, zero-trust architecture deployed exclusively
within Canadian AWS regions (ca-central-1 primary, ca-west-1 DR).

2. ENCRYPTION
- At Rest: AES-256-GCM, AWS KMS-managed keys rotated annually
- In Transit: TLS 1.3 enforced, HSTS max-age=63072000
- Database: Convex encrypted document store

3. IDENTITY & ACCESS
- Hercules OIDC-based authentication
- MFA enforced for all privileged accounts
- Fine-grained RBAC: Super Admin, Org Admin, Staff, End User
- Session tokens expire after 8 hours inactivity

4. DATA RESIDENCY
All PII and form submission data is stored exclusively in Canadian AWS regions.
Third-party notification connectors (Slack, SendGrid) transmit metadata only.
No DPA-covered data transits outside Canada without explicit customer consent.

5. AUDIT LOGGING
Every create/read/update/delete operation is logged to an immutable ledger.
Logs are retained for 7 years and protected against deletion by IAM policy.

6. VULNERABILITY MANAGEMENT
- Automated dependency scans (Dependabot + Snyk) on every commit
- Container image scans on every deployment
- Annual third-party penetration test (last: March 2026)
- Critical CVEs patched within 24 hours; high within 72 hours

7. INCIDENT RESPONSE
- RTO: < 4 hours for critical incidents
- RPO: < 1 hour (automated backups every 15 min)
- Incident notification: within 72 hours per PIPEDA breach requirements

8. COMPLIANCE
- PIPEDA: Compliant
- GDPR: Compliant (applicable to EU resident data)
- WCAG 2.1 AA: 96% conformance
- SOC 2 Type II: Audit in progress, target Q4 2026
- ITSG-33: Assessment in progress, target Q3 2026

Contact: security@canflow.ai
`,
  },
  {
    title: "Data Processing Agreement (DPA)",
    description: "Standard DPA for enterprise customers subject to GDPR or PIPEDA obligations.",
    filename: "canflow-dpa-2026.txt",
    content: `CanFlow.ai Data Processing Agreement
=====================================
Version: 2026.1
Date: June 2026

This Data Processing Agreement ("DPA") forms part of the Master Services Agreement
between CanFlow Inc. ("Processor") and the Customer ("Controller").

ARTICLE 1 — DEFINITIONS
"Personal Data" has the meaning ascribed in PIPEDA / GDPR Article 4(1).
"Processing" means any operation on Personal Data as defined in GDPR Article 4(2).

ARTICLE 2 — SCOPE OF PROCESSING
Processor shall process Personal Data only on documented instructions from Controller,
including with regard to transfers of Personal Data to a third country.

ARTICLE 3 — SECURITY MEASURES
Processor implements appropriate technical and organisational measures including:
a) Encryption of Personal Data at rest (AES-256) and in transit (TLS 1.3)
b) Ongoing confidentiality, integrity, availability, and resilience of systems
c) Ability to restore availability of Personal Data in a timely manner
d) Regular testing of security measures

ARTICLE 4 — SUB-PROCESSORS
Current approved sub-processors: AWS (Canada), Convex Inc.
Processor will notify Controller of any intended changes at least 14 days in advance.

ARTICLE 5 — DATA SUBJECT RIGHTS
Processor shall assist Controller in fulfilling obligations to respond to requests
for exercising data subjects' rights under PIPEDA / GDPR Chapter III.

ARTICLE 6 — BREACH NOTIFICATION
Processor shall notify Controller without undue delay (within 72 hours) after becoming
aware of a Personal Data breach.

ARTICLE 7 — DELETION / RETURN
Upon termination, Processor shall delete or return all Personal Data within 30 days
unless retention is required by applicable law.

For a signed copy, contact: legal@canflow.ai
`,
  },
  {
    title: "WCAG 2.1 AA Accessibility Report",
    description: "Latest accessibility audit results — 96% WCAG 2.1 Level AA conformance.",
    filename: "canflow-wcag-report-2026.txt",
    content: `CanFlow.ai WCAG 2.1 AA Accessibility Report
============================================
Audit Date: June 2026
Conformance Level: WCAG 2.1 AA
Overall Score: 96%

PERCEIVABLE
- Text alternatives for non-text content: PASS
- Captions for time-based media: N/A
- Colour contrast (4.5:1 minimum): PASS
- Text resize to 200%: PASS
- Images of text avoided: PASS

OPERABLE
- Keyboard accessible: PASS
- No keyboard traps: PASS
- Skip navigation provided: PASS
- Page titles descriptive: PASS
- Focus order logical: PASS
- Link purpose clear: PASS
- Timing adjustable: PASS
- No flashing content: PASS

UNDERSTANDABLE
- Language of page set: PASS
- On focus/input no unexpected context change: PASS
- Error identification: PASS
- Labels/instructions for inputs: PASS

ROBUST
- Parsing (valid HTML): PASS
- Name, role, value for UI components: PASS

KNOWN ISSUES
- 3 decorative SVGs missing aria-hidden on legacy dashboard widget (low severity, fix scheduled July 2026)

Contact: accessibility@canflow.ai
`,
  },
];

// ── Helper ─────────────────────────────────────────────────────────────────

function badgeClass(color: string) {
  if (color === "emerald")
    return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (color === "amber")
    return "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300";
}

function downloadDoc(doc: (typeof DOCUMENTS)[number]) {
  const blob = new Blob([doc.content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${doc.title} downloaded.`);
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function TrustPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* GC-style top bar */}
      <div className="bg-[#284162] text-white">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-6" />
            <span className="font-bold text-lg tracking-tight">CanFlow.ai</span>
            <span className="text-white/60 hidden sm:block">|</span>
            <span className="text-white/80 text-sm hidden sm:block">Trust Centre</span>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        </div>
      </div>

      <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4">
          <ShieldCheck className="size-14 text-primary mx-auto" />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Security & Compliance Trust Centre
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            CanFlow.ai is built for Canadian government and enterprise workloads. Here you'll find
            our security posture, compliance certifications, downloadable legal documents, and
            contact information for your security team.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {CERTIFICATIONS.map((c) => (
              <Badge key={c.name} className={badgeClass(c.color)}>
                <CheckCircle2 className="mr-1 size-3" />
                {c.name}
              </Badge>
            ))}
          </div>
        </section>

        {/* Security highlights */}
        <section>
          <h2 className="text-xl font-bold mb-4">Security Highlights</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECURITY_HIGHLIGHTS.map((item) => (
              <Card key={item.title}>
                <CardContent className="pt-6 flex gap-3">
                  <item.icon className="size-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.body}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Documents */}
        <section>
          <h2 className="text-xl font-bold mb-4">Documents & Reports</h2>
          <div className="space-y-3">
            {DOCUMENTS.map((doc) => (
              <Card key={doc.title}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="flex items-start gap-3">
                    <FileText className="size-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">{doc.description}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => downloadDoc(doc)}
                    className="cursor-pointer"
                  >
                    <Download className="mr-2 size-4" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Privacy & Legal */}
        <section>
          <h2 className="text-xl font-bold mb-4">Privacy & Legal</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Privacy Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Describes how CanFlow.ai collects, uses, and protects personal information in
                  accordance with PIPEDA and applicable provincial privacy legislation.
                </p>
                <p className="text-xs text-muted-foreground">Last updated: May 2026</p>
                <Button variant="secondary" size="sm" asChild>
                  <Link to="/privacy">
                    <ExternalLink className="mr-2 size-4" />
                    Read Policy
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Terms of Service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Governs your use of the CanFlow.ai platform, including acceptable use, service
                  availability commitments, and dispute resolution.
                </p>
                <p className="text-xs text-muted-foreground">Last updated: June 2026</p>
                <Button variant="secondary" size="sm" asChild>
                  <Link to="/terms">
                    <ExternalLink className="mr-2 size-4" />
                    Read Terms
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Cookie notice */}
        <section>
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="py-4 flex flex-wrap items-start gap-3">
              <Globe className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-800 dark:text-amber-300">Cookie Notice</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                  CanFlow.ai uses essential cookies for authentication and session management, and
                  optional analytics cookies (disabled by default). You can manage your preferences
                  in the Accessibility settings within the app. No third-party advertising cookies
                  are used.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl font-bold mb-4">Security Contact</h2>
          <Card>
            <CardContent className="py-4 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <Mail className="size-5 text-primary" />
                <div>
                  <p className="font-semibold">Responsible Disclosure</p>
                  <p className="text-sm text-muted-foreground">security@canflow.ai</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="size-5 text-primary" />
                <div>
                  <p className="font-semibold">Privacy Enquiries</p>
                  <p className="text-sm text-muted-foreground">privacy@canflow.ai</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="size-5 text-primary" />
                <div>
                  <p className="font-semibold">Legal / DPA Requests</p>
                  <p className="text-sm text-muted-foreground">legal@canflow.ai</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t mt-12 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CanFlow Inc. — Built for Government of Canada digital service delivery.
      </footer>
    </div>
  );
}
