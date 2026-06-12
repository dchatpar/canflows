/**
 * Admin Console & Platform Governance
 * Tabs: Overview · Tenants · Users · Workflows · Seats
 */
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format, formatDistanceToNow } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";

import {
  ShieldCheck, Users, Building2, GitBranch, FileText, Database,
  Activity, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Zap,
  Search, Clock, BarChart3, Server, UserCheck, UserX, Layers,
  StopCircle, Play, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useUserRole } from "@/hooks/use-user-role.ts";
import { useNavigate } from "react-router-dom";

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color = "text-primary", loading,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
  color?: string; loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div className={cn("flex size-10 items-center justify-center rounded-lg bg-muted shrink-0")}>
          <Icon className={cn("size-5", color)} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading
            ? <Skeleton className="h-6 w-16 mt-1" />
            : <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
          }
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const health = useQuery(api.adminConsole.systemHealth, {});
  const stuck = useQuery(api.adminConsole.stuckExecutions, { thresholdHours: 1 });
  const loading = health === undefined;

  const kpis = [
    { icon: Users,     label: "Total Users",     value: health?.totals.users ?? 0,       color: "text-blue-600" },
    { icon: Building2, label: "Tenants",          value: health?.totals.tenants ?? 0,     color: "text-violet-600" },
    { icon: FileText,  label: "Forms",            value: health?.totals.forms ?? 0,       color: "text-amber-600" },
    { icon: Database,  label: "Submissions",      value: health?.totals.submissions ?? 0, color: "text-emerald-600" },
    { icon: GitBranch, label: "Workflows",        value: health?.totals.workflows ?? 0,   color: "text-sky-600" },
    { icon: Zap,       label: "Executions",       value: health?.totals.executions ?? 0,  color: "text-orange-600" },
  ];

  const execStats = [
    { label: "Running",   value: health?.executions.running ?? 0,   color: "bg-blue-500" },
    { label: "Success",   value: health?.executions.success ?? 0,    color: "bg-emerald-500" },
    { label: "Failed",    value: health?.executions.failed ?? 0,     color: "bg-red-500" },
    { label: "Cancelled", value: health?.executions.cancelled ?? 0,  color: "bg-gray-400" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} loading={loading} />
        ))}
      </div>

      {/* System status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4 text-primary" aria-hidden="true" />
              Execution Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <>
                {execStats.map((s) => {
                  const total = execStats.reduce((acc, e) => acc + e.value, 0) || 1;
                  const pct = Math.round((s.value / total) * 100);
                  return (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="w-20 text-xs text-muted-foreground">{s.label}</span>
                      <div className="flex-1">
                        <Progress value={pct} className="h-2" aria-label={`${s.label}: ${s.value}`} />
                      </div>
                      <span className="w-10 text-right text-sm font-medium tabular-nums">{s.value}</span>
                    </div>
                  );
                })}
                {(stuck?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                    <span><strong>{stuck!.length}</strong> stuck execution{stuck!.length !== 1 ? "s" : ""} detected — check Workflows tab</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="size-4 text-destructive" aria-hidden="true" />
              Recent Execution Errors
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (health?.recentErrors.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="size-8 text-emerald-500" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">No recent errors</p>
              </div>
            ) : (
              <div className="divide-y">
                {health!.recentErrors.map((e) => (
                  <div key={e._id} className="px-4 py-2.5 text-xs">
                    <p className="font-medium text-foreground truncate">{e.error ?? "Unknown error"}</p>
                    <p className="text-muted-foreground">{format(new Date(e.startedAt), "MMM d, HH:mm")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <Info className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          This console is visible to <strong>Super Admins</strong> and <strong>Org Admins</strong> only.
          Changes here affect all tenants and users on the platform.
        </span>
      </div>
    </div>
  );
}

// ─── Tenants tab ──────────────────────────────────────────────────────────────

function TenantsTab() {
  const usage = useQuery(api.adminConsole.tenantUsage, {});
  const [search, setSearch] = useState("");

  const filtered = (usage ?? []).filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search tenants…"
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tenants"
          />
        </div>
        <span className="text-xs text-muted-foreground">{usage?.length ?? 0} tenants</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {usage === undefined ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-center text-muted-foreground">No tenants found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tenant</th>
                    <th className="px-3 py-3 text-center font-medium text-muted-foreground">Members</th>
                    <th className="px-3 py-3 text-center font-medium text-muted-foreground">Forms</th>
                    <th className="px-3 py-3 text-center font-medium text-muted-foreground">Published</th>
                    <th className="px-3 py-3 text-center font-medium text-muted-foreground">Submissions</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">
                            {t.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{t.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{t.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums">{t.memberCount}</td>
                      <td className="px-3 py-3 text-center tabular-nums">{t.formCount}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className="text-xs">{t.publishedFormCount}</Badge>
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums font-medium">{t.submissionCount}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                        {format(new Date(t.createdAt), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Workflows / Stuck tab ────────────────────────────────────────────────────

function WorkflowsTab() {
  const stuck = useQuery(api.adminConsole.stuckExecutions, { thresholdHours: 1 });
  const cancelExecution = useMutation(api.adminConsole.cancelExecution);
  const retryExecution = useMutation(api.adminConsole.retryExecution);
  const [actionTarget, setActionTarget] = useState<{ id: string; action: "cancel" | "retry" } | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAction = async () => {
    if (!actionTarget) return;
    setProcessing(actionTarget.id);
    try {
      if (actionTarget.action === "cancel") {
        await cancelExecution({ executionId: actionTarget.id as never, reason: "Cancelled by admin — stuck execution" });
        toast.success("Execution cancelled.");
      } else {
        await retryExecution({ executionId: actionTarget.id as never });
        toast.success("Execution reset to running.");
      }
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Action failed.");
      }
    } finally {
      setProcessing(null);
      setActionTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <Clock className="size-4 shrink-0" aria-hidden="true" />
        <span>
          Executions running for <strong>over 1 hour</strong> are considered stuck.
          Use admin override to cancel or reset them.
        </span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <StopCircle className="size-4 text-amber-500" aria-hidden="true" />
            Stuck Executions
            {(stuck?.length ?? 0) > 0 && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 ml-1">
                {stuck!.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stuck === undefined ? (
            <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : stuck.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CheckCircle2 className="size-10 text-emerald-500" aria-hidden="true" />
              <p className="text-sm font-medium">All executions are healthy</p>
              <p className="text-xs text-muted-foreground">No stuck workflows detected in the past hour.</p>
            </div>
          ) : (
            <div role="list" aria-label="Stuck executions">
              {stuck.map((e) => (
                <div key={e._id} role="listitem" className="flex flex-col sm:flex-row sm:items-center gap-3 border-b last:border-0 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{e.workflowName}</p>
                    <p className="text-xs text-muted-foreground">
                      Started {format(new Date(e.startedAt), "MMM d, HH:mm")} ·
                      <span className="text-amber-600 font-medium"> {e.runningForMinutes}m running</span>
                    </p>
                    {e.error && <p className="text-xs text-destructive mt-0.5 truncate">{e.error}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm" variant="secondary"
                      disabled={processing === e._id}
                      onClick={() => setActionTarget({ id: e._id, action: "cancel" })}
                      className="gap-1.5"
                      aria-label={`Cancel execution for ${e.workflowName}`}
                    >
                      <StopCircle className="size-3.5" aria-hidden="true" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={processing === e._id}
                      onClick={() => setActionTarget({ id: e._id, action: "retry" })}
                      className="gap-1.5"
                      aria-label={`Retry execution for ${e.workflowName}`}
                    >
                      <Play className="size-3.5" aria-hidden="true" />
                      Reset
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" aria-hidden="true" />
              {actionTarget?.action === "cancel" ? "Cancel execution?" : "Reset execution?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget?.action === "cancel"
                ? "This will mark the execution as cancelled. This cannot be undone."
                : "This will reset the execution status to 'running'. The workflow scheduler will attempt to resume it."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Dismiss</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={actionTarget?.action === "cancel" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Seats tab ────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  super_admin:  "bg-purple-100 text-purple-800 border-purple-200",
  org_admin:    "bg-blue-100 text-blue-800 border-blue-200",
  form_designer:"bg-sky-100 text-sky-800 border-sky-200",
  reviewer:     "bg-green-100 text-green-800 border-green-200",
  public:       "bg-gray-100 text-gray-600 border-gray-200",
};
const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", org_admin: "Org Admin",
  form_designer: "Form Designer", reviewer: "Reviewer", public: "Public",
};

function SeatsTab() {
  const seats = useQuery(api.adminConsole.seatSummary, {});

  const total = seats?.totalUsers ?? 0;
  const roleOrder = ["super_admin", "org_admin", "form_designer", "reviewer", "public"];

  return (
    <div className="space-y-6">
      {/* Role distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="size-4 text-primary" aria-hidden="true" />
            Platform Role Distribution
          </CardTitle>
          <CardDescription>{total} users total across all tenants</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {seats === undefined ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : (
            roleOrder.map((role) => {
              const count = seats.byRole[role] ?? 0;
              const pct = total === 0 ? 0 : Math.round((count / total) * 100);
              return (
                <div key={role} className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn("w-28 text-center text-[11px] justify-center shrink-0", ROLE_COLORS[role])}
                  >
                    {ROLE_LABELS[role]}
                  </Badge>
                  <div className="flex-1">
                    <Progress value={pct} className="h-2" aria-label={`${ROLE_LABELS[role]}: ${count} users`} />
                  </div>
                  <span className="w-8 text-right text-sm font-medium tabular-nums">{count}</span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Per-tenant seats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="size-4 text-primary" aria-hidden="true" />
            Seat Usage by Tenant
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {seats === undefined ? (
            <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : seats.tenantSeats.length === 0 ? (
            <p className="p-6 text-sm text-center text-muted-foreground">No tenants yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tenant</th>
                    <th className="px-3 py-3 text-center font-medium text-muted-foreground">Members</th>
                    <th className="px-3 py-3 text-center font-medium text-muted-foreground">Admins</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Seat Usage</th>
                  </tr>
                </thead>
                <tbody>
                  {seats.tenantSeats.map((t) => {
                    const maxSeats = 50; // placeholder
                    const pct = Math.min(100, Math.round((t.seats / maxSeats) * 100));
                    return (
                      <tr key={t.tenantId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{t.tenantName}</td>
                        <td className="px-3 py-3 text-center tabular-nums">{t.seats}</td>
                        <td className="px-3 py-3 text-center">
                          <Badge variant="outline" className="text-xs">{t.admins}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-2 flex-1" aria-label={`${t.tenantName}: ${t.seats} seats`} />
                            <span className="text-xs text-muted-foreground w-16 shrink-0">{t.seats}/{maxSeats} seats</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function AdminConsoleContent() {
  const role = useUserRole();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  if (role === undefined) {
    return (
      <div className="p-6 space-y-4 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-6 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      </div>
    );
  }

  if (role !== "super_admin" && role !== "org_admin") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <ShieldCheck className="size-12 text-muted-foreground/40" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          You need Org Admin or Super Admin role to access the Admin Console.
        </p>
        <Button onClick={() => navigate("/workflows")}>Back to Workflows</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" } as const}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Server className="size-6 text-primary" aria-hidden="true" />
              Admin Console
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Platform governance — system health, tenant management, seat tracking, and workflow oversight.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="gap-1 border-purple-300 text-purple-700">
              <ShieldCheck className="size-3" aria-hidden="true" />
              {role === "super_admin" ? "Super Admin" : "Org Admin"}
            </Badge>
          </div>
        </div>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="tenants" className="gap-1.5">
            <Building2 className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Tenants</span>
          </TabsTrigger>
          <TabsTrigger value="workflows" className="gap-1.5">
            <GitBranch className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Workflows</span>
          </TabsTrigger>
          <TabsTrigger value="seats" className="gap-1.5">
            <Users className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Seats</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        <TabsContent value="tenants" className="mt-4"><TenantsTab /></TabsContent>
        <TabsContent value="workflows" className="mt-4"><WorkflowsTab /></TabsContent>
        <TabsContent value="seats" className="mt-4"><SeatsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminConsolePage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex h-full items-center justify-center p-8">
          <div className="text-center space-y-3">
            <Server className="size-10 mx-auto text-muted-foreground" aria-hidden="true" />
            <p className="text-lg font-semibold">Sign in to access the Admin Console</p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="p-6 space-y-4 max-w-6xl mx-auto">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AuthLoading>
      <Authenticated>
        <AdminConsoleContent />
      </Authenticated>
    </>
  );
}
