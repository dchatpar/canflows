import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Plus, Trash2, Download, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Singapore",
];

type Props = {
  workflowId: Id<"workflows">;
};

type VariableRow = {
  key: string;
  value: string;
  description: string;
  isNew?: boolean;
};

export default function WorkflowSettingsPanel({ workflowId }: Props) {
  const workflow = useQuery(api.workflows.get, { workflowId });
  const variables = useQuery(api.workflowVariables.list, { workflowId });
  const nodes = useQuery(api.nodes.list, { workflowId });
  const exportData = useQuery(api.workflows.exportWorkflow, { workflowId });

  const updateWorkflow = useMutation(api.workflows.update);
  const upsertVariable = useMutation(api.workflowVariables.upsert);
  const removeVariable = useMutation(api.workflowVariables.remove);

  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newVariable, setNewVariable] = useState<VariableRow>({ key: "", value: "", description: "" });
  const [editingId, setEditingId] = useState<Id<"workflowVariables"> | null>(null);
  const [editRow, setEditRow] = useState<VariableRow>({ key: "", value: "", description: "" });
  const [webhookCopied, setWebhookCopied] = useState(false);

  if (!workflow) return <div className="p-4 text-muted-foreground text-sm">Loading...</div>;

  const currentName = name ?? workflow.name;
  const currentDescription = description ?? (workflow.description ?? "");
  const currentTimezone = timezone ?? (workflow.timezone ?? "UTC");

  // Find first webhook trigger node for webhook URL
  const webhookNode = nodes?.find((n) => n.nodeType === "webhook" && n.type === "trigger");
  const webhookUrl = webhookNode
    ? `${window.location.origin}/api/webhook/${webhookNode._id}`
    : null;

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateWorkflow({
        workflowId,
        name: currentName,
        description: currentDescription || undefined,
        timezone: currentTimezone,
      });
      toast.success("Settings saved");
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else {
        toast.error("Failed to save settings");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddVariable = async () => {
    if (!newVariable.key.trim() || !newVariable.value.trim()) {
      toast.error("Key and value are required");
      return;
    }
    try {
      await upsertVariable({
        workflowId,
        key: newVariable.key.trim(),
        value: newVariable.value.trim(),
        description: newVariable.description.trim() || undefined,
      });
      setNewVariable({ key: "", value: "", description: "" });
      toast.success("Variable added");
    } catch {
      toast.error("Failed to add variable");
    }
  };

  const handleUpdateVariable = async (varId: Id<"workflowVariables">) => {
    if (!editRow.key.trim() || !editRow.value.trim()) {
      toast.error("Key and value are required");
      return;
    }
    try {
      await upsertVariable({
        workflowId,
        key: editRow.key.trim(),
        value: editRow.value.trim(),
        description: editRow.description.trim() || undefined,
      });
      // Remove old if key changed
      const original = variables?.find((v) => v._id === varId);
      if (original && original.key !== editRow.key.trim()) {
        await removeVariable({ workflowVariableId: varId });
      }
      setEditingId(null);
      toast.success("Variable updated");
    } catch {
      toast.error("Failed to update variable");
    }
  };

  const handleDeleteVariable = async (varId: Id<"workflowVariables">) => {
    try {
      await removeVariable({ workflowVariableId: varId });
      toast.success("Variable removed");
    } catch {
      toast.error("Failed to remove variable");
    }
  };

  const handleExport = () => {
    if (!exportData) return;
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflow.name.replace(/\s+/g, "-").toLowerCase()}.workflow.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Workflow exported");
  };

  const handleCopyWebhook = async () => {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      {/* Workflow Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Workflow Settings</h3>
        <div className="space-y-2">
          <Label htmlFor="wf-name">Name</Label>
          <Input
            id="wf-name"
            value={currentName}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workflow name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wf-desc">Description</Label>
          <Textarea
            id="wf-desc"
            value={currentDescription}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this workflow do?"
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wf-tz">Timezone</Label>
          <Select value={currentTimezone} onValueChange={setTimezone}>
            <SelectTrigger id="wf-tz">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full">
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <Separator />

      {/* Variables */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Variables</h3>
          <Badge variant="secondary" className="text-xs">
            {variables?.length ?? 0}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Reference variables in nodes using{" "}
          <code className="bg-muted px-1 rounded text-[11px]">{"{{ $vars.KEY }}"}</code>
        </p>

        {/* Existing variables */}
        <div className="space-y-2">
          {variables?.map((variable) =>
            editingId === variable._id ? (
              <div key={variable._id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <Input
                  value={editRow.key}
                  onChange={(e) => setEditRow({ ...editRow, key: e.target.value })}
                  placeholder="Key"
                  className="h-7 text-xs"
                />
                <Input
                  value={editRow.value}
                  onChange={(e) => setEditRow({ ...editRow, value: e.target.value })}
                  placeholder="Value"
                  className="h-7 text-xs"
                />
                <Input
                  value={editRow.description}
                  onChange={(e) => setEditRow({ ...editRow, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="h-7 text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs flex-1"
                    onClick={() => handleUpdateVariable(variable._id)}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={variable._id}
                className="flex items-start justify-between gap-2 border rounded-lg p-2.5 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <code className="text-xs font-medium text-primary">{variable.key}</code>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{variable.value}</p>
                  {variable.description && (
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      {variable.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    onClick={() => {
                      setEditingId(variable._id);
                      setEditRow({
                        key: variable.key,
                        value: variable.value,
                        description: variable.description ?? "",
                      });
                    }}
                  >
                    <Plus className="size-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteVariable(variable._id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Add new variable */}
        <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
          <p className="text-xs font-medium text-muted-foreground">New variable</p>
          <Input
            value={newVariable.key}
            onChange={(e) => setNewVariable({ ...newVariable, key: e.target.value })}
            placeholder="Key (e.g. API_URL)"
            className="h-7 text-xs"
          />
          <Input
            value={newVariable.value}
            onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
            placeholder="Value"
            className="h-7 text-xs"
          />
          <Input
            value={newVariable.description}
            onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
            placeholder="Description (optional)"
            className="h-7 text-xs"
          />
          <Button
            size="sm"
            className="w-full h-7 text-xs gap-1"
            onClick={handleAddVariable}
          >
            <Plus className="size-3" />
            Add Variable
          </Button>
        </div>
      </div>

      <Separator />

      {/* Webhook URL */}
      {webhookUrl && (
        <>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Webhook URL</h3>
            <p className="text-xs text-muted-foreground">
              Send HTTP requests to this URL to trigger your workflow.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] bg-muted px-2 py-1.5 rounded border truncate">
                {webhookUrl}
              </code>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                onClick={handleCopyWebhook}
              >
                {webhookCopied ? (
                  <Check className="size-3.5 text-green-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Export */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Export</h3>
        <p className="text-xs text-muted-foreground">
          Download this workflow as a JSON file to share or back it up.
        </p>
        <Button
          variant="secondary"
          className="w-full gap-2"
          onClick={handleExport}
          disabled={!exportData}
        >
          <Download className="size-4" />
          Export as JSON
        </Button>
      </div>
    </div>
  );
}
