/**
 * Form Workflow Integration page — link forms to workflows,
 * configure field mapping, view run history.
 * Route: /forms/:formId/integrations
 */
import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, AuthLoading } from "convex/react";
import { cn } from "@/lib/utils.ts";
import { format, formatDistanceToNow } from "date-fns";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
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
  ArrowLeft,
  Plus,
  Workflow,
  MoreHorizontal,
  Pencil,
  Trash2,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  GitBranch,
  RefreshCw,
  AlertTriangle,
  Link2,
  Map,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type LinkWithMeta = Doc<"formWorkflowLinks"> & { workflowName: string; runCount: number };

type FormField = { id: string; label: string; type: string };
type FormSchema = { pages: Array<{ fields: FormField[] }> };

// ─── Link Dialog ──────────────────────────────────────────────────────────────

function LinkDialog({
  open,
  onClose,
  formId,
  formFields,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  formId: Id<"forms">;
  formFields: FormField[];
  editing?: LinkWithMeta | null;
}) {
  const workflows = useQuery(api.workflows.list, {});
  const upsert = useMutation(api.formIntegrations.upsertLink);
  const [saving, setSaving] = useState(false);

  const [label, setLabel] = useState(editing?.label ?? "");
  const [workflowId, setWorkflowId] = useState<string>(editing?.workflowId ?? "");
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);
  const [triggerCondition, setTriggerCondition] = useState(editing?.triggerCondition ?? "always");
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>(() => {
    if (!editing?.fieldMapping) return {};
    try { return JSON.parse(editing.fieldMapping) as Record<string, string>; } catch { return {}; }
  });

  // Reset when editing changes
  const [lastEditing, setLastEditing] = useState(editing);
  if (lastEditing !== editing) {
    setLastEditing(editing);
    setLabel(editing?.label ?? "");
    setWorkflowId(editing?.workflowId ?? "");
    setIsActive(editing?.isActive ?? true);
    setTriggerCondition(editing?.triggerCondition ?? "always");
    try {
      setFieldMapping(editing?.fieldMapping ? JSON.parse(editing.fieldMapping) as Record<string, string> : {});
    } catch { setFieldMapping({}); }
  }

  async function handleSave() {
    if (!workflowId) { toast.error("Select a workflow"); return; }
    setSaving(true);
    try {
      const mappingStr = Object.keys(fieldMapping).length
        ? JSON.stringify(fieldMapping)
        : undefined;
      await upsert({
        linkId: editing?._id,
        formId,
        workflowId: workflowId as Id<"workflows">,
        label: label.trim() || undefined,
        isActive,
        fieldMapping: mappingStr,
        triggerCondition,
      });
      toast.success(editing ? "Integration updated" : "Integration created");
      onClose();
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Integration" : "Add Workflow Integration"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Workflow picker */}
          <div>
            <Label>Workflow *</Label>
            {workflows === undefined ? (
              <Skeleton className="h-9 w-full mt-1" />
            ) : (
              <Select value={workflowId} onValueChange={setWorkflowId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a workflow…" />
                </SelectTrigger>
                <SelectContent>
                  {workflows.length === 0 ? (
                    <SelectItem value="none" disabled>No workflows found</SelectItem>
                  ) : (
                    workflows.map((w) => (
                      <SelectItem key={w._id} value={w._id}>
                        {w.name}
                        {w.isActive && <span className="ml-2 text-xs text-green-600">● Active</span>}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Label */}
          <div>
            <Label>Label <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              className="mt-1"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Notify team on submission"
            />
          </div>

          {/* Trigger condition */}
          <div>
            <Label>Trigger on</Label>
            <Select value={triggerCondition} onValueChange={setTriggerCondition}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Every submission</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Additional conditions (by priority, status) available in future updates.</p>
          </div>

          {/* Field mapping */}
          {formFields.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Map className="w-4 h-4 text-muted-foreground" />
                <Label>Field → Variable Mapping <span className="text-muted-foreground">(optional)</span></Label>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Map form fields to workflow variable names. Unmapped fields are passed as-is.
              </p>
              <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                {formFields.slice(0, 12).map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <span className="text-xs font-mono w-40 truncate text-muted-foreground" title={f.label}>
                      {f.label || f.id}
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <Input
                      className="h-7 text-xs flex-1"
                      placeholder={f.label.toLowerCase().replace(/\s+/g, "_") || f.id}
                      value={fieldMapping[f.id] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFieldMapping((prev) => {
                          const next = { ...prev };
                          if (val) next[f.id] = val;
                          else delete next[f.id];
                          return next;
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="isActive">Enable this integration</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={saving}
            onClick={handleSave}
            className="bg-[#26374a] hover:bg-[#1c2d3e] text-white"
          >
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Integration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const RUN_STATUS: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  triggered: { label: "Triggered", cls: "bg-blue-100 text-blue-800", icon: <Clock className="w-3 h-3" /> },
  running: { label: "Running", cls: "bg-amber-100 text-amber-800", icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  success: { label: "Success", cls: "bg-green-100 text-green-800", icon: <CheckCircle2 className="w-3 h-3" /> },
  failed: { label: "Failed", cls: "bg-red-100 text-red-800", icon: <XCircle className="w-3 h-3" /> },
};

function RunStatusBadge({ status }: { status: string }) {
  const meta = RUN_STATUS[status] ?? RUN_STATUS.triggered;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", meta.cls)}>
      {meta.icon} {meta.label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function IntegrationsInner({ formId }: { formId: Id<"forms"> }) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LinkWithMeta | null>(null);
  const [tab, setTab] = useState<"links" | "runs">("links");

  const form = useQuery(api.forms.getById, { formId });
  const links = useQuery(api.formIntegrations.listLinks, { formId });
  const runs = useQuery(api.formIntegrations.listRunsForForm, { formId, numItems: 50 });

  const toggleLink = useMutation(api.formIntegrations.toggleLink);
  const deleteLink = useMutation(api.formIntegrations.deleteLink);

  // Extract form fields from published/draft schema
  const rawSchema = useQuery(api.forms.getDraftSchema, { formId });
  const formFields = useMemo<FormField[]>(() => {
    if (!rawSchema) return [];
    try {
      const schema = JSON.parse(rawSchema) as FormSchema;
      return schema.pages.flatMap((p) => p.fields.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
      })));
    } catch { return []; }
  }, [rawSchema]);

  async function handleToggle(linkId: Id<"formWorkflowLinks">, isActive: boolean) {
    try {
      await toggleLink({ linkId, isActive });
      toast.success(isActive ? "Integration enabled" : "Integration disabled");
    } catch { toast.error("Failed to update"); }
  }

  async function handleDelete(linkId: Id<"formWorkflowLinks">) {
    try {
      await deleteLink({ linkId });
      toast.success("Integration deleted");
    } catch { toast.error("Failed to delete"); }
  }

  if (form === undefined) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!form) {
    return <div className="p-6 text-muted-foreground">Form not found.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/forms/${formId}/edit`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Workflow className="w-5 h-5 text-[#26374a]" />
              <h1 className="text-xl font-semibold text-[#26374a]">Workflow Integrations</h1>
            </div>
            <p className="text-sm text-muted-foreground">{form.name}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {([["links", "Linked Workflows"], ["runs", "Run History"]] as const).map(([id, label]) => (
            <button
              key={id}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer",
                tab === id
                  ? "border-[#26374a] text-[#26374a]"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setTab(id)}
            >
              {label}
              {id === "links" && links !== undefined && (
                <Badge variant="secondary" className="ml-2">{links.length}</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">
        {tab === "links" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Linked Workflows</h2>
                <p className="text-sm text-muted-foreground">
                  Each linked workflow will auto-run when a new submission is received.
                </p>
              </div>
              <Button
                className="bg-[#26374a] hover:bg-[#1c2d3e] text-white"
                onClick={() => { setEditing(null); setDialogOpen(true); }}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Integration
              </Button>
            </div>

            {links === undefined ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : links.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                  <Link2 className="w-10 h-10 text-muted-foreground opacity-40" />
                  <p className="text-muted-foreground">No workflow integrations yet.</p>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Connect this form to a workflow so that every submission automatically triggers execution.
                  </p>
                  <Button variant="outline" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                    Add your first integration
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {links.map((link) => (
                  <Card key={link._id} className={cn(!link.isActive && "opacity-60")}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-[#26374a]" />
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">
                                {link.label || link.workflowName}
                              </CardTitle>
                              {link.isActive ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Disabled</Badge>
                              )}
                            </div>
                            {link.label && (
                              <CardDescription className="mt-0.5">
                                Workflow: {link.workflowName}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={link.isActive}
                            onCheckedChange={(v) => handleToggle(link._id, v)}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-7 h-7">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditing(link); setDialogOpen(true); }}>
                                <Pencil className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDelete(link._id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Trigger: {link.triggerCondition === "always" ? "Every submission" : link.triggerCondition}</span>
                        <span>Field mapping: {link.fieldMapping ? "Custom" : "Auto"}</span>
                        <span>{link.runCount} runs</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "runs" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold">Run History</h2>
              <p className="text-sm text-muted-foreground">
                All workflow executions triggered by submissions of this form.
              </p>
            </div>

            {runs === undefined ? (
              <Skeleton className="h-48 w-full" />
            ) : runs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
                  <Play className="w-10 h-10 opacity-30" />
                  <p className="text-muted-foreground text-sm">No runs yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submission</TableHead>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Triggered</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => {
                      const duration = run.completedAt
                        ? Math.round(
                            (new Date(run.completedAt).getTime() -
                              new Date(run.triggeredAt).getTime()) /
                              1000,
                          )
                        : null;
                      return (
                        <TableRow key={run._id}>
                          <TableCell className="font-mono text-xs">{run.submissionRef}</TableCell>
                          <TableCell className="font-medium">{run.workflowName}</TableCell>
                          <TableCell><RunStatusBadge status={run.status} /></TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(run.triggeredAt), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {duration !== null ? `${duration}s` : "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => navigate(`/workflows/${run.workflowId}`)}
                            >
                              View workflow
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Link dialog */}
      <LinkDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        formId={formId}
        formFields={formFields}
        editing={editing}
      />
    </div>
  );
}

export default function FormIntegrationsPage() {
  const { formId } = useParams<{ formId: string }>();

  if (!formId) return <div className="p-6 text-muted-foreground">Invalid form ID.</div>;

  return (
    <>
      <AuthLoading>
        <div className="p-6 space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </AuthLoading>
      <Authenticated>
        <IntegrationsInner formId={formId as Id<"forms">} />
      </Authenticated>
    </>
  );
}
