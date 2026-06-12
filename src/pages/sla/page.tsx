/**
 * SLA & Deadline Management page — policies designer, compliance metrics,
 * overdue tracker. Tenant-scoped, staff-only.
 */
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useTenant } from "@/contexts/tenant-context.tsx";
import { cn } from "@/lib/utils.ts";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Timer,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ShieldCheck,
  Flag,
  Star,
  BarChart3,
  ListChecks,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SlaPolicy = Doc<"slaPolicies">;

type PolicyFormData = {
  name: string;
  description: string;
  isDefault: boolean;
  responseTargetHours: number;
  resolutionTargetHours: number;
  escalationThresholdPct: number;
  urgentResponse: number;
  urgentResolution: number;
  highResponse: number;
  highResolution: number;
  normalResponse: number;
  normalResolution: number;
  lowResponse: number;
  lowResolution: number;
  usePriorityOverrides: boolean;
};

const DEFAULT_FORM: PolicyFormData = {
  name: "",
  description: "",
  isDefault: false,
  responseTargetHours: 24,
  resolutionTargetHours: 72,
  escalationThresholdPct: 80,
  urgentResponse: 2,
  urgentResolution: 8,
  highResponse: 8,
  highResolution: 24,
  normalResponse: 24,
  normalResolution: 72,
  lowResponse: 72,
  lowResolution: 168,
  usePriorityOverrides: false,
};

// ─── Policy Form Dialog ───────────────────────────────────────────────────────

