/**
 * WorkflowRuns — shows workflow executions linked to a submission.
 * Used inside the task detail panel.
 */
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils.ts";
import { formatDistanceToNow } from "date-fns";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CheckCircle2, XCircle, Clock, RefreshCw, GitBranch } from "lucide-react";

const RUN_STATUS: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  triggered: { label: "Triggered", cls: "bg-blue-100 text-blue-800", icon: <Clock className="w-3 h-3" /> },
  running: { label: "Running", cls: "bg-amber-100 text-amber-800", icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  success: { label: "Success", cls: "bg-green-100 text-green-800", icon: <CheckCircle2 className="w-3 h-3" /> },
  failed: { label: "Failed", cls: "bg-red-100 text-red-800", icon: <XCircle className="w-3 h-3" /> },
};

export default function WorkflowRuns({ submissionId }: { submissionId: Id<"submissions"> }) {
  const navigate = useNavigate();
  const runs = useQuery(api.formIntegrations.listRunsForSubmission, { submissionId });

  if (runs === undefined) {
    return <Skeleton className="h-16 w-full" />;
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
        <GitBranch className="w-6 h-6 opacity-30" />
        <p className="text-sm">No workflow runs for this submission.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => {
        const meta = RUN_STATUS[run.status] ?? RUN_STATUS.triggered;
        const duration = run.completedAt
          ? Math.round(
              (new Date(run.completedAt).getTime() - new Date(run.triggeredAt).getTime()) / 1000,
            )
          : null;
        return (
          <div
            key={run._id}
            className="flex items-center gap-3 rounded-lg border p-3 text-sm"
          >
            <GitBranch className="w-4 h-4 text-[#26374a] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{run.workflowName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(run.triggeredAt), { addSuffix: true })}
                {duration !== null && ` · ${duration}s`}
              </p>
            </div>
            <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", meta.cls)}>
              {meta.icon} {meta.label}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 shrink-0"
              onClick={() => navigate(`/workflows/${run.workflowId}`)}
            >
              View
            </Button>
          </div>
        );
      })}
    </div>
  );
}
