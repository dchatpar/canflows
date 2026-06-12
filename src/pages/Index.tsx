import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Authenticated, Unauthenticated } from "convex/react";
import { motion, useInView, AnimatePresence } from "motion/react";
import { useRef, useState, useEffect } from "react";
import {
  ArrowRight, Check, Shield, Globe, Menu, X, ChevronRight,
  FileText, GitBranch, BarChart3, Users, Lock, Zap, Star,
  Building2, CheckCircle2, ChevronDown, Layers, PenSquare,
  ClipboardList, BellRing, Database, FileSignature, Bot,
  MapPin, ExternalLink, Github, BookOpen,
  AlertCircle, Clock, Eye, ScrollText, Award, Flag,
  GitFork, HeartPulse, Landmark, GraduationCap, Banknote,
  ServerCog, FlaskConical, Timer, Webhook, Accessibility,
  ShieldAlert, BadgeCheck, Brain, PenLine,
} from "lucide-react";
import Logo from "@/components/Logo.tsx";

// ─── Constants ───────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Compliance", href: "#compliance" },
  { label: "Pricing", href: "#pricing" },
  { label: "Government", href: "#government" },
];

const STATS = [
  { label: "Form Field Types", value: "28+" },
  { label: "Platform Modules", value: "13" },
  { label: "Pre-built GC Templates", value: "15+" },
  { label: "Open Source", value: "Apache 2.0" },
];

const FEATURES = [
  {
    icon: Bot,
    title: "AI-Native Form & Workflow Builder",
    desc: "Describe your process in plain English — CanFlow.ai generates the full form, BPMN 2.0 workflow, field mappings, and routing rules instantly. AI as a workflow step (LLM-in-loop) for intelligent triage and classification.",
    color: "from-pink-50 to-fuchsia-50",
    accent: "text-pink-700",
    iconBg: "bg-pink-100",
    border: "hover:border-pink-200",
  },
  {
    icon: PenSquare,
    title: "Drag-and-Drop Form Builder",
    desc: "28+ field types including signature, geolocation, and file upload. Conditional logic, calculated fields, multi-page wizards, and WCAG 2.1 AA accessible markup out of the box.",
    color: "from-red-50 to-rose-50",
    accent: "text-red-600",
    iconBg: "bg-red-100",
    border: "hover:border-red-200",
  },
  {
    icon: GitBranch,
    title: "BPMN 2.0 Workflow Engine",
    desc: "Visual process designer with full BPMN 2.0 + DMN support. Parallel gateways, decision tables, SLA enforcement, automated escalation, and AI decision steps — no code required.",
    color: "from-blue-50 to-indigo-50",
    accent: "text-blue-700",
    iconBg: "bg-blue-100",
    border: "hover:border-blue-200",
  },
  {
    icon: ClipboardList,
    title: "Staff Task Queue",
    desc: "Unified task inbox with SLA tracking, bulk operations, claim model for pooled queues, and full audit trail per submission. Designed for high-volume government review workflows.",
    color: "from-emerald-50 to-teal-50",
    accent: "text-emerald-700",
    iconBg: "bg-emerald-100",
    border: "hover:border-emerald-200",
  },
  {
    icon: Timer,
    title: "SLA & Deadline Management",
    desc: "Define service standards per form type. Automatic SLA tracking, escalation alerts, breach detection, and compliance dashboards aligned to Treasury Board service standards.",
    color: "from-orange-50 to-amber-50",
    accent: "text-orange-700",
    iconBg: "bg-orange-100",
    border: "hover:border-orange-200",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    desc: "Submission volume, completion rates, field drop-off, bottleneck identification, SLA compliance metrics, and CSV export for continuous service improvement.",
    color: "from-violet-50 to-purple-50",
    accent: "text-violet-700",
    iconBg: "bg-violet-100",
    border: "hover:border-violet-200",
  },
  {
    icon: Brain,
    title: "AI Process Intelligence",
    desc: "Bottleneck detection, predictive SLA breach forecasting, drop-off analysis, field-level completion metrics, and AI-powered optimization recommendations.",
    color: "from-fuchsia-50 to-pink-50",
    accent: "text-fuchsia-700",
    iconBg: "bg-fuchsia-100",
    border: "hover:border-fuchsia-200",
  },
  {
    icon: FileSignature,
    title: "Native eSignature",
    desc: "Multi-party signing workflows with legal audit trail (signer identity, IP, timestamp). No third-party add-on required. Full decline flow and certificate generation built in.",
    color: "from-amber-50 to-orange-50",
    accent: "text-amber-700",
    iconBg: "bg-amber-100",
    border: "hover:border-amber-200",
  },
  {
    icon: FileText,
    title: "Document Generation",
    desc: "Auto-populate PDF templates from form submissions. Merge fields, multi-document packets, and secure versioned storage. Includes pre-built GC-style document templates.",
    color: "from-sky-50 to-cyan-50",
    accent: "text-sky-700",
    iconBg: "bg-sky-100",
    border: "hover:border-sky-200",
  },
  {
    icon: Webhook,
    title: "REST API & Integrations",
    desc: "Full REST API with API key management, OpenAPI 3.0 spec, and pre-built connectors for Slack, Microsoft Teams, SendGrid, and more. Webhook delivery with retry logic.",
    color: "from-teal-50 to-emerald-50",
    accent: "text-teal-700",
    iconBg: "bg-teal-100",
    border: "hover:border-teal-200",
  },
  {
    icon: Accessibility,
    title: "Accessibility Management",
    desc: "WCAG 2.1 AA audit reports, high-contrast mode, reduced-motion toggle, keyboard navigation, and screen reader optimization. 96% WCAG 2.1 AA conformance achieved (June 2026).",
    color: "from-green-50 to-teal-50",
    accent: "text-green-700",
    iconBg: "bg-green-100",
    border: "hover:border-green-200",
  },
  {
    icon: ShieldAlert,
    title: "Security & Compliance Centre",
    desc: "Immutable audit log, SSO/MFA configuration, IP allowlist, data retention policies, GDPR erasure workflow, security posture scorecard, and PIPEDA compliance tooling.",
    color: "from-red-50 to-rose-50",
    accent: "text-red-700",
    iconBg: "bg-red-100",
    border: "hover:border-red-200",
  },
  {
    icon: BadgeCheck,
    title: "Compliance Dashboard & Trust Centre",
    desc: "Live compliance control status, data residency monitoring, encryption health, framework tracking (PIPEDA, WCAG, SOC 2, ITSG-33), and a public trust centre at /trust.",
    color: "from-indigo-50 to-blue-50",
    accent: "text-indigo-700",
    iconBg: "bg-indigo-100",
    border: "hover:border-indigo-200",
  },
  {
    icon: Users,
    title: "Multi-tenancy",
    desc: "Each department or organization gets their own isolated tenant space with custom branding, SSO, forms, workflows, and analytics. Physical isolation available on Enterprise.",
    color: "from-slate-50 to-gray-100",
    accent: "text-slate-700",
    iconBg: "bg-slate-100",
    border: "hover:border-slate-300",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Bot,
    color: "text-pink-700",
    bg: "bg-pink-50",
    title: "Describe or design",
    desc: "Use the AI builder or drag-and-drop designer to create accessible, bilingual forms. AI generates the full form and workflow from a plain-English description.",
  },
  {
    step: "02",
    icon: GitBranch,
    color: "text-blue-700",
    bg: "bg-blue-50",
    title: "Link a workflow",
    desc: "Attach a BPMN 2.0 approval workflow. Map form fields to workflow variables, define routing rules, SLAs, and escalation paths — visually, no code required.",
  },
  {
    step: "03",
    icon: Globe,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    title: "Publish publicly",
    desc: "Share a public URL or embed the form. Citizens submit without creating an account. Each submission gets a reference number and real-time status tracking.",
  },
  {
    step: "04",
    icon: ClipboardList,
    color: "text-violet-700",
    bg: "bg-violet-50",
    title: "Staff reviews & approves",
    desc: "Reviewers work from a unified task inbox. Approve, reject, request more info, and add notes — all actions logged in a tamper-proof audit trail.",
  },
  {
    step: "05",
    icon: BarChart3,
    color: "text-amber-700",
    bg: "bg-amber-50",
    title: "Monitor & improve",
    desc: "Track completion rates, processing times, and SLA compliance. AI surfaces bottlenecks and optimization opportunities automatically.",
  },
];

