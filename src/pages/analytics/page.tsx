/**
 * Analytics & Reporting Dashboard
 * Submission volume, status breakdown, SLA compliance, reviewer workload,
 * eSignature metrics, top forms, processing time — with CSV export.
 */
import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useTenant } from "@/contexts/tenant-context.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import {
  BarChart3, FileText, CheckCircle2, Clock, ShieldCheck, PenLine,
  Download, TrendingUp, TrendingDown, Minus, Users, AlertTriangle, Activity,
} from "lucide-react";

// ─── Colour palette ────────────────────────────────────────────────────────────

const COLORS = {
  primary: "hsl(var(--primary))",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  purple: "#a855f7",
  orange: "#f97316",
  teal: "#14b8a6",
  slate: "#94a3b8",
};

const STATUS_COLORS: Record<string, string> = {
  submitted: COLORS.blue,
  under_review: COLORS.yellow,
  approved: COLORS.green,
  rejected: COLORS.red,
  returned: COLORS.orange,
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: COLORS.red,
  high: COLORS.orange,
  normal: COLORS.blue,
  low: COLORS.slate,
  unset: "#cbd5e1",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | undefined, unit = "") {
  if (n === undefined) return "—";
  return `${n}${unit}`;
}

function Trend({ value, good = "up" }: { value: number; good?: "up" | "down" }) {
  if (value === 0) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  const isGood = (value > 0 && good === "up") || (value < 0 && good === "down");
  return value > 0
    ? <TrendingUp className={`h-3.5 w-3.5 ${isGood ? "text-green-500" : "text-red-500"}`} />
    : <TrendingDown className={`h-3.5 w-3.5 ${isGood ? "text-green-500" : "text-red-500"}`} />;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "text-primary",
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 py-4 px-5">
        <div className={`mt-0.5 p-2.5 rounded-xl bg-muted ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
          {loading ? (
            <Skeleton className="h-7 w-20 mt-1" />
          ) : (
            <p className="text-2xl font-bold mt-0.5">{value}</p>
          )}
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) { toast.error("No data to export"); return; }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = String(r[h] ?? "");
        return v.includes(",") ? `"${v}"` : v;
      }).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV exported");
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ tenantId }: { tenantId: string }) {
  const [days, setDays] = useState(30);
  const kpis = useQuery(api.analytics.summaryKpis, { tenantId: tenantId as never });
  const volume = useQuery(api.analytics.submissionVolume, { tenantId: tenantId as never, days });
  const statusBreakdown = useQuery(api.analytics.submissionStatusBreakdown, { tenantId: tenantId as never });
  const priorityBreakdown = useQuery(api.analytics.priorityBreakdown, { tenantId: tenantId as never });

  const loading = kpis === undefined;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <KpiCard title="Total Submissions" value={fmt(kpis?.totalSubmissions)} icon={FileText} loading={loading} />
        <KpiCard title="Open / Pending" value={fmt(kpis?.openSubmissions)} icon={Clock} color="text-yellow-600" loading={loading} />
        <KpiCard title="Approved This Month" value={fmt(kpis?.approvedThisMonth)} icon={CheckCircle2} color="text-green-600" loading={loading} />
        <KpiCard title="Avg Processing" value={loading ? "—" : `${kpis?.avgProcessingHours}h`} icon={Activity} color="text-blue-600" loading={loading} subtitle="hours per submission" />
        <KpiCard title="SLA Compliance" value={loading ? "—" : `${kpis?.slaComplianceRate}%`} icon={ShieldCheck} color="text-teal-600" loading={loading} />
        <KpiCard title="Active Signatures" value={fmt(kpis?.activeSigningRequests)} icon={PenLine} color="text-purple-600" loading={loading} />
        <KpiCard title="Published Forms" value={fmt(kpis?.formsPublished)} icon={FileText} color="text-orange-600" loading={loading} />
      </div>

      {/* Volume chart */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Submission Volume</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1"
              onClick={() => volume && exportCsv("submission_volume", volume)}
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {volume === undefined ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={volume} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v + "T12:00:00"), days <= 14 ? "MMM d" : "d")} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(v) => format(new Date(v + "T12:00:00"), "MMMM d, yyyy")}
                  formatter={(v: number) => [v, "Submissions"]}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="count" stroke={COLORS.blue} strokeWidth={2} fill="url(#volGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Status + Priority side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Status Breakdown</CardTitle>
            <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => statusBreakdown && exportCsv("status_breakdown", statusBreakdown)}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </CardHeader>
          <CardContent>
            {statusBreakdown === undefined ? <Skeleton className="h-40 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75} label={({ status, percent }) => percent > 0.04 ? `${status} ${Math.round(percent * 100)}%` : ""} labelLine={false}>
                    {statusBreakdown.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? COLORS.slate} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [v, name]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Priority Breakdown</CardTitle>
            <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => priorityBreakdown && exportCsv("priority_breakdown", priorityBreakdown)}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </CardHeader>
          <CardContent>
            {priorityBreakdown === undefined ? <Skeleton className="h-40 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={priorityBreakdown} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" name="Submissions" radius={[4, 4, 0, 0]}>
                    {priorityBreakdown.map((entry) => (
                      <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] ?? COLORS.slate} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Processing Tab ───────────────────────────────────────────────────────────

function ProcessingTab({ tenantId }: { tenantId: string }) {
  const metrics = useQuery(api.analytics.processingTimeMetrics, { tenantId: tenantId as never });
  const topForms = useQuery(api.analytics.topForms, { tenantId: tenantId as never, limit: 10 });

  const metricItems = metrics
    ? [
        { label: "Average", value: `${metrics.avgHours}h`, color: "text-blue-600" },
        { label: "Median", value: `${metrics.medianHours}h`, color: "text-green-600" },
        { label: "90th Percentile", value: `${metrics.p90Hours}h`, color: "text-yellow-600" },
        { label: "Fastest", value: `${metrics.fastestHours}h`, color: "text-teal-600" },
        { label: "Slowest", value: `${metrics.slowestHours}h`, color: "text-red-600" },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Processing time metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Processing Time Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics === undefined ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {metricItems.map(({ label, value, color }) => (
                <div key={label} className="text-center p-3 rounded-lg bg-muted/40">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top forms */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Top Forms by Submissions</CardTitle>
          <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => topForms && exportCsv("top_forms", topForms.map((f) => ({ form: f.formName, submissions: f.count, approval_rate: f.approvalRate + "%" })))}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </CardHeader>
        <CardContent>
          {topForms === undefined ? <Skeleton className="h-48 w-full" /> : topForms.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No form data yet</p>
          ) : (
            <div className="space-y-3">
              {topForms.map((form, i) => (
                <div key={form.formId} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{form.formName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-xs">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (form.count / (topForms[0]?.count || 1)) * 100)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{form.count} submissions</span>
                    </div>
                  </div>
                  <Badge variant={form.approvalRate >= 75 ? "default" : form.approvalRate >= 50 ? "secondary" : "destructive"} className="text-xs whitespace-nowrap">
                    {form.approvalRate}% approved
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── SLA Tab ──────────────────────────────────────────────────────────────────

function SlaTab({ tenantId }: { tenantId: string }) {
  const sla = useQuery(api.analytics.slaComplianceMetrics, { tenantId: tenantId as never });

  const gaugeData = sla
    ? [
        { name: "Response", rate: sla.responseRate, compliant: sla.responseCompliant, total: sla.totalTracked },
        { name: "Resolution", rate: sla.resolutionRate, compliant: sla.resolutionCompliant, total: sla.totalTracked },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sla === undefined ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />) : (
          <>
            <Card>
              <CardContent className="py-5 px-5 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">SLA-Tracked Cases</p>
                <p className="text-3xl font-bold">{sla.totalTracked}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5 px-5 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Resolution Compliance</p>
                <p className={`text-3xl font-bold ${sla.resolutionRate >= 90 ? "text-green-600" : sla.resolutionRate >= 70 ? "text-yellow-600" : "text-red-600"}`}>{sla.resolutionRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5 px-5 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Breached Cases</p>
                <p className={`text-3xl font-bold ${sla.breachedCount > 0 ? "text-red-600" : "text-green-600"}`}>{sla.breachedCount}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {sla && sla.totalTracked > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Response vs Resolution Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={gaugeData} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Compliance Rate"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="rate" name="Compliance %" radius={[6, 6, 0, 0]}>
                  {gaugeData.map((entry) => (
                    <Cell key={entry.name} fill={entry.rate >= 90 ? COLORS.green : entry.rate >= 70 ? COLORS.yellow : COLORS.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Workload Tab ─────────────────────────────────────────────────────────────

function WorkloadTab({ tenantId }: { tenantId: string }) {
  const workload = useQuery(api.analytics.reviewerWorkload, { tenantId: tenantId as never });
  const esig = useQuery(api.analytics.esignatureMetrics, { tenantId: tenantId as never });

  return (
    <div className="space-y-6">
      {/* Reviewer workload */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Reviewer Workload</CardTitle>
          <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => workload && exportCsv("reviewer_workload", workload.map((r) => ({ name: r.name, email: r.email, assigned: r.assigned, resolved: r.resolved, pending: r.pending })))}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </CardHeader>
        <CardContent>
          {workload === undefined ? <Skeleton className="h-40 w-full" /> : workload.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No reviewer assignments recorded yet</p>
          ) : (
            <>
              <div className="hidden md:block">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={workload.slice(0, 8)} layout="vertical" margin={{ left: 40, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Legend iconSize={10} />
                    <Bar dataKey="resolved" name="Resolved" fill={COLORS.green} stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pending" name="Pending" fill={COLORS.yellow} stackId="a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 md:mt-4">
                {workload.map((r) => (
                  <div key={r.userId} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-medium">{r.assigned} assigned</p>
                      <p className="text-muted-foreground">{r.pending} pending</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* eSignature metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">eSignature Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {esig === undefined ? <Skeleton className="h-24 w-full" /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Total Requests", value: esig.total },
                { label: "Completed", value: esig.completed },
                { label: "In Progress", value: esig.inProgress },
                { label: "Declined/Cancelled", value: esig.declined },
                { label: "Completion Rate", value: `${esig.completionRate}%` },
                { label: "Avg Signers", value: esig.avgSigners },
              ].map(({ label, value }) => (
                <div key={label} className="text-center p-3 rounded-lg bg-muted/40">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function AnalyticsInner() {
  const { activeTenant } = useTenant();
  const [tab, setTab] = useState("overview");

  if (!activeTenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select a tenant to view analytics.</p>
      </div>
    );
  }

  const tenantId = activeTenant._id;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reporting for <strong>{activeTenant.name}</strong>
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="sla">SLA</TabsTrigger>
          <TabsTrigger value="workload">Workload</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="processing" className="mt-4">
          <ProcessingTab tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="sla" className="mt-4">
          <SlaTab tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="workload" className="mt-4">
          <WorkloadTab tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <>
      <AuthLoading>
        <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex items-center justify-center h-64 flex-col gap-4">
          <p className="text-muted-foreground">Sign in to view analytics</p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <AnalyticsInner />
      </Authenticated>
    </>
  );
}
