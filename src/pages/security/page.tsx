/**
 * Enterprise Security & Compliance page
 * Tabs: Overview · Audit Log · SSO/Identity · Data & Privacy · Erasure Requests
 */
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Separator } from "@/components/ui/separator.tsx";

import {
  ShieldCheck, Lock, Key, Globe, Database, Users, AlertTriangle,
  CheckCircle2, XCircle, Clock, FileText, Trash2, Plus, RefreshCw,
  Building2, Eye, Activity, ChevronDown, ChevronUp, Info,
  ShieldAlert, UserX, Server, Fingerprint,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useTenant } from "@/contexts/tenant-context.tsx";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type ErasureStatus = "pending" | "in_review" | "completed" | "rejected";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome: "success" | "failure" | "warning" }) {
  if (outcome === "success") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Success</Badge>;
  if (outcome === "failure") return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Failure</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Warning</Badge>;
}

function ErasureStatusBadge({ status }: { status: ErasureStatus }) {
  const map: Record<ErasureStatus, { label: string; className: string }> = {
    pending:   { label: "Pending",    className: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100" },
    in_review: { label: "In Review",  className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100" },
    completed: { label: "Completed",  className: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100" },
    rejected:  { label: "Rejected",   className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100" },
  };
  const { label, className } = map[status];
  return <Badge className={className}>{label}</Badge>;
}

function CategoryIcon({ category }: { category: string }) {
  const iconMap: Record<string, React.ElementType> = {
    auth: Fingerprint,
    data: Database,
    admin: Users,
    api: Globe,
    compliance: ShieldCheck,
  };
  const Icon = iconMap[category] ?? Activity;
  return <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />;
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ tenantId }: { tenantId: string }) {
  const policy = useQuery(api.security.policies.get, { tenantId: tenantId as never });
  const logs = useQuery(api.security.auditLogs.list, { tenantId: tenantId as never, limit: 10 });

  const frameworks = [
    { id: "pipeda",      label: "PIPEDA",        desc: "Personal Information Protection and Electronic Documents Act" },
    { id: "protected_b", label: "PROTECTED B",   desc: "Government of Canada data classification" },
    { id: "gdpr",        label: "GDPR",           desc: "General Data Protection Regulation" },
    { id: "hipaa",       label: "HIPAA",          desc: "Health Insurance Portability and Accountability Act" },
    { id: "soc2",        label: "SOC 2 Type II",  desc: "Service Organization Control 2" },
    { id: "iso27001",    label: "ISO 27001",       desc: "Information Security Management" },
  ];

  const enabledFrameworks = new Set(policy?.frameworks ?? []);

  const securityItems = [
    {
      icon: Fingerprint,
      label: "MFA Enforcement",
      value: policy?.mfaRequired ? "Required for all users" : "Optional",
      ok: policy?.mfaRequired ?? false,
    },
    {
      icon: Clock,
      label: "Session Timeout",
      value: policy ? (policy.sessionTimeoutMinutes === 0 ? "Never" : `${policy.sessionTimeoutMinutes} minutes`) : "Loading…",
      ok: (policy?.sessionTimeoutMinutes ?? 0) > 0,
    },
    {
      icon: Globe,
      label: "IP Allowlisting",
      value: policy ? (policy.ipAllowlist.length === 0 ? "Disabled" : `${policy.ipAllowlist.length} range(s)`) : "Loading…",
      ok: (policy?.ipAllowlist.length ?? 0) > 0,
    },
    {
      icon: Server,
      label: "SSO / Identity Provider",
      value: policy?.ssoEnabled ? `Enabled (${policy.ssoProvider ?? "configured"})` : "Disabled",
      ok: policy?.ssoEnabled ?? false,
    },
    {
      icon: Database,
      label: "Data Retention Policy",
      value: policy ? (policy.dataRetentionDays === 0 ? "Indefinite" : `${policy.dataRetentionDays} days`) : "Loading…",
      ok: (policy?.dataRetentionDays ?? 0) > 0,
    },
    {
      icon: Trash2,
      label: "Auto-purge",
      value: policy?.autoPurgeEnabled ? "Enabled" : "Disabled",
      ok: policy?.autoPurgeEnabled ?? false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Security posture */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            Security Posture
          </CardTitle>
          <CardDescription>Current security configuration for this tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          {policy === undefined ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {securityItems.map((item) => (
                <div key={item.label} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className={cn("flex size-8 items-center justify-center rounded-md shrink-0", item.ok ? "bg-emerald-100" : "bg-muted")}>
                    <item.icon className={cn("size-4", item.ok ? "text-emerald-700" : "text-muted-foreground")} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium truncate">{item.value}</p>
                  </div>
                  {item.ok
                    ? <CheckCircle2 className="size-4 text-emerald-600 shrink-0 ml-auto" aria-label="Enabled" />
                    : <AlertTriangle className="size-4 text-amber-500 shrink-0 ml-auto" aria-label="Disabled or not configured" />
                  }
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance frameworks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="size-5 text-primary" aria-hidden="true" />
            Compliance Frameworks
          </CardTitle>
          <CardDescription>Frameworks acknowledged and applied to this tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {frameworks.map((f) => {
              const active = enabledFrameworks.has(f.id);
              return (
                <div key={f.id} className={cn("rounded-lg border p-3 transition-colors", active ? "border-primary/30 bg-primary/5" : "opacity-50")}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{f.label}</span>
                    {active
                      ? <CheckCircle2 className="size-4 text-emerald-600" aria-label="Enabled" />
                      : <XCircle className="size-4 text-muted-foreground" aria-label="Not enabled" />
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent audit activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-5 text-primary" aria-hidden="true" />
            Recent Security Events
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs === undefined ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No security events recorded yet.</p>
          ) : (
            <div className="divide-y">
              {logs.slice(0, 8).map((log) => (
                <div key={log._id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <CategoryIcon category={log.category} />
                  <span className="flex-1 truncate text-muted-foreground">{log.description}</span>
                  <OutcomeBadge outcome={log.outcome} />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(log.timestamp), "MMM d, HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Audit Log tab ────────────────────────────────────────────────────────────

function AuditLogTab({ tenantId }: { tenantId: string }) {
  const [category, setCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const logs = useQuery(api.security.auditLogs.list, {
    tenantId: tenantId as never,
    category: category !== "all" ? category : undefined,
    limit: 200,
  });

  const categories = [
    { id: "all", label: "All Events" },
    { id: "auth", label: "Auth" },
    { id: "data", label: "Data" },
    { id: "admin", label: "Admin" },
    { id: "api", label: "API" },
    { id: "compliance", label: "Compliance" },
  ];

  const exportCsv = () => {
    if (!logs) return;
    const header = "timestamp,category,action,outcome,actor,description,resourceType,resourceId";
    const rows = logs.map((l) =>
      [l.timestamp, l.category, l.action, l.outcome, l.actorEmail ?? "", `"${l.description}"`, l.resourceType ?? "", l.resourceId ?? ""].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                category === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              )}
              aria-pressed={category === c.id}
            >
              {c.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={exportCsv} className="gap-2 shrink-0">
          <FileText className="size-4" aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {logs === undefined ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <p className="p-6 text-sm text-center text-muted-foreground">No audit events found.</p>
          ) : (
            <div role="list" aria-label="Audit log entries">
              {logs.map((log) => {
                const expanded = expandedId === log._id;
                return (
                  <div key={log._id} role="listitem" className="border-b last:border-b-0">
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset transition-colors"
                      onClick={() => setExpandedId(expanded ? null : log._id)}
                      aria-expanded={expanded}
                    >
                      <CategoryIcon category={log.category} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{log.action}</span>
                        <span className="block text-xs text-muted-foreground truncate">{log.actorEmail ?? "System"}</span>
                      </span>
                      <OutcomeBadge outcome={log.outcome} />
                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                        {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                      </span>
                      {expanded
                        ? <ChevronUp className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                        : <ChevronDown className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                      }
                    </button>
                    {expanded && (
                      <div className="bg-muted/20 px-4 pb-3 pt-1 text-xs space-y-1 text-muted-foreground">
                        <p><span className="font-medium text-foreground">Description:</span> {log.description}</p>
                        {log.resourceType && <p><span className="font-medium text-foreground">Resource:</span> {log.resourceType} {log.resourceId && `— ${log.resourceId}`}</p>}
                        {log.ipAddress && <p><span className="font-medium text-foreground">IP:</span> {log.ipAddress}</p>}
                        <p><span className="font-medium text-foreground">Timestamp:</span> {new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── SSO tab ──────────────────────────────────────────────────────────────────

function SsoTab({ tenantId }: { tenantId: string }) {
  const policy = useQuery(api.security.policies.get, { tenantId: tenantId as never });
  const upsert = useMutation(api.security.policies.upsert);
  const [saving, setSaving] = useState(false);
  const [ssoProvider, setSsoProvider] = useState<string>(policy?.ssoProvider ?? "azure_ad");
  const [ssoEnabled, setSsoEnabled] = useState(policy?.ssoEnabled ?? false);
  const [mfaRequired, setMfaRequired] = useState(policy?.mfaRequired ?? false);
  const [sessionTimeout, setSessionTimeout] = useState(String(policy?.sessionTimeoutMinutes ?? 480));

  const providers = [
    { id: "azure_ad",         label: "Microsoft Azure AD / Entra ID",  desc: "SAML 2.0 & OIDC — most common for GC departments" },
    { id: "okta",             label: "Okta",                           desc: "Enterprise identity platform with SAML 2.0 & OIDC" },
    { id: "google_workspace", label: "Google Workspace",               desc: "SAML 2.0 for Google-based organizations" },
    { id: "saml2",            label: "Custom SAML 2.0",                desc: "Any SAML 2.0 compliant identity provider" },
    { id: "oidc",             label: "Custom OIDC",                    desc: "OpenID Connect 1.0 provider" },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsert({
        tenantId: tenantId as never,
        ssoEnabled,
        ssoProvider: ssoProvider as never,
        mfaRequired,
        sessionTimeoutMinutes: parseInt(sessionTimeout) || 480,
      });
      toast.success("Identity configuration saved.");
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to save configuration.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* SSO */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="size-5 text-primary" aria-hidden="true" />
            Single Sign-On (SSO)
          </CardTitle>
          <CardDescription>
            Connect an identity provider to enable enterprise SSO for your organization.
            SAML 2.0 and OIDC are both supported.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="sso-toggle" className="text-sm font-medium">Enable SSO</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Redirect all sign-ins through your identity provider.</p>
            </div>
            <Switch
              id="sso-toggle"
              checked={ssoEnabled}
              onCheckedChange={setSsoEnabled}
              aria-label="Enable SSO"
            />
          </div>

          {ssoEnabled && (
            <div className="space-y-3">
              <Label htmlFor="sso-provider" className="text-sm font-medium">Identity Provider</Label>
              <Select value={ssoProvider} onValueChange={setSsoProvider}>
                <SelectTrigger id="sso-provider" aria-label="Select identity provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div>
                        <span className="font-medium">{p.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3">
                <div className="flex gap-2">
                  <Info className="size-4 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="text-xs text-blue-800 dark:text-blue-300">
                    <p className="font-semibold mb-1">Integration Steps</p>
                    <ol className="space-y-1 list-decimal list-inside">
                      <li>Register CanFlow.ai as a SAML/OIDC application in your provider console.</li>
                      <li>Set the Assertion Consumer Service (ACS) URL to your CanFlow subdomain.</li>
                      <li>Map the email attribute to the standard OIDC <code className="font-mono bg-blue-100 px-1 rounded">email</code> claim.</li>
                      <li>Contact your CanFlow.ai administrator to finalize the metadata exchange.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MFA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Fingerprint className="size-5 text-primary" aria-hidden="true" />
            Multi-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="mfa-toggle" className="text-sm font-medium">Require MFA for all users</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Users must enroll in MFA before accessing the platform.</p>
            </div>
            <Switch
              id="mfa-toggle"
              checked={mfaRequired}
              onCheckedChange={setMfaRequired}
              aria-label="Require MFA"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-timeout" className="text-sm font-medium">
              Session Timeout (minutes)
            </Label>
            <Input
              id="session-timeout"
              type="number"
              min={0}
              max={10080}
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              placeholder="480"
              aria-describedby="session-timeout-hint"
            />
            <p id="session-timeout-hint" className="text-xs text-muted-foreground">
              0 = never expire. Recommended: 480 (8 hours) for GC workstations.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <RefreshCw className="size-4 animate-spin" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
        Save Identity Configuration
      </Button>
    </div>
  );
}

// ─── Data & Privacy tab ───────────────────────────────────────────────────────

const retentionSchema = z.object({
  dataRetentionDays: z.coerce.number().min(0).max(36500),
  autoPurgeEnabled: z.boolean(),
  ipAllowlist: z.string(),
  frameworks: z.array(z.string()),
});
type RetentionForm = z.infer<typeof retentionSchema>;

function DataPrivacyTab({ tenantId }: { tenantId: string }) {
  const policy = useQuery(api.security.policies.get, { tenantId: tenantId as never });
  const upsert = useMutation(api.security.policies.upsert);

  const allFrameworks = [
    { id: "pipeda",       label: "PIPEDA" },
    { id: "protected_b",  label: "PROTECTED B" },
    { id: "gdpr",         label: "GDPR" },
    { id: "hipaa",        label: "HIPAA" },
    { id: "soc2",         label: "SOC 2 Type II" },
    { id: "iso27001",     label: "ISO 27001" },
  ];

  const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm<RetentionForm>({
    resolver: zodResolver(retentionSchema),
    values: {
      dataRetentionDays: policy?.dataRetentionDays ?? 2555,
      autoPurgeEnabled: policy?.autoPurgeEnabled ?? false,
      ipAllowlist: policy?.ipAllowlist.join("\n") ?? "",
      frameworks: policy?.frameworks ?? ["pipeda", "protected_b"],
    },
  });

  const selectedFrameworks = watch("frameworks");
  const autoPurge = watch("autoPurgeEnabled");

  const toggleFramework = (id: string) => {
    const current = selectedFrameworks ?? [];
    setValue("frameworks", current.includes(id) ? current.filter((f) => f !== id) : [...current, id]);
  };

  const onSubmit = async (data: RetentionForm) => {
    try {
      await upsert({
        tenantId: tenantId as never,
        dataRetentionDays: data.dataRetentionDays,
        autoPurgeEnabled: data.autoPurgeEnabled,
        ipAllowlist: data.ipAllowlist.split("\n").map((s) => s.trim()).filter(Boolean),
        frameworks: data.frameworks,
      });
      toast.success("Data & privacy settings saved.");
    } catch (err) {
      toast.error("Failed to save settings.");
    }
  };

  if (policy === undefined) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl" noValidate>
      {/* Retention */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="size-5 text-primary" aria-hidden="true" />
            Data Retention
          </CardTitle>
          <CardDescription>
            Set how long submissions and personal data are retained. 2555 days (7 years) is the
            Canadian federal standard for many program records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="retention-days" className="text-sm font-medium">Retention Period (days)</Label>
            <Input
              id="retention-days"
              type="number"
              min={0}
              max={36500}
              {...register("dataRetentionDays")}
              aria-describedby="retention-hint"
            />
            <p id="retention-hint" className="text-xs text-muted-foreground">0 = retain indefinitely.</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="auto-purge" className="text-sm font-medium">Auto-purge expired records</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically delete submissions older than the retention period.
              </p>
            </div>
            <Switch
              id="auto-purge"
              checked={autoPurge}
              onCheckedChange={(val) => setValue("autoPurgeEnabled", val)}
              aria-label="Enable auto-purge"
            />
          </div>
        </CardContent>
      </Card>

      {/* IP Allowlist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="size-5 text-primary" aria-hidden="true" />
            IP Allowlist
          </CardTitle>
          <CardDescription>
            Restrict access to specific IP ranges (CIDR notation). One range per line.
            Leave blank to allow all IPs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="ip-allowlist" className="sr-only">IP ranges (one per line)</Label>
          <Textarea
            id="ip-allowlist"
            {...register("ipAllowlist")}
            placeholder={"192.168.1.0/24\n10.0.0.0/8\n198.51.100.0/24"}
            rows={4}
            className="font-mono text-sm"
            aria-label="IP ranges, one per line in CIDR notation"
          />
        </CardContent>
      </Card>

      {/* Compliance frameworks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            Compliance Frameworks
          </CardTitle>
          <CardDescription>Select all frameworks that apply to this tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="group" aria-label="Compliance frameworks">
            {allFrameworks.map((f) => {
              const active = (selectedFrameworks ?? []).includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFramework(f.id)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "bg-primary/10 border-primary text-primary" : "hover:bg-muted"
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting} className="gap-2">
        {isSubmitting ? <RefreshCw className="size-4 animate-spin" aria-hidden="true" /> : <Database className="size-4" aria-hidden="true" />}
        Save Data & Privacy Settings
      </Button>
    </form>
  );
}

// ─── Erasure Requests tab ─────────────────────────────────────────────────────

const erasureSchema = z.object({
  subjectEmail: z.string().email("Valid email required"),
  subjectName: z.string().optional(),
  reason: z.string().optional(),
});
type ErasureForm = z.infer<typeof erasureSchema>;

function ErasureTab({ tenantId }: { tenantId: string }) {
  const requests = useQuery(api.security.erasure.list, { tenantId: tenantId as never });
  const createRequest = useMutation(api.security.erasure.create);
  const updateStatus = useMutation(api.security.erasure.updateStatus);
  const [showCreate, setShowCreate] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ErasureForm>({
    resolver: zodResolver(erasureSchema),
  });

  const filtered = requests?.filter((r) => statusFilter === "all" || r.status === statusFilter) ?? [];

  const onCreateSubmit = async (data: ErasureForm) => {
    try {
      await createRequest({ tenantId: tenantId as never, ...data });
      toast.success("Erasure request created.");
      reset();
      setShowCreate(false);
    } catch {
      toast.error("Failed to create erasure request.");
    }
  };

  const moveStatus = async (id: string, status: ErasureStatus) => {
    setProcessingId(id);
    try {
      await updateStatus({ requestId: id as never, status });
      toast.success(`Request marked as ${status}.`);
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "in_review", "completed", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
              )}
              aria-pressed={statusFilter === s}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
          <Plus className="size-4" aria-hidden="true" />
          New Request
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {requests === undefined ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <UserX className="size-10 mx-auto text-muted-foreground mb-3" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No erasure requests found.</p>
              <p className="text-xs text-muted-foreground mt-1">
                GDPR and PIPEDA right-to-erasure requests will appear here.
              </p>
            </div>
          ) : (
            <div role="list" aria-label="Erasure requests">
              {filtered.map((req) => (
                <div key={req._id} role="listitem" className="flex flex-col sm:flex-row sm:items-center gap-3 border-b last:border-b-0 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{req.subjectEmail}</p>
                    {req.subjectName && <p className="text-xs text-muted-foreground">{req.subjectName}</p>}
                    <p className="text-xs text-muted-foreground">
                      Requested {format(new Date(req.requestedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <ErasureStatusBadge status={req.status as ErasureStatus} />
                  <div className="flex gap-2">
                    {req.status === "pending" && (
                      <Button
                        size="sm" variant="secondary"
                        disabled={processingId === req._id}
                        onClick={() => moveStatus(req._id, "in_review")}
                        aria-label={`Mark ${req.subjectEmail} request as in review`}
                      >
                        Review
                      </Button>
                    )}
                    {req.status === "in_review" && (
                      <>
                        <Button
                          size="sm"
                          disabled={processingId === req._id}
                          onClick={() => moveStatus(req._id, "completed")}
                          aria-label={`Mark ${req.subjectEmail} request as completed`}
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm" variant="secondary"
                          disabled={processingId === req._id}
                          onClick={() => moveStatus(req._id, "rejected")}
                          aria-label={`Reject ${req.subjectEmail} request`}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent aria-describedby="erasure-dialog-desc">
          <DialogHeader>
            <DialogTitle>New Right-to-Erasure Request</DialogTitle>
          </DialogHeader>
          <p id="erasure-dialog-desc" className="text-sm text-muted-foreground -mt-2">
            GDPR Article 17 / PIPEDA Principle 4.9 — record the data subject's request for deletion of personal data.
          </p>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="subject-email">Subject Email <span aria-hidden="true">*</span></Label>
              <Input
                id="subject-email"
                type="email"
                {...register("subjectEmail")}
                placeholder="citizen@example.gc.ca"
                aria-required="true"
                aria-describedby={errors.subjectEmail ? "email-error" : undefined}
              />
              {errors.subjectEmail && (
                <p id="email-error" className="text-xs text-destructive" role="alert">{errors.subjectEmail.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject-name">Subject Name (optional)</Label>
              <Input id="subject-name" {...register("subjectName")} placeholder="Jane Smith" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="erasure-reason">Reason (optional)</Label>
              <Textarea id="erasure-reason" {...register("reason")} rows={3} placeholder="Reason provided by the data subject…" />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <RefreshCw className="size-4 animate-spin" aria-hidden="true" />}
                Create Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function SecurityContent() {
  const { activeTenant } = useTenant();
  const [tab, setTab] = useState("overview");

  if (!activeTenant) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <ShieldAlert className="size-10 mx-auto text-muted-foreground mb-3" aria-hidden="true" />
          <p className="font-semibold">No tenant selected</p>
          <p className="text-sm text-muted-foreground mt-1">Select a tenant from the sidebar to manage security settings.</p>
        </div>
      </div>
    );
  }

  const tenantId = activeTenant._id as string;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" } as const}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="size-6 text-primary" aria-hidden="true" />
              Enterprise Security & Compliance
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              SSO, MFA, audit logs, data retention, GDPR/PIPEDA erasure — for <strong>{activeTenant.name}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="gap-1">
              <Lock className="size-3" aria-hidden="true" />
              Enterprise
            </Badge>
            <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-700">
              <ShieldCheck className="size-3" aria-hidden="true" />
              PROTECTED B Ready
            </Badge>
          </div>
        </div>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="overview" className="gap-1.5">
            <Eye className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <Activity className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Audit Log</span>
          </TabsTrigger>
          <TabsTrigger value="sso" className="gap-1.5">
            <Key className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">SSO / Identity</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5">
            <Database className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Data & Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="erasure" className="gap-1.5">
            <UserX className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Erasure</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditLogTab tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="sso" className="mt-4">
          <SsoTab tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="data" className="mt-4">
          <DataPrivacyTab tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="erasure" className="mt-4">
          <ErasureTab tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex h-full items-center justify-center p-8">
          <div className="text-center space-y-3">
            <ShieldCheck className="size-10 mx-auto text-muted-foreground" aria-hidden="true" />
            <p className="text-lg font-semibold">Sign in to manage security settings</p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="p-6 space-y-4 max-w-5xl mx-auto">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AuthLoading>
      <Authenticated>
        <SecurityContent />
      </Authenticated>
    </>
  );
}