// Realistic compliance badges — only things we have actually implemented or can factually claim
const COMPLIANCE_BADGES = [
  { label: "PIPEDA", sub: "Canadian Privacy Law", color: "bg-blue-800 text-white", icon: Lock },
  { label: "WCAG 2.1 AA", sub: "96% Conformance", color: "bg-green-700 text-white", icon: Eye },
  { label: "ACA", sub: "Accessible Canada Act", color: "bg-red-600 text-white", icon: Users },
  { label: "GDPR-Aligned", sub: "EU Data Protection", color: "bg-blue-600 text-white", icon: Globe },
  { label: "ITSG-33", sub: "In Progress", color: "bg-orange-700 text-white", icon: Shield },
  { label: "SOC 2 Type II", sub: "Audit In Progress", color: "bg-indigo-700 text-white", icon: Award },
  { label: "ISO 27001", sub: "Planned Q1 2027", color: "bg-slate-700 text-white", icon: CheckCircle2 },
  { label: "TLS 1.3 + AES-256", sub: "Encryption Standard", color: "bg-emerald-700 text-white", icon: Lock },
  { label: "Canada Data Residency", sub: "AWS ca-central-1", color: "bg-red-700 text-white", icon: MapPin },
  { label: "72-hr Breach Notice", sub: "PIPEDA Req. Built In", color: "bg-orange-700 text-white", icon: BellRing },
  { label: "Bilingual EN/FR", sub: "Official Languages Act", color: "bg-red-800 text-white", icon: Globe },
  { label: "Apache 2.0", sub: "Open Source, Auditable", color: "bg-zinc-700 text-white", icon: ScrollText },
];

const COMPLIANCE_FEATURES = [
  {
    icon: Lock,
    title: "PIPEDA & Privacy by Design",
    desc: "Privacy notices on all public forms, consent management, data minimization, and purpose limitation. Built-in 72-hour PIPEDA breach notification workflow. Data stored exclusively in Canadian AWS regions.",
    badge: "Canada",
    badgeColor: "text-red-300 bg-red-900/40",
  },
  {
    icon: Shield,
    title: "ITSG-33 Aligned Controls",
    desc: "Security controls designed to support Government of Canada ITSG-33 Annex 4A requirements. AES-256 at rest, TLS 1.3 in transit, immutable audit logs, MFA, and RBAC. ITSG-33 assessment currently in progress.",
    badge: "In Progress",
    badgeColor: "text-amber-300 bg-amber-900/40",
  },
  {
    icon: Globe,
    title: "GDPR-Aligned Data Processing",
    desc: "Data subject rights (access, correction, deletion), Data Processing Agreement (DPA) available for enterprise customers, sub-processor transparency, and consent management for EU resident data.",
    badge: "EU",
    badgeColor: "text-blue-300 bg-blue-900/40",
  },
  {
    icon: Eye,
    title: "WCAG 2.1 Level AA + ACA",
    desc: "96% WCAG 2.1 AA conformance achieved (June 2026 audit). Screen reader compatible (NVDA, JAWS, VoiceOver), keyboard-only navigable, high-contrast mode, reduced-motion support, and per-form audit reports.",
    badge: "Accessibility",
    badgeColor: "text-green-300 bg-green-900/40",
  },
  {
    icon: MapPin,
    title: "Canada Data Residency",
    desc: "All primary data stored exclusively in Canadian AWS regions (ca-central-1). No data leaves Canada. Disaster recovery in ca-west-1. Designed to meet Treasury Board data residency directives.",
    badge: "Canada",
    badgeColor: "text-red-300 bg-red-900/40",
  },
  {
    icon: Award,
    title: "SOC 2 Type II — Audit In Progress",
    desc: "SOC 2 Type II audit covering Security, Availability, and Confidentiality trust service criteria is currently underway, targeting Q4 2026. Security controls documentation available on request.",
    badge: "In Progress",
    badgeColor: "text-amber-300 bg-amber-900/40",
  },
];

