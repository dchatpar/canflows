/**
 * TaskDetail — right-panel detail view for a single task/submission.
 * Shows form data, comments thread (internal/external), review actions, assignment.
 */
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { cn } from "@/lib/utils.ts";
import { format } from "date-fns";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import WorkflowRuns from "./workflow-runs.tsx";
import {
  User,
  Flag,
  X,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MessageSquare,
  Lock,
  Globe,
  ClipboardCheck,
  Send,
  FileText,
  Clock,
  CheckSquare2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StaffMember = { _id: Id<"users">; name: string; role: string };

type TaskDetailProps = {
  submissionId: Id<"submissions">;
  onClose: () => void;
  onReview: (action: "approve" | "reject" | "return" | "request_info") => void;
  onClaim: () => void;
  staffMembers: StaffMember[];
  onAssign: (uid: Id<"users"> | undefined) => void;
  onSetPriority: (p: "low" | "normal" | "high" | "urgent") => void;
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  returned: "bg-purple-100 text-purple-800",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  returned: "Returned",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-slate-500",
  normal: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-600",
};

// ─── Comment thread ───────────────────────────────────────────────────────────

function CommentThread({ submissionId, tenantId }: { submissionId: Id<"submissions">; tenantId: Id<"tenants"> }) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"internal" | "external">("internal");
  const [sending, setSending] = useState(false);

  const comments = useQuery(api.tasks.listComments, {
    submissionId,
    includeInternal: true,
  });

  const addComment = useMutation(api.tasks.addComment);

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    try {
      await addComment({ submissionId, body: body.trim(), visibility });
      setBody("");
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to add comment");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Comment list */}
      <div className="space-y-2 max-h-64 overflow-auto">
        {comments === undefined ? (
          <Skeleton className="h-12 w-full" />
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No comments yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c._id} className={cn("rounded-lg p-3 text-sm", c.visibility === "internal" ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200" : "bg-muted")}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-xs">{c.authorName}</span>
                <span className="text-xs text-muted-foreground">{format(new Date(c.createdAt), "MMM d, HH:mm")}</span>
                {c.visibility === "internal" ? (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <Lock className="w-3 h-3" /> Internal
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <Globe className="w-3 h-3" /> External
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap">{c.body}</p>
            </div>
          ))
        )}
      </div>

      {/* New comment */}
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Visibility</Label>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as "internal" | "external")}>
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">
                <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Internal</span>
              </SelectItem>
              <SelectItem value="external">
                <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> External</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Textarea
          placeholder={visibility === "internal" ? "Internal note (staff only)…" : "Message visible to submitter…"}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          className="text-sm"
        />
        <Button size="sm" disabled={!body.trim() || sending} onClick={handleSend}>
          <Send className="w-3.5 h-3.5 mr-1" /> Add Comment
        </Button>
      </div>
    </div>
  );
}

// ─── Form data viewer ─────────────────────────────────────────────────────────

function FormDataViewer({ data }: { data: string }) {
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(data) as Record<string, unknown>; } catch { /* ignore */ }

  const entries = Object.entries(parsed);
  if (entries.length === 0) return <p className="text-xs text-muted-foreground">No data.</p>;

  return (
    <div className="space-y-2 max-h-64 overflow-auto">
      {entries.map(([key, val]) => (
        <div key={key} className="flex gap-2 text-sm">
          <span className="text-muted-foreground min-w-[120px] font-mono text-xs shrink-0">{key}</span>
          <span className="break-all">{typeof val === "object" ? JSON.stringify(val) : String(val ?? "")}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Internal notes ───────────────────────────────────────────────────────────

function InternalNotes({ submissionId, initialNotes }: { submissionId: Id<"submissions">; initialNotes?: string }) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const updateNotes = useMutation(api.tasks.updateNotes);

  async function handleSave() {
    setSaving(true);
    try {
      await updateNotes({ submissionId, notes });
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Private staff notes (not visible to submitter)…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="text-sm"
      />
      <Button size="sm" variant="outline" disabled={saving} onClick={handleSave}>
        Save Notes
      </Button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TaskDetail({
  submissionId,
  onClose,
  onReview,
  onClaim,
  staffMembers,
  onAssign,
  onSetPriority,
}: TaskDetailProps) {
  const [activeTab, setActiveTab] = useState<"data" | "comments" | "notes" | "workflows">("data");

  const task = useQuery(api.tasks.getTaskDetail, { submissionId });

  if (task === undefined) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (task === null) {
    return (
      <div className="p-6 text-muted-foreground">
        <p>Task not found or access denied.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-muted-foreground">{task.referenceNumber}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[task.status])}>
              {STATUS_LABELS[task.status]}
            </span>
            <span className={cn("text-xs font-medium flex items-center gap-1", PRIORITY_COLORS[task.priority])}>
              <Flag className="w-3 h-3" />
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
          </div>
          <h2 className="font-semibold text-lg">{task.formName}</h2>
          {task.contactName && <p className="text-sm text-muted-foreground">{task.contactName} {task.contactEmail ? `· ${task.contactEmail}` : ""}</p>}
          <p className="text-xs text-muted-foreground mt-0.5">Submitted {format(new Date(task.submittedAt), "MMM d, yyyy 'at' HH:mm")}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Assignment & Priority row */}
      <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/30 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm">
          <User className="w-4 h-4 text-muted-foreground" />
          <Select
            value={task.assignedTo ?? "unassigned"}
            onValueChange={(v) => onAssign(v === "unassigned" ? undefined : v as Id<"users">)}
          >
            <SelectTrigger className="h-7 w-40 text-xs border-0 bg-transparent">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {staffMembers.map((m) => (
                <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Flag className="w-4 h-4 text-muted-foreground" />
          <Select
            value={task.priority}
            onValueChange={(v) => onSetPriority(v as "low" | "normal" | "high" | "urgent")}
          >
            <SelectTrigger className="h-7 w-28 text-xs border-0 bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Review action buttons */}
      {task.status !== "approved" && task.status !== "rejected" && (
        <div className="flex items-center gap-2 px-5 py-3 border-b flex-wrap">
          {!task.assignedTo && (
            <Button size="sm" variant="outline" onClick={onClaim}>
              <ClipboardCheck className="w-3.5 h-3.5 mr-1" /> Claim Task
            </Button>
          )}
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => onReview("approve")}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
          </Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => onReview("reject")}>
            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReview("return")}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Return
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReview("request_info")}>
            <MessageSquare className="w-3.5 h-3.5 mr-1" /> Request Info
          </Button>
        </div>
      )}

      {task.reviewNote && (
        <div className="px-5 py-2 bg-muted/50 border-b text-sm">
          <span className="font-medium">Review note: </span>{task.reviewNote}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b px-5">
        {(["data", "comments", "notes", "workflows"] as const).map((tab) => (
          <button
            key={tab}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer",
              activeTab === tab ? "border-[#26374a] text-[#26374a]" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "data" ? "Form Data" : tab === "comments" ? "Comments" : tab === "notes" ? "Internal Notes" : "Workflow Runs"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-5">
        {activeTab === "data" && <FormDataViewer data={task.data} />}
        {activeTab === "comments" && (
          <CommentThread submissionId={submissionId} tenantId={task.tenantId} />
        )}
        {activeTab === "notes" && (
          <InternalNotes submissionId={submissionId} initialNotes={task.notes} />
        )}
        {activeTab === "workflows" && (
          <WorkflowRuns submissionId={submissionId} />
        )}
      </div>
    </div>
  );
}
