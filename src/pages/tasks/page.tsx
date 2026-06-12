/**
 * Task Queue & Review — staff inbox for reviewing form submissions.
 * Supports filter/sort, claim, assign, bulk ops, priority, approve/reject/return.
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useTenant } from "@/contexts/tenant-context.tsx";
import { cn } from "@/lib/utils.ts";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import TaskDetail from "./_components/task-detail.tsx";
import {
  Inbox,
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MessageSquare,
  User,
  Flag,
  MoreHorizontal,
  ClipboardCheck,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckSquare,
  Square,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskItem = {
  _id: Id<"submissions">;
  referenceNumber: string;
  formId: Id<"forms">;
  formName: string;
  status: string;
  priority: string;
  assignedTo?: Id<"users">;
  assigneeName?: string;
  contactName?: string;
  contactEmail?: string;
  submittedAt: string;
  updatedAt: string;
  claimedAt?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  returned: "Returned",
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  under_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  returned: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-slate-500",
  normal: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-600",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-2xl font-bold", color)}>{value}</span>
    </div>
  );
}

function ReviewDialog({
  open,
  onClose,
  ids,
  action,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  ids: Id<"submissions">[];
  action: "approve" | "reject" | "return" | "request_info";
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const labels = {
    approve: { title: "Approve Submission(s)", btn: "Approve", btnClass: "bg-green-600 hover:bg-green-700 text-white" },
    reject: { title: "Reject Submission(s)", btn: "Reject", btnClass: "bg-red-600 hover:bg-red-700 text-white" },
    return: { title: "Return for Changes", btn: "Return", btnClass: "bg-purple-600 hover:bg-purple-700 text-white" },
    request_info: { title: "Request More Information", btn: "Send Request", btnClass: "bg-amber-600 hover:bg-amber-700 text-white" },
  };
  const meta = labels[action];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            {ids.length > 1 ? `Applying to ${ids.length} submissions.` : ""}
          </p>
          <div className="space-y-1">
            <Label>Note <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              placeholder="Add a note visible to the submitter…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button className={meta.btnClass} onClick={() => { onConfirm(note); setNote(""); }}>
            {meta.btn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function TaskQueueInner() {
  const { activeTenant: currentTenant } = useTenant();
  const [selectedIds, setSelectedIds] = useState<Set<Id<"submissions">>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<Id<"submissions"> | null>(null);
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    action: "approve" | "reject" | "return" | "request_info";
    ids: Id<"submissions">[];
  } | null>(null);

  const tenantId = currentTenant?._id;

  const statsRaw = useQuery(
    api.tasks.taskStats,
    tenantId ? { tenantId } : "skip",
  );

  const tasksResult = useQuery(
    api.tasks.listTasks,
    tenantId
      ? {
          tenantId,
          status: statusFilter === "all" ? undefined : statusFilter,
          priority: priorityFilter === "all" ? undefined : priorityFilter,
          assignedTo:
            assigneeFilter === "all"
              ? undefined
              : (assigneeFilter as "me" | "unassigned"),
          numItems: 100,
        }
      : "skip",
  );

  const staffMembers = useQuery(
    api.tasks.listStaffMembers,
    tenantId ? { tenantId } : "skip",
  );

  const claimTask = useMutation(api.tasks.claimTask);
  const reviewTask = useMutation(api.tasks.reviewTask);
  const bulkUpdate = useMutation(api.tasks.bulkUpdate);
  const setPriority = useMutation(api.tasks.setPriority);
  const assignTask = useMutation(api.tasks.assignTask);

  // Client-side search
  const tasks: TaskItem[] = useMemo(() => {
    const all = tasksResult?.items ?? [];
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(
      (t) =>
        t.referenceNumber.toLowerCase().includes(q) ||
        t.formName.toLowerCase().includes(q) ||
        (t.contactName ?? "").toLowerCase().includes(q) ||
        (t.contactEmail ?? "").toLowerCase().includes(q),
    );
  }, [tasksResult, search]);

  const allSelected = tasks.length > 0 && selectedIds.size === tasks.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map((t) => t._id)));
    }
  }

  function toggleOne(id: Id<"submissions">) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleClaim(id: Id<"submissions">) {
    try {
      await claimTask({ submissionId: id });
      toast.success("Task claimed");
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Failed");
    }
  }

  async function handleReviewConfirm(note: string) {
    if (!reviewDialog) return;
    try {
      if (reviewDialog.ids.length === 1) {
        await reviewTask({
          submissionId: reviewDialog.ids[0],
          action: reviewDialog.action,
          reviewNote: note || undefined,
        });
      } else {
        const actionMap = { approve: "approve", reject: "reject", return: "reject", request_info: "reject" } as const;
        await bulkUpdate({
          submissionIds: reviewDialog.ids,
          action: actionMap[reviewDialog.action],
          reviewNote: note || undefined,
        });
      }
      toast.success("Done");
      setSelectedIds(new Set());
      setSelectedTask(null);
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Failed");
    } finally {
      setReviewDialog(null);
    }
  }

  async function handleBulkClaim() {
    try {
      await bulkUpdate({
        submissionIds: Array.from(selectedIds),
        action: "assign_me",
      });
      toast.success(`Claimed ${selectedIds.size} tasks`);
      setSelectedIds(new Set());
    } catch (e) {
      toast.error("Failed");
    }
  }

  async function handleSetPriority(id: Id<"submissions">, priority: "low" | "normal" | "high" | "urgent") {
    try {
      await setPriority({ submissionId: id, priority });
      toast.success("Priority updated");
    } catch {
      toast.error("Failed");
    }
  }

  async function handleAssign(id: Id<"submissions">, assigneeId: Id<"users"> | undefined) {
    try {
      await assignTask({ submissionId: id, assigneeId });
      toast.success(assigneeId ? "Assigned" : "Unassigned");
    } catch {
      toast.error("Failed");
    }
  }

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <Building2Icon />
        <p>Select a tenant to view the task queue.</p>
      </div>
    );
  }

  const stats = statsRaw ?? { submitted: 0, under_review: 0, approved: 0, rejected: 0, returned: 0, unassigned: 0, myTasks: 0 };

  return (
    <div className="flex h-full">
      {/* ── Left: task list ── */}
      <div className={cn("flex flex-col border-r bg-background transition-all duration-200", selectedTask ? "hidden md:flex md:w-[480px] shrink-0" : "flex-1")}>
        {/* Header */}
        <div className="border-b px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-[#26374a]" />
              <h1 className="text-lg font-semibold text-[#26374a]">Task Queue</h1>
              <Badge variant="secondary" className="ml-1">{tasksResult?.items?.length ?? 0}</Badge>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <StatCard label="Submitted" value={stats.submitted} color="text-blue-600" />
            <StatCard label="In Review" value={stats.under_review} color="text-amber-600" />
            <StatCard label="Unassigned" value={stats.unassigned} color="text-red-600" />
            <StatCard label="My Tasks" value={stats.myTasks} color="text-[#26374a]" />
          </div>

          {/* Search + Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-8 h-9"
                placeholder="Search ref, form, contact…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[110px] h-9">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="me">My Tasks</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#26374a]/10 border-b text-sm">
            <span className="font-medium">{selectedIds.size} selected</span>
            <Button size="sm" variant="outline" onClick={handleBulkClaim}>
              <ClipboardCheck className="w-3.5 h-3.5 mr-1" /> Claim All
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setReviewDialog({ open: true, action: "approve", ids: Array.from(selectedIds) })}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setReviewDialog({ open: true, action: "reject", ids: Array.from(selectedIds) })}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        )}

        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b text-xs text-muted-foreground font-medium bg-muted/30">
          <Checkbox
            checked={allSelected}
            data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
            onCheckedChange={toggleAll}
            className="shrink-0"
          />
          <span className="flex-1">Reference / Form</span>
          <span className="w-28 hidden sm:block">Status</span>
          <span className="w-20 hidden md:block">Priority</span>
          <span className="w-28 hidden lg:block">Assignee</span>
          <span className="w-8" />
        </div>

        {/* Task rows */}
        <div className="flex-1 overflow-auto">
          {tasksResult === undefined ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <Inbox className="w-8 h-8 opacity-40" />
              <p className="text-sm">No tasks match your filters</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={task._id}
                task={task}
                selected={selectedIds.has(task._id)}
                active={selectedTask === task._id}
                onSelect={() => toggleOne(task._id)}
                onClick={() => setSelectedTask(task._id)}
                onClaim={() => handleClaim(task._id)}
                onReview={(action) =>
                  setReviewDialog({ open: true, action, ids: [task._id] })
                }
                onSetPriority={(p) => handleSetPriority(task._id, p)}
                onAssign={(uid) => handleAssign(task._id, uid)}
                staffMembers={staffMembers ?? []}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right: task detail ── */}
      {selectedTask && (
        <div className="flex-1 overflow-auto">
          <TaskDetail
            submissionId={selectedTask}
            onClose={() => setSelectedTask(null)}
            onReview={(action) =>
              setReviewDialog({ open: true, action, ids: [selectedTask] })
            }
            onClaim={() => handleClaim(selectedTask)}
            staffMembers={staffMembers ?? []}
            onAssign={(uid) => handleAssign(selectedTask, uid)}
            onSetPriority={(p) => handleSetPriority(selectedTask, p)}
          />
        </div>
      )}

      {/* Review dialog */}
      {reviewDialog && (
        <ReviewDialog
          open={reviewDialog.open}
          onClose={() => setReviewDialog(null)}
          ids={reviewDialog.ids}
          action={reviewDialog.action}
          onConfirm={handleReviewConfirm}
        />
      )}
    </div>
  );
}