const GC_TEMPLATES = [
  "Permit Applications",
  "Access to Information (ATI)",
  "Complaint & Feedback Intake",
  "Grant Applications",
  "Benefits Enrollment",
  "Inspection & Compliance",
  "Visitor Registration",
  "Procurement & Vendor Intake",
  "Public Records Requests",
  "Personnel Clearance",
  "License Applications",
  "Incident Reports",
  "Tax Form Intake",
  "Service Requests",
  "Survey & Consultation",
];

const PRICING = [
  {
    name: "Community",
    badge: "Open Source",
    badgeColor: "bg-emerald-100 text-emerald-800",
    price: "Free",
    sub: "Apache 2.0 — self-hosted forever",
    highlight: false,
    cta: "Get Started",
    features: [
      "Unlimited forms & submissions",
      "BPMN 2.0 workflow engine",
      "28+ form field types",
      "Basic RBAC (4 roles)",
      "Public submission portal",
      "Staff task queue",
      "PDF export",
      "REST API access",
      "Community support (GitHub)",
      "WCAG 2.1 AA forms",
    ],
  },
  {
    name: "Professional",
    badge: "Most Popular",
    badgeColor: "bg-blue-100 text-blue-800",
    price: "Contact us",
    sub: "SaaS or self-hosted",
    highlight: true,
    cta: "Book a Demo",
    features: [
      "Everything in Community",
      "AI form & workflow builder",
      "Native eSignature",
      "Document generation",
      "Bilingual EN/FR UI",
      "GC template library (15+)",
      "SLA management",
      "SSO via SAML / OIDC",
      "Immutable audit logs",
      "Email support (4hr SLA)",
    ],
  },
  {
    name: "Enterprise",
    badge: "Government Grade",
    badgeColor: "bg-red-100 text-red-800",
    price: "Contact us",
    sub: "Dedicated / air-gapped",
    highlight: false,
    cta: "Talk to Sales",
    features: [
      "Everything in Professional",
      "Multi-tenancy (physical isolation)",
      "ITSG-33 aligned controls",
      "PIPEDA & GDPR tooling",
      "Canada data residency",
      "Azure AD / Okta / LDAP",
      "AI process intelligence",
      "White-labeling",
      "Compliance dashboard",
      "Dedicated CSM + 1hr SLA",
    ],
  },
];

// Neutral competitor comparison — no product names
const COMPETITOR_MATRIX = [
  {
    feature: "AI-native workflow builder (LLM-in-loop)",
    canflow: true,
    general: false,
    workflow: "Partial",
    bpm: false,
  },
  {
    feature: "Native eSignature with legal audit trail",
    canflow: true,
    general: false,
    workflow: false,
    bpm: "Partial",
  },
  {
    feature: "Document generation (PDF templates)",
    canflow: true,
    general: false,
    workflow: false,
    bpm: "Partial",
  },
  {
    feature: "WCAG 2.1 AA built in",
    canflow: true,
    general: "Partial",
    workflow: "Partial",
    bpm: "Partial",
  },
  {
    feature: "Bilingual EN/FR out of box",
    canflow: true,
    general: false,
    workflow: false,
    bpm: false,
  },
  {
    feature: "PIPEDA & Canadian data residency",
    canflow: true,
    general: false,
    workflow: false,
    bpm: false,
  },
  {
    feature: "ITSG-33 aligned controls",
    canflow: true,
    general: false,
    workflow: false,
    bpm: "Partial",
  },
  {
    feature: "Open source (Apache 2.0, auditable)",
    canflow: true,
    general: false,
    workflow: "Partial",
    bpm: false,
  },
  {
    feature: "Air-gapped / behind-firewall deployment",
    canflow: true,
    general: false,
    workflow: "Partial",
    bpm: "Partial",
  },
  {
    feature: "Process intelligence & bottleneck detection",
    canflow: true,
    general: false,
    workflow: false,
    bpm: "Partial",
  },
];