function PolicyDialog({
  open,
  onClose,
  tenantId,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  tenantId: Id<"tenants">;
  editing?: SlaPolicy | null;
}) {
  const upsert = useMutation(api.sla.upsertPolicy);
  const [saving, setSaving] = useState(false);

  // Parse existing priority overrides
  function parseForm(p?: SlaPolicy | null): PolicyFormData {
    if (!p) return DEFAULT_FORM;
    let overrides: Record<string, { response: number; resolution: number }> = {};
    try {
      if (p.priorityOverrides) overrides = JSON.parse(p.priorityOverrides);
    } catch { /* ignore */ }
    return {
      name: p.name,
      description: p.description ?? "",
      isDefault: p.isDefault,
      responseTargetHours: p.responseTargetHours,
      resolutionTargetHours: p.resolutionTargetHours,
      escalationThresholdPct: p.escalationThresholdPct,
      usePriorityOverrides: !!p.priorityOverrides,
      urgentResponse: overrides.urgent?.response ?? 2,
      urgentResolution: overrides.urgent?.resolution ?? 8,
      highResponse: overrides.high?.response ?? 8,
      highResolution: overrides.high?.resolution ?? 24,
      normalResponse: overrides.normal?.response ?? 24,
      normalResolution: overrides.normal?.resolution ?? 72,
      lowResponse: overrides.low?.response ?? 72,
      lowResolution: overrides.low?.resolution ?? 168,
    };
  }

  const [form, setForm] = useState<PolicyFormData>(() => parseForm(editing));

  // Reset when editing changes
  const [lastEditing, setLastEditing] = useState(editing);
  if (lastEditing !== editing) {
    setLastEditing(editing);
    setForm(parseForm(editing));
  }

  function set<K extends keyof PolicyFormData>(key: K, val: PolicyFormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Policy name is required"); return; }
    setSaving(true);
    try {
      const priorityOverrides = form.usePriorityOverrides
        ? JSON.stringify({
            urgent: { response: form.urgentResponse, resolution: form.urgentResolution },
            high: { response: form.highResponse, resolution: form.highResolution },
            normal: { response: form.normalResponse, resolution: form.normalResolution },
            low: { response: form.lowResponse, resolution: form.lowResolution },
          })
        : undefined;

      await upsert({
        policyId: editing?._id,
        tenantId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        isDefault: form.isDefault,
        responseTargetHours: form.responseTargetHours,
        resolutionTargetHours: form.resolutionTargetHours,
        priorityOverrides,
        escalationThresholdPct: form.escalationThresholdPct,
        escalationNotifyUserIds: [],
      });
      toast.success(editing ? "Policy updated" : "Policy created");
      onClose();
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit SLA Policy" : "New SLA Policy"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Basic info */}
          <div className="grid gap-3">
            <div>
              <Label>Policy Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Standard GC Processing SLA" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="When this policy applies…" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="isDefault" checked={form.isDefault} onCheckedChange={(v) => set("isDefault", v)} />
              <Label htmlFor="isDefault">Set as default policy for new submissions</Label>
            </div>
          </div>

          {/* Default targets */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Default Targets</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Response target (hours)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.responseTargetHours}
                  onChange={(e) => set("responseTargetHours", Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">Time from submission to first review action</p>
              </div>
              <div>
                <Label>Resolution target (hours)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.resolutionTargetHours}
                  onChange={(e) => set("resolutionTargetHours", Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">Time from submission to final decision</p>
              </div>
            </div>
          </div>

          {/* Priority overrides */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Switch
                id="usePriorityOverrides"
                checked={form.usePriorityOverrides}
                onCheckedChange={(v) => set("usePriorityOverrides", v)}
              />
              <Label htmlFor="usePriorityOverrides">Override targets per priority level</Label>
            </div>
            {form.usePriorityOverrides && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Priority</TableHead>
                      <TableHead>Response (hrs)</TableHead>
                      <TableHead>Resolution (hrs)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(["urgent", "high", "normal", "low"] as const).map((p) => (
                      <TableRow key={p}>
                        <TableCell className="font-medium capitalize">{p}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            className="w-24 h-7"
                            value={form[`${p}Response` as keyof PolicyFormData] as number}
                            onChange={(e) => set(`${p}Response` as keyof PolicyFormData, Number(e.target.value) as never)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            className="w-24 h-7"
                            value={form[`${p}Resolution` as keyof PolicyFormData] as number}
                            onChange={(e) => set(`${p}Resolution` as keyof PolicyFormData, Number(e.target.value) as never)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Escalation */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Escalation</h3>
            <div>
              <Label>Escalate when % of SLA window elapsed</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="w-24"
                  value={form.escalationThresholdPct}
                  onChange={(e) => set("escalationThresholdPct", Number(e.target.value))}
                />
                <span className="text-sm text-muted-foreground">% (set 0 to disable)</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={handleSave} className="bg-[#26374a] hover:bg-[#1c2d3e] text-white">
            {saving ? "Saving…" : editing ? "Save Changes" : "Create Policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Policies Tab ─────────────────────────────────────────────────────────────

function PoliciesTab({ tenantId }: { tenantId: Id<"tenants"> }) {
  const policies = useQuery(api.sla.listPolicies, { tenantId });
  const deletePolicy = useMutation(api.sla.deletePolicy);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SlaPolicy | null>(null);

  async function handleDelete(policyId: Id<"slaPolicies">) {
    try {
      await deletePolicy({ policyId });
      toast.success("Policy deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">SLA Policies</h2>
          <p className="text-sm text-muted-foreground">Define time targets and escalation rules for submissions.</p>
        </div>
        <Button
          className="bg-[#26374a] hover:bg-[#1c2d3e] text-white"
          onClick={() => { setEditing(null); setDialogOpen(true); }}
        >
          <Plus className="w-4 h-4 mr-2" /> New Policy
        </Button>
      </div>

      {policies === undefined ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : policies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Timer className="w-10 h-10 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">No SLA policies yet.</p>
            <Button
              variant="outline"
              onClick={() => { setEditing(null); setDialogOpen(true); }}
            >
              Create your first policy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {policies.map((p) => (
            <Card key={p._id} className={cn("relative", p.isDefault && "border-[#26374a]")}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    {p.isDefault && (
                      <Badge className="bg-[#26374a] text-white text-xs">
                        <Star className="w-3 h-3 mr-1" /> Default
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-7 h-7">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditing(p); setDialogOpen(true); }}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDelete(p._id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {p.description && (
                  <CardDescription>{p.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Response target</span>
                    <span className="font-semibold">{formatHours(p.responseTargetHours)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Resolution target</span>
                    <span className="font-semibold">{formatHours(p.resolutionTargetHours)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Escalation at</span>
                    <span className="font-semibold">{p.escalationThresholdPct === 0 ? "Disabled" : `${p.escalationThresholdPct}%`}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Priority overrides</span>
                    <span className="font-semibold">{p.priorityOverrides ? "Yes" : "No"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PolicyDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        tenantId={tenantId}
        editing={editing}
      />
    </div>
  );
}

// ─── Metrics Tab ──────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#dc2626",
  high: "#ea580c",
  normal: "#2563eb",
  low: "#64748b",
};

function MetricsTab({ tenantId }: { tenantId: Id<"tenants"> }) {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const since =
    period === "all"
      ? undefined
      : new Date(Date.now() - { "7d": 7, "30d": 30, "90d": 90 }[period] * 86_400_000).toISOString();

  const metrics = useQuery(api.sla.complianceMetrics, { tenantId, since });

  if (metrics === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const pieData = [
    { name: "Compliant", value: metrics.resolutionCompliant, fill: "#16a34a" },
    { name: "Breached", value: metrics.resolutionBreached, fill: "#dc2626" },
  ];

  const priorityData = Object.entries(metrics.byPriority).map(([p, d]) => ({
    priority: p.charAt(0).toUpperCase() + p.slice(1),
    Compliant: d.total - d.breached,
    Breached: d.breached,
    fill: PRIORITY_COLORS[p],
  }));

  return (
    <div className="space-y-5">
      {/* Period picker */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Compliance Metrics</h2>
        <div className="flex gap-1">
          {(["7d", "30d", "90d", "all"] as const).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "outline"}
              className={cn("h-7", period === p && "bg-[#26374a] text-white")}
              onClick={() => setPeriod(p)}
            >
              {p === "all" ? "All time" : p}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={<ShieldCheck className="w-5 h-5 text-green-600" />}
          label="Resolution Compliance"
          value={`${metrics.resolutionCompliancePct}%`}
          sub={`${metrics.resolutionCompliant} of ${metrics.total}`}
          color="text-green-600"
        />
        <KpiCard
          icon={<Clock className="w-5 h-5 text-blue-600" />}
          label="Response Compliance"
          value={`${metrics.responseCompliancePct}%`}
          sub={`${metrics.responseCompliant} of ${metrics.total}`}
          color="text-blue-600"
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
          label="Avg Resolution Time"
          value={formatHours(metrics.avgResolutionHours)}
          sub="per submission"
          color="text-purple-600"
        />
        <KpiCard
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          label="Overdue Now"
          value={String(metrics.overdueCount)}
          sub={`${metrics.atRiskCount} at risk`}
          color="text-red-600"
        />
      </div>

      {/* Charts */}
      {metrics.total > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resolution SLA Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bar by priority */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">SLA by Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={priorityData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="priority" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Compliant" fill="#16a34a" />
                  <Bar dataKey="Breached" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
            <BarChart3 className="w-10 h-10 opacity-30" />
            <p className="text-muted-foreground text-sm">No SLA data for this period.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={cn("text-2xl font-bold", color)}>{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ─── Overdue Tab ──────────────────────────────────────────────────────────────

function OverdueTab({ tenantId }: { tenantId: Id<"tenants"> }) {
  const overdue = useQuery(api.sla.listOverdue, { tenantId, numItems: 50 });

  const PRIORITY_BADGE: Record<string, string> = {
    urgent: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    normal: "bg-blue-100 text-blue-800",
    low: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Overdue Tasks
          {overdue !== undefined && (
            <Badge variant="destructive">{overdue.length}</Badge>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">Submissions that have exceeded their resolution SLA deadline.</p>
      </div>

      {overdue === undefined ? (
        <Skeleton className="h-48 w-full" />
      ) : overdue.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
            <CheckCircle2 className="w-10 h-10 text-green-500 opacity-60" />
            <p className="text-muted-foreground">No overdue tasks — great job!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Form</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Overdue by</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdue.map((item) => (
                <TableRow key={item._id} className="hover:bg-red-50/50 dark:hover:bg-red-950/10">
                  <TableCell className="font-mono text-xs">{item.referenceNumber}</TableCell>
                  <TableCell className="font-medium">{item.formName}</TableCell>
                  <TableCell>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PRIORITY_BADGE[item.priority])}>
                      {item.priority}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(item.resolutionDeadline), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <span className="text-red-600 font-medium text-sm">
                      {item.overdueHours < 1
                        ? `${Math.round(item.overdueHours * 60)} min`
                        : `${item.overdueHours}h`}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.assigneeName ?? <span className="italic">Unassigned</span>}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {item.status.replace("_", " ")}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHours(h: number): string {
  if (h === 0) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  const rem = h % 24;
  return rem === 0 ? `${days}d` : `${days}d ${rem}h`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "policies" | "metrics" | "overdue";

function SlaInner() {
  const { activeTenant } = useTenant();
  const [tab, setTab] = useState<Tab>("policies");

  const tenantId = activeTenant?._id;

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <Timer className="w-10 h-10 opacity-30" />
        <p>Select a tenant to manage SLA policies.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "policies", label: "Policies", icon: <ListChecks className="w-4 h-4" /> },
    { id: "metrics", label: "Compliance Metrics", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "overdue", label: "Overdue", icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <Timer className="w-5 h-5 text-[#26374a]" />
          <h1 className="text-xl font-semibold text-[#26374a]">SLA & Deadline Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Define service-level agreements, monitor compliance, and track overdue submissions for {activeTenant.name}.
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors cursor-pointer",
                tab === t.id
                  ? "border-[#26374a] text-[#26374a] bg-[#26374a]/5"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setTab(t.id)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">
        {tab === "policies" && <PoliciesTab tenantId={tenantId} />}
        {tab === "metrics" && <MetricsTab tenantId={tenantId} />}
        {tab === "overdue" && <OverdueTab tenantId={tenantId} />}
      </div>
    </div>
  );
}

export default function SlaPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Sign in to manage SLA policies.
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </AuthLoading>
      <Authenticated>
        <SlaInner />
      </Authenticated>
    </>
  );
}