function Building2Icon() {
  return (
    <svg viewBox="0 0 24 24" className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

// ─── Task Row ────────────────────────────────────────────────────────────────

type StaffMember = { _id: Id<"users">; name: string; role: string };

function TaskRow({
  task,
  selected,
  active,
  onSelect,
  onClick,
  onClaim,
  onReview,
  onSetPriority,
  onAssign,
  staffMembers,
}: {
  task: TaskItem;
  selected: boolean;
  active: boolean;
  onSelect: () => void;
  onClick: () => void;
  onClaim: () => void;
  onReview: (a: "approve" | "reject" | "return" | "request_info") => void;
  onSetPriority: (p: "low" | "normal" | "high" | "urgent") => void;
  onAssign: (uid: Id<"users"> | undefined) => void;
  staffMembers: StaffMember[];
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 border-b cursor-pointer hover:bg-muted/40 transition-colors",
        active && "bg-[#26374a]/5 border-l-2 border-l-[#26374a]",
        selected && "bg-blue-50 dark:bg-blue-950/20",
      )}
      onClick={onClick}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onSelect}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">{task.referenceNumber}</span>
        </div>
        <p className="text-sm font-medium truncate">{task.formName}</p>
        {task.contactName && (
          <p className="text-xs text-muted-foreground truncate">{task.contactName}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(task.submittedAt), { addSuffix: true })}
        </p>
      </div>

      <div className="w-28 hidden sm:block">
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[task.status])}>
          {STATUS_LABELS[task.status] ?? task.status}
        </span>
      </div>

      <div className="w-20 hidden md:flex items-center gap-1">
        <Flag className={cn("w-3 h-3", PRIORITY_COLORS[task.priority])} />
        <span className={cn("text-xs", PRIORITY_COLORS[task.priority])}>
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>

      <div className="w-28 hidden lg:block text-xs text-muted-foreground truncate">
        {task.assigneeName ?? <span className="italic">Unassigned</span>}
      </div>

      {/* Row actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClaim(); }}>
            <ClipboardCheck className="w-4 h-4 mr-2" /> Claim task
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReview("approve"); }}>
            <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Approve
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReview("reject"); }}>
            <XCircle className="w-4 h-4 mr-2 text-red-600" /> Reject
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReview("return"); }}>
            <RotateCcw className="w-4 h-4 mr-2 text-purple-600" /> Return for changes
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReview("request_info"); }}>
            <MessageSquare className="w-4 h-4 mr-2 text-amber-600" /> Request info
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">Set priority</DropdownMenuItem>
          {(["urgent", "high", "normal", "low"] as const).map((p) => (
            <DropdownMenuItem key={p} onClick={(e) => { e.stopPropagation(); onSetPriority(p); }}>
              <Flag className={cn("w-3.5 h-3.5 mr-2", PRIORITY_COLORS[p])} />
              {PRIORITY_LABELS[p]}
            </DropdownMenuItem>
          ))}
          {staffMembers.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">Assign to</DropdownMenuItem>
              {staffMembers.map((m) => (
                <DropdownMenuItem key={m._id} onClick={(e) => { e.stopPropagation(); onAssign(m._id); }}>
                  <User className="w-3.5 h-3.5 mr-2" />
                  {m.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssign(undefined); }}>
                <User className="w-3.5 h-3.5 mr-2 opacity-40" /> Unassign
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function TasksPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-muted-foreground">Sign in to access the task queue.</p>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </AuthLoading>
      <Authenticated>
        <TaskQueueInner />
      </Authenticated>
    </>
  );
}