// Real social proof — no invented quotes
const SECTORS = [
  { icon: Landmark, label: "Municipal Government" },
  { icon: Building2, label: "Federal Agencies" },
  { icon: Flag, label: "Provincial Ministries" },
  { icon: HeartPulse, label: "Healthcare" },
  { icon: Banknote, label: "Financial Services" },
  { icon: GraduationCap, label: "Education" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CellValue({ val }: { val: boolean | string }) {
  if (val === true) return <span className="inline-flex items-center justify-center size-6 rounded-full bg-emerald-100 text-emerald-700"><Check className="size-3.5" /></span>;
  if (val === false) return <span className="inline-flex items-center justify-center size-6 rounded-full bg-red-50 text-red-400 font-bold text-xs">✗</span>;
  return <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold">{val}</span>;
}

// Animated form submission flow diagram
function FormFlowDiagram() {
  const steps = [
    { label: "Citizen Submits Form", color: "#CC0000", icon: "📋" },
    { label: "AI Triage & Classification", color: "#9333ea", icon: "🤖" },
    { label: "Workflow Triggered (BPMN 2.0)", color: "#1a56db", icon: "⚡" },
    { label: "Staff Reviews Task", color: "#0e7490", icon: "👤" },
    { label: "Decision & eSignature", color: "#6d28d9", icon: "✍️" },
    { label: "Document Generated + Sent", color: "#065f46", icon: "📧" },
  ] as const;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-white shadow-xl p-8">
      <div className="flex items-center gap-2 mb-6">
        <div className="size-3 rounded-full bg-red-400" />
        <div className="size-3 rounded-full bg-yellow-400" />
        <div className="size-3 rounded-full bg-green-400" />
        <span className="ml-2 text-xs text-muted-foreground font-mono">canflow.ai — permit-application.bpmn</span>
      </div>

      <div className="flex flex-col gap-3">
        {steps.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.2, duration: 0.5, ease: "easeOut" as const }}
            className="flex items-center gap-3"
          >
            {i > 0 && (
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.35 + i * 0.2, duration: 0.2 }}
                className="absolute left-[2.85rem] h-3 w-0.5 bg-border"
                style={{ top: `${8.4 + (i - 1) * 3.3}rem` }}
              />
            )}
            <div
              className="size-9 rounded-xl flex items-center justify-center text-base shrink-0 shadow-sm"
              style={{ backgroundColor: s.color + "22", border: `1.5px solid ${s.color}40` }}
            >
              <span role="img" aria-hidden>{s.icon}</span>
            </div>
            <div className="flex-1 py-2.5 px-4 rounded-lg bg-muted/60 border border-border">
              <span className="text-sm font-semibold text-foreground">{s.label}</span>
            </div>
            {i === 0 && (
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" as const }}
                className="size-2 rounded-full bg-emerald-500 shrink-0"
              />
            )}
          </motion.div>
        ))}
      </div>

      <div className="flex gap-4 mt-6 pt-4 border-t border-border">
        {[
          { label: "Avg. Processing", value: "2.3 days" },
          { label: "SLA Compliance", value: "98.7%" },
          { label: "Fully Automated", value: "43%" },
        ].map((stat) => (
          <div key={stat.label} className="flex-1 text-center">
            <div className="text-base font-bold text-foreground">{stat.value}</div>
            <div className="text-[10px] text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplianceBadge({ badge }: { badge: typeof COMPLIANCE_BADGES[number] }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -2 }}
      transition={{ duration: 0.15 }}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl ${badge.color} shadow-sm cursor-default`}
    >
      <badge.icon className="size-4 shrink-0 opacity-90" />
      <div>
        <div className="text-sm font-bold leading-tight">{badge.label}</div>
        <div className="text-[10px] opacity-75 leading-tight">{badge.sub}</div>
      </div>
    </motion.div>
  );
}

function PricingCard({ plan }: { plan: typeof PRICING[number] }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } } }}
      className={`relative flex flex-col rounded-2xl border p-8 ${
        plan.highlight
          ? "bg-[#1a2744] text-white border-[#1a2744] shadow-2xl scale-[1.02]"
          : "bg-white border-border"
      }`}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-white text-xs font-bold uppercase tracking-wider">
          Most Popular
        </div>
      )}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-xl font-bold mb-1">{plan.name}</div>
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${plan.highlight ? "bg-white/15 text-white" : plan.badgeColor}`}>
            {plan.badge}
          </span>
        </div>
      </div>
      <div className="mb-1">
        <span className="text-3xl font-bold">{plan.price}</span>
      </div>
      <div className={`text-sm mb-8 ${plan.highlight ? "text-white/60" : "text-muted-foreground"}`}>
        {plan.sub}
      </div>
      <ul className="space-y-3 flex-1 mb-8">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <Check className={`size-4 shrink-0 mt-0.5 ${plan.highlight ? "text-emerald-400" : "text-emerald-600"}`} />
            <span className={plan.highlight ? "text-white/85" : "text-foreground"}>{f}</span>
          </li>
        ))}
      </ul>
      <Unauthenticated>
        <SignInButton>
          <Button
            size="lg"
            className={`w-full font-semibold cursor-pointer ${
              plan.highlight
                ? "bg-primary hover:bg-primary/90 text-white"
                : "bg-foreground text-background hover:bg-foreground/90"
            }`}
          >
            {plan.cta}
          </Button>
        </SignInButton>
      </Unauthenticated>
      <Authenticated>
        <Button size="lg" className="w-full font-semibold" asChild>
          <Link to="/workflows">{plan.cta} <ArrowRight className="size-4 ml-1" /></Link>
        </Button>
      </Authenticated>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Index() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaqIdx, setActiveFaqIdx] = useState<number | null>(null);
  const githubStatsRef = useRef<HTMLDivElement>(null);
  const githubInView = useInView(githubStatsRef, { once: true });

  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  } as const;

  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
  } as const;

  const faqs = [
    {
      q: "Is CanFlow.ai truly open source?",
      a: "Yes. The Community edition is 100% open source under Apache 2.0 on GitHub (github.com/canflow-ai/canflow). You can self-host, audit every line of code, fork, and modify the entire codebase. The Enterprise tier adds proprietary modules (physical multi-tenancy, white-labeling, advanced AI) licensed separately.",
    },
    {
      q: "Does CanFlow.ai meet Government of Canada security requirements?",
      a: "CanFlow.ai is designed with security controls aligned to Government of Canada ITSG-33 Annex 4A requirements. AES-256 at rest, TLS 1.3 in transit, immutable audit logs, MFA, and RBAC are built in. A formal ITSG-33 assessment is currently in progress. Data residency in Canadian data centres is available on all paid tiers. Contact our team for the full security controls documentation.",
    },
    {
      q: "Is CanFlow.ai PIPEDA and GDPR compliant?",
      a: "Yes for PIPEDA — CanFlow.ai includes privacy notices on all public forms, consent management, data minimization, purpose limitation, and a 72-hour breach notification workflow. For GDPR, the platform is designed to support EU resident data handling obligations including data subject rights and Data Processing Agreements (DPA) available for enterprise customers.",
    },
    {
      q: "What does 'ITSG-33 aligned' mean vs. certified?",
      a: "ITSG-33 alignment means CanFlow.ai's security architecture maps to the control objectives in ITSG-33 Annex 4A (AES-256, TLS 1.3, audit logs, MFA, RBAC, Canada data residency). A formal third-party ITSG-33 assessment is currently in progress. We do not claim a completed certification that has not been obtained — all compliance posture is documented transparently in our Trust Centre.",
    },
    {
      q: "How does open source licensing reduce procurement risk?",
      a: "Apache 2.0 means zero vendor lock-in. Your procurement team can audit every line of code, self-host behind your firewall with no dependency on CanFlow.ai's cloud, fork the platform if needed, and avoid sole-source procurement justification challenges. Enterprise support and SLAs are available without sacrificing code ownership.",
    },
    {
      q: "Can citizens submit forms without creating an account?",
      a: "Yes. Public forms are accessible at a shareable URL with no login required. Authenticated forms can optionally require sign-in. Citizens receive a reference number and can track submission status in real time.",
    },
    {
      q: "What deployment options are available?",
      a: "Community: self-hosted on any infrastructure (Docker, Kubernetes, bare metal, AWS, Azure, GCP). Professional: CanFlow.ai-hosted SaaS or self-hosted. Enterprise: dedicated hosted (physically isolated per tenant), or air-gapped on-premise behind your firewall. All options support Canadian data residency.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── GC Top bar ───────────────────────────────────────────────────────── */}
      <div className="bg-[#CC0000] text-white py-1.5 px-4 text-center">
        <p className="text-xs font-medium">
          PIPEDA Compliant · WCAG 2.1 AA (96%) · SOC 2 In Progress · Bilingual EN/FR &nbsp;·&nbsp;
          <span className="font-bold">Apache 2.0 Open Source</span>
        </p>
      </div>

      {/* ── Navbar ────────────────────────────────────────────────────────────── */}
      <header className="border-b bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <Logo />

          <nav className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-semibold"
              >
                {l.label}
              </a>
            ))}
            <a
              href="https://github.com/canflow-ai/canflow"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-semibold"
            >
              <Github className="size-4" /> GitHub
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Authenticated>
              <Button size="sm" asChild className="gap-1.5">
                <Link to="/workflows">
                  Dashboard <ChevronRight className="size-3.5" />
                </Link>
              </Button>
            </Authenticated>
            <Unauthenticated>
              <SignInButton>
                <Button size="sm" className="gap-1.5 font-semibold cursor-pointer">
                  Get Started Free <ArrowRight className="size-3.5" />
                </Button>
              </SignInButton>
            </Unauthenticated>
            <button
              className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors cursor-pointer"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border-t bg-white overflow-hidden"
            >
              <div className="px-4 py-3 flex flex-col gap-1">
                {NAV_LINKS.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    className="text-sm font-semibold py-2.5 text-foreground border-b border-border last:border-0"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {l.label}
                  </a>
                ))}
                <div className="pt-2">
                  <Unauthenticated>
                    <SignInButton>
                      <Button size="sm" className="w-full cursor-pointer">Sign In / Get Started</Button>
                    </SignInButton>
                  </Unauthenticated>
                  <Authenticated>
                    <Button size="sm" asChild className="w-full">
                      <Link to="/workflows">Open Dashboard</Link>
                    </Button>
                  </Authenticated>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-slate-50 via-white to-red-50/30">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #1a2744 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -top-60 -right-40 w-[800px] h-[600px] bg-gradient-to-bl from-[#1a2744]/10 via-blue-200/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-40 w-[600px] h-[400px] bg-red-200/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" as const }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-700 text-xs font-bold mb-8 tracking-wide uppercase"
              >
                <span className="size-2 rounded-full bg-red-500 animate-pulse" />
                AI-First · Open Source · Apache 2.0 · Government Ready
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" as const }}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-balance leading-[1.05] mb-6 text-[#1a2744]"
              >
                AI-Native Forms &amp; Workflows.{" "}
                <span className="bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                  Built for Government.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" as const }}
                className="text-base sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 text-balance leading-relaxed mb-10"
              >
                CanFlow.ai is the open-source, AI-first forms + workflow + analytics platform built for governments and regulated enterprises. Drag-and-drop form builder, BPMN 2.0 workflows, native eSignature, AI automation — with PIPEDA, WCAG 2.1 AA, and ITSG-33-aligned controls built in.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" as const }}
                className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
              >
                <Unauthenticated>
                  <SignInButton>
                    <Button size="lg" className="gap-2 text-base px-8 font-bold shadow-lg cursor-pointer">
                      Start Building Free <ArrowRight className="size-4" />
                    </Button>
                  </SignInButton>
                </Unauthenticated>
                <Authenticated>
                  <Button size="lg" asChild className="gap-2 text-base px-8 font-bold shadow-lg">
                    <Link to="/workflows">Open Dashboard <ArrowRight className="size-4" /></Link>
                  </Button>
                </Authenticated>
                <Button
                  size="lg"
                  variant="ghost"
                  className="gap-2 text-base border border-border font-semibold hover:bg-slate-50"
                  asChild
                >
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="mt-8 flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start"
              >
                {[
                  "PIPEDA Compliant",
                  "ITSG-33 Aligned",
                  "WCAG 2.1 AA (96%)",
                  "SOC 2 In Progress",
                  "Bilingual EN/FR",
                  "Apache 2.0",
                ].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <Check className="size-3.5 text-emerald-500 shrink-0" />
                    {t}
                  </span>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" as const }}
              className="flex-1 w-full max-w-lg lg:max-w-none"
            >
              <FormFlowDiagram />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────────── */}
      <section className="border-b bg-[#1a2744]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-white/10">
            {STATS.map((s) => (
              <div key={s.label} className="text-center px-6">
                <div className="text-3xl font-bold text-white">{s.value}</div>
                <div className="text-sm text-white/50 mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
          className="text-center mb-14"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
            Platform Features
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance text-[#1a2744]">
            13 modules. Everything government needs.
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-balance">
            CanFlow.ai is the only AI-native, open-source platform with native eSignature, document generation, BPMN 2.0 workflows, and a complete government compliance posture — built in from day one.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: (i % 3) * 0.08, duration: 0.45, ease: "easeOut" as const }}
              className={`group relative p-6 rounded-2xl border-2 bg-gradient-to-br ${f.color} hover:shadow-xl transition-all duration-300 cursor-default border-border/60 hover:border-current`}
            >
              <div className={`size-11 rounded-xl ${f.iconBg} flex items-center justify-center mb-4 shadow-sm border border-border/40`}>
                <f.icon className={`size-5 ${f.accent}`} />
              </div>
              <h3 className="text-base font-bold mb-2 text-[#1a2744]">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Neutral competitor comparison matrix */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
          className="mt-14"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-3">
              <Zap className="size-5 text-red-600" />
              <h3 className="text-xl font-bold text-[#1a2744]">How CanFlow.ai compares</h3>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              What your procurement team will ask. Evaluated against common competitor categories — general-purpose form builders, workflow-only platforms, and legacy enterprise BPM suites.
            </p>
          </div>

          <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="grid grid-cols-[1fr_100px_100px_100px_100px] bg-[#1a2744] text-white text-xs font-bold px-6 py-3 gap-2">
              <div>Feature / Requirement</div>
              <div className="text-center bg-white/10 rounded-lg py-1.5">CanFlow.ai</div>
              <div className="text-center opacity-60">General Form Builders</div>
              <div className="text-center opacity-60">Workflow-Only</div>
              <div className="text-center opacity-60">Legacy BPM</div>
            </div>
            {COMPETITOR_MATRIX.map((row, i) => (
              <div
                key={row.feature}
                className={cn(
                  "grid grid-cols-[1fr_100px_100px_100px_100px] px-6 py-3.5 gap-2 items-center text-sm border-t border-border",
                  i % 2 === 0 ? "bg-white" : "bg-slate-50"
                )}
              >
                <div className="font-medium text-[#1a2744] text-xs sm:text-sm">{row.feature}</div>
                <div className="flex justify-center"><CellValue val={row.canflow} /></div>
                <div className="flex justify-center"><CellValue val={row.general} /></div>
                <div className="flex justify-center"><CellValue val={row.workflow} /></div>
                <div className="flex justify-center"><CellValue val={row.bpm} /></div>
              </div>
            ))}
            <div className="px-6 py-3 bg-slate-50 border-t border-border text-[10px] text-muted-foreground">
              Partial = limited or add-on required. Competitor categories are generic — no specific product is named or implied.
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-slate-50 border-t border-b py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" as const }}
            className="text-center mb-14"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Getting Started</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance text-[#1a2744]">
              From form design to approved submission — in one platform
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Five steps cover the entire citizen services lifecycle — AI-assisted from start to finish.
            </p>
          </motion.div>

          <div className="relative">
            <div className="hidden lg:block absolute top-14 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-red-200 via-blue-200 to-emerald-200 pointer-events-none" />
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6"
            >
              {HOW_IT_WORKS.map((step) => (
                <motion.div
                  key={step.step}
                  variants={fadeUp}
                  className="flex flex-col items-center text-center"
                >
                  <div className={`relative size-16 rounded-2xl ${step.bg} flex items-center justify-center mb-4 border border-border shadow-sm`}>
                    <step.icon className={`size-7 ${step.color}`} />
                    <span className={`absolute -top-2.5 -right-2.5 size-6 rounded-full bg-white border-2 border-border flex items-center justify-center text-[10px] font-bold ${step.color}`}>
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold mb-2 text-[#1a2744]">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Compliance ────────────────────────────────────────────────────────── */}
      <section id="compliance" className="py-24 bg-[#1a2744] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" as const }}
            className="text-center mb-14"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3">Compliance & Security</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white text-balance">
              Built for compliance from the ground up
            </h2>
            <p className="text-white/70 text-lg max-w-2xl mx-auto">
              PIPEDA compliant, WCAG 2.1 AA at 96%, ITSG-33 controls aligned, Canada data residency, GDPR-aligned, and SOC 2 audit in progress — with complete transparency in our public Trust Centre.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href="/trust"
                target="_blank"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/15 transition-colors cursor-pointer"
              >
                <BadgeCheck className="size-4" />
                View Public Trust Centre
                <ExternalLink className="size-3 opacity-60" />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
            className="flex flex-wrap gap-3 justify-center mb-16"
          >
            {COMPLIANCE_BADGES.map((badge) => (
              <motion.div
                key={badge.label}
                variants={{
                  hidden: { opacity: 0, scale: 0.85 },
                  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
                }}
              >
                <ComplianceBadge badge={badge} />
              </motion.div>
            ))}
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COMPLIANCE_FEATURES.map((cf, i) => (
              <motion.div
                key={cf.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: (i % 3) * 0.08, duration: 0.45, ease: "easeOut" as const }}
                className="p-6 rounded-2xl bg-white/8 border border-white/15 hover:bg-white/12 transition-colors"
              >
                <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                  <cf.icon className="size-5 text-white/80" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-white">{cf.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cf.badgeColor}`}>
                    {cf.badge}
                  </span>
                </div>
                <p className="text-xs text-white/65 leading-relaxed">{cf.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Transparency note */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 text-center"
          >
            <p className="text-white/40 text-xs max-w-2xl mx-auto">
              CanFlow.ai does not claim certifications that have not been obtained. "In Progress" indicates an active third-party audit or assessment underway.
              All compliance posture is documented transparently in the{" "}
              <a href="/trust" className="underline hover:text-white/70">Trust Centre</a>.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Government section ───────────────────────────────────────────────── */}
      <section id="government" className="py-24 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: "easeOut" as const }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    <div className="w-6 h-6 bg-red-600" />
                    <div className="w-6 h-6 bg-white border border-gray-200" />
                    <div className="w-6 h-6 bg-[#1a2744]" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Government of Canada</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5 text-[#1a2744] text-balance">
                  15+ pre-built GC form templates
                </h2>
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                  Start with battle-tested Government of Canada form templates. Every template includes bilingual EN/FR labels, accessible markup, and PIPEDA-compliant privacy notices out of the box.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GC_TEMPLATES.map((t) => (
                    <div key={t} className="flex items-center gap-2 text-sm text-foreground p-2.5 rounded-lg bg-muted/60">
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium text-xs">{t}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" as const }}
              className="flex-1 space-y-4"
            >
              {[
                {
                  icon: Globe,
                  color: "text-red-600",
                  bg: "bg-red-50",
                  title: "Bilingual English / French",
                  desc: "One-click language toggle stored per user. All GC templates include both official languages. Admin UI, email notifications, and PDF exports all support EN/FR. Supports Official Languages Act requirements.",
                },
                {
                  icon: Eye,
                  color: "text-blue-700",
                  bg: "bg-blue-50",
                  title: "WCAG 2.1 AA + Accessible Canada Act",
                  desc: "Every form achieves WCAG 2.1 Level AA conformance (96% platform-wide, June 2026 audit). Screen reader compatible, keyboard-only navigable, proper focus management in multi-step forms, and auto-generated accessibility audit reports.",
                },
                {
                  icon: Shield,
                  color: "text-emerald-700",
                  bg: "bg-emerald-50",
                  title: "ITSG-33 Aligned Security Controls",
                  desc: "Security controls designed to support Government of Canada ITSG-33 Annex 4A objectives. AES-256 at rest, TLS 1.3 in transit, MFA, immutable audit logs, and Canada data residency. Formal ITSG-33 assessment in progress.",
                },
                {
                  icon: Clock,
                  color: "text-violet-700",
                  bg: "bg-violet-50",
                  title: "SLA & Service Standards",
                  desc: "Define service standards per form type (e.g., permit applications resolved within 10 business days). Auto-escalation, SLA dashboards, and compliance reporting aligned to Treasury Board service standards.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 p-5 rounded-xl border border-border bg-white hover:shadow-md transition-shadow">
                  <div className={`size-10 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                    <item.icon className={`size-5 ${item.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1a2744] mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Real Social Proof ─────────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-t border-b py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" as const }}
            className="text-center mb-12"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Open Source & Trusted</p>
            <h2 className="text-3xl font-bold tracking-tight text-[#1a2744] mb-3">
              Built for government teams across Canada
            </h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              Apache 2.0 open source. Auditable. No vendor lock-in. Designed for municipal, provincial, and federal teams.
            </p>
          </motion.div>

          {/* GitHub stats */}
          <div ref={githubStatsRef} className="flex flex-wrap justify-center gap-6 mb-12">
            {[
              { icon: Github, label: "GitHub", value: "Open Source", sub: "github.com/canflow-ai/canflow" },
              { icon: GitFork, label: "Forks", value: "Self-Host Free", sub: "Fork & self-host freely" },
              { icon: Users, label: "Community", value: "Contributions", sub: "Open contributions welcome" },
              { icon: ServerCog, label: "License", value: "Apache 2.0", sub: "Free forever, no CLAs" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={githubInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" as const }}
                className="flex flex-col items-center bg-white border border-border rounded-2xl px-8 py-6 shadow-sm min-w-[160px]"
              >
                <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                  <stat.icon className="size-5 text-slate-700" />
                </div>
                <div className="text-lg font-bold text-[#1a2744]">{stat.value}</div>
                <div className="text-xs font-semibold text-muted-foreground mt-0.5">{stat.label}</div>
                <div className="text-[10px] text-muted-foreground mt-1 text-center">{stat.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* Apache 2.0 badge row */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-border shadow-sm">
              <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="size-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#1a2744]">Apache License 2.0</div>
                <div className="text-xs text-muted-foreground">Permissive open source · No copyleft · Audit every line · Self-host freely</div>
              </div>
              <a
                href="https://github.com/canflow-ai/canflow/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View License <ExternalLink className="size-3" />
              </a>
            </div>
          </div>

          {/* Trusted by sectors */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" as const }}
            className="text-center"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
              Designed for these sectors
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {SECTORS.map((sector) => (
                <div
                  key={sector.label}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white border border-border shadow-sm"
                >
                  <sector.icon className="size-5 text-[#1a2744]" />
                  <span className="text-sm font-semibold text-[#1a2744]">{sector.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" as const }}
            className="text-center mb-14"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance text-[#1a2744]">
              Start free. Scale to enterprise.
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Community edition is 100% open source under Apache 2.0 — free forever, no per-seat licensing. Enterprise adds multi-tenancy, white-labeling, and full government compliance tiers.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start"
          >
            {PRICING.map((plan) => (
              <PricingCard key={plan.name} plan={plan} />
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 text-center text-sm text-muted-foreground"
          >
            All tiers include WCAG 2.1 AA accessible forms, bilingual EN/FR support, and REST API access.
            <span className="mx-2 opacity-40">·</span>
            No per-seat licensing fees on Community.
          </motion.div>
        </div>
      </section>

      {/* ── Open Source ───────────────────────────────────────────────────────── */}
      <section className="bg-[#1a2744] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row gap-10 items-center justify-between">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/20 bg-white/10 text-white text-xs font-bold mb-6 tracking-wide uppercase">
                <Github className="size-3.5" />
                Open Source · Apache 2.0
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 text-balance">
                Fully open. Infinitely extensible.
              </h2>
              <p className="text-white/60 text-base mb-6 max-w-xl leading-relaxed">
                CanFlow.ai's Community edition is free forever under Apache 2.0. Audit every line of code, self-host behind your GC firewall, fork and customize, and contribute back to the community. Zero vendor lock-in — a requirement for responsible government procurement.
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                {[
                  { label: "View on GitHub", icon: Github, href: "https://github.com/canflow-ai/canflow" },
                  { label: "Read the Docs", icon: BookOpen, href: "#" },
                  { label: "Deployment Guide", icon: Layers, href: "#" },
                  { label: "Trust Centre", icon: Shield, href: "/trust" },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors cursor-pointer border border-white/10"
                  >
                    <item.icon className="size-4" />
                    {item.label}
                    <ExternalLink className="size-3 opacity-50" />
                  </a>
                ))}
              </div>
            </div>
            <div className="flex-none bg-white/5 border border-white/10 rounded-2xl p-6 font-mono text-sm text-white/80 min-w-[300px]">
              <div className="text-white/40 mb-3 text-xs">Terminal</div>
              {[
                { prompt: "# Clone the repo", color: "text-white/40" },
                { prompt: "git clone https://github.com/canflow-ai/canflow", color: "text-emerald-400" },
                { prompt: "", color: "" },
                { prompt: "# Start with Docker Compose", color: "text-white/40" },
                { prompt: "cd canflow && docker compose up", color: "text-emerald-400" },
                { prompt: "", color: "" },
                { prompt: "# CanFlow.ai running at:", color: "text-white/40" },
                { prompt: "http://localhost:3000  ✓", color: "text-white" },
              ].map((line, i) => (
                <div key={i} className={`leading-7 ${line.color}`}>{line.prompt || "\u00A0"}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────────── */}
      <section className="py-24 border-t">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" as const }}
            className="text-center mb-12"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">FAQ</p>
            <h2 className="text-3xl font-bold tracking-tight text-[#1a2744]">
              Questions CIOs and procurement teams ask
            </h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="border border-border rounded-xl overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-sm text-[#1a2744] hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setActiveFaqIdx(activeFaqIdx === i ? null : i)}
                >
                  {faq.q}
                  <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-4 ${activeFaqIdx === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {activeFaqIdx === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t">
        <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-700 to-[#1a2744]" />
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" as const }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/30 bg-white/10 text-white/90 text-xs font-bold mb-2 tracking-wide uppercase">
              <FlaskConical className="size-3.5" />
              Ready to modernize government services?
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-balance">
              Start building with CanFlow.ai today.
            </h2>
            <p className="text-red-100 text-lg max-w-lg mx-auto">
              Free forever under Apache 2.0. Enterprise-grade when you need it.
              PIPEDA compliant, WCAG 2.1 AA, bilingual — from day one.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap pt-2">
              <Unauthenticated>
                <SignInButton>
                  <Button
                    size="lg"
                    className="gap-2 bg-white text-red-700 hover:bg-red-50 text-base px-8 font-bold shadow-lg border-0 cursor-pointer"
                  >
                    Start Building Free <ArrowRight className="size-4" />
                  </Button>
                </SignInButton>
              </Unauthenticated>
              <Authenticated>
                <Button
                  size="lg"
                  asChild
                  className="gap-2 bg-white text-red-700 hover:bg-red-50 text-base px-8 font-bold shadow-lg border-0"
                >
                  <Link to="/workflows">Open Dashboard <ArrowRight className="size-4" /></Link>
                </Button>
              </Authenticated>
              <Button
                size="lg"
                variant="ghost"
                className="gap-2 text-base border border-white/30 text-white hover:bg-white/10 font-semibold"
                asChild
              >
                <a href="/trust">
                  <Shield className="size-4" />
                  View Trust Centre
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="bg-[#111827] text-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <Logo light className="mb-4" />
              <p className="text-sm leading-relaxed text-white/50 max-w-xs">
                Open-source, AI-first forms + workflow + analytics platform for governments and regulated enterprises. PIPEDA compliant. WCAG 2.1 AA. SOC 2 in progress.
              </p>
              <div className="flex items-center gap-3 mt-5 flex-wrap">
                <span className="text-xs bg-white/10 px-3 py-1.5 rounded-full font-semibold text-white/70">Apache 2.0</span>
                <span className="text-xs bg-red-900/50 px-3 py-1.5 rounded-full font-semibold text-red-300">PIPEDA Compliant</span>
                <span className="text-xs bg-green-900/50 px-3 py-1.5 rounded-full font-semibold text-green-300">WCAG 2.1 AA</span>
              </div>
            </div>
            {[
              {
                title: "Platform",
                links: [
                  { label: "Form Builder", href: "#features" },
                  { label: "Workflow Engine", href: "#features" },
                  { label: "Submission Portal", href: "#how-it-works" },
                  { label: "Analytics", href: "#features" },
                  { label: "eSignature", href: "#features" },
                  { label: "Document Generation", href: "#features" },
                ],
              },
              {
                title: "Compliance",
                links: [
                  { label: "PIPEDA", href: "/trust" },
                  { label: "WCAG 2.1 AA", href: "/trust" },
                  { label: "ITSG-33 (In Progress)", href: "/trust" },
                  { label: "SOC 2 (In Progress)", href: "/trust" },
                  { label: "Data Residency", href: "/trust" },
                  { label: "Trust Centre", href: "/trust" },
                ],
              },
              {
                title: "Legal & Resources",
                links: [
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Cookie Policy", href: "/cookies" },
                  { label: "Trust Centre", href: "/trust" },
                  { label: "GitHub", href: "https://github.com/canflow-ai/canflow" },
                  { label: "Security", href: "/trust" },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">{col.title}</div>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        target={l.href.startsWith("http") ? "_blank" : undefined}
                        rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="text-sm hover:text-white transition-colors"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/30">
            <div>
              &copy; {new Date().getFullYear()} AOT Technologies Inc. CanFlow.ai is released under the{" "}
              <a href="https://github.com/canflow-ai/canflow/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Apache 2.0 License</a>.
              {" "}Incorporated in British Columbia, Canada.
            </div>
            <div className="flex gap-6 flex-wrap justify-center">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="/cookies" className="hover:text-white transition-colors">Cookie Policy</a>
              <a href="/trust" className="hover:text-white transition-colors">Trust Centre</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
