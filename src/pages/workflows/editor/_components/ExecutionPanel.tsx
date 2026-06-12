import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Clock, CheckCircle, XCircle, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useState } from "react";

type NodeSummary = {
  _id: string;
  label?: string;
  nodeType: string;
};

type ExecutionPanelProps = {
  workflowId: Id<"workflows">;
  currentExecutionId: Id<"executions"> | null;
  nodes: NodeSummary[];
};

function JsonViewer({ label, data }: { label: string; data: unknown }) {
  const [open, setOpen] = useState(false);
  if (data === undefined || data === null) return null;
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        {label}
      </button>
      {open && (
        <pre
          className="mt-1 p-2 rounded-md bg-gray-50 border border-gray-200 text-[10px] text-gray-700 overflow-auto max-h-40 leading-relaxed font-mono"
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function statusBadge(status: string) {
  if (status === "running") return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0 cursor-default">Running</Badge>
      </TooltipTrigger>
      <TooltipContent>This node is currently executing</TooltipContent>
    </Tooltip>
  );
  if (status === "success") return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0 cursor-default">Success</Badge>
      </TooltipTrigger>
      <TooltipContent>Node executed successfully — expand Output to see results</TooltipContent>
    </Tooltip>
  );
  if (status === "failed") return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0 cursor-default">Failed</Badge>
      </TooltipTrigger>
      <TooltipContent>Node execution failed — see the error message below</TooltipContent>
    </Tooltip>
  );
  return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{status}</Badge>;
}

export default function ExecutionPanel({ workflowId, currentExecutionId, nodes }: ExecutionPanelProps) {
  const executions = useQuery(api.executions.list, { workflowId });
  const currentExecution = useQuery(
    api.executions.get,
    currentExecutionId ? { executionId: currentExecutionId } : "skip"
  );
  const logs = useQuery(
    api.executions.getLogs,
    currentExecutionId ? { executionId: currentExecutionId } : "skip"
  );

  const isRunning = currentExecution?.status === "running";

  const nodeLabel = (nodeId: string): string => {
    const found = nodes.find((n) => n._id === nodeId);
    if (found) return found.label ?? found.nodeType;
    return nodeId.slice(-6);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-800">Execution</span>
        {isRunning && (
          <span className="flex items-center gap-1.5 ml-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[10px] text-green-600 font-medium">Live</span>
          </span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-3 space-y-4">

          {/* Current execution logs */}
          {currentExecutionId && (
            <div>
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                Current Run
              </div>
              {logs === undefined ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
                  <Loader2 className="size-3 animate-spin" />
                  Loading logs...
                </div>
              ) : logs.length === 0 ? (
                <div className="text-xs text-gray-400 py-2 px-1">No log entries yet.</div>
              ) : (
                <div className="space-y-1.5">
                  {logs.map((log) => {
                    const duration =
                      currentExecution?.startedAt
                        ? formatDuration(log._creationTime - new Date(currentExecution.startedAt).getTime())
                        : null;
                    return (
                      <div
                        key={log._id}
                        className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[120px]">
                            {nodeLabel(log.nodeId)}
                          </span>
                          {statusBadge(log.status)}
                          {duration && (
                            <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-400">
                              <Clock className="size-3" />
                              {duration}
                            </span>
                          )}
                        </div>
                        {log.error && (
                          <div className="mt-1 text-[10px] text-red-500 font-mono truncate">{log.error}</div>
                        )}
                        <JsonViewer label="Input" data={log.input} />
                        <JsonViewer label="Output" data={log.output} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Execution history */}
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
              History
            </div>
            {executions === undefined ? (
              <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
                <Loader2 className="size-3 animate-spin" />
                Loading...
              </div>
            ) : executions.length === 0 ? (
              <div className="text-xs text-gray-400 py-2 px-1">No executions yet. Click "Test Run" to start.</div>
            ) : (
              <div className="space-y-1.5">
                {executions.map((exec, idx) => {
                  const runNum = executions.length - idx;
                  const duration =
                    exec.startedAt && exec.finishedAt
                      ? formatDuration(
                          new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime()
                        )
                      : exec.startedAt && exec.status === "running"
                        ? "running"
                        : null;
                  const isCurrent = exec._id === currentExecutionId;
                  return (
                    <div
                      key={exec._id}
                      className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${isCurrent ? "border-blue-200 bg-blue-50" : "border-gray-100 bg-gray-50"}`}
                    >
                      {exec.status === "running" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Loader2 className="size-3.5 text-blue-500 animate-spin shrink-0 cursor-default" />
                          </TooltipTrigger>
                          <TooltipContent>Execution in progress</TooltipContent>
                        </Tooltip>
                      ) : exec.status === "success" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CheckCircle className="size-3.5 text-green-500 shrink-0 cursor-default" />
                          </TooltipTrigger>
                          <TooltipContent>Execution completed successfully</TooltipContent>
                        </Tooltip>
                      ) : exec.status === "failed" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <XCircle className="size-3.5 text-red-500 shrink-0 cursor-default" />
                          </TooltipTrigger>
                          <TooltipContent>Execution failed — one or more nodes errored</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Clock className="size-3.5 text-gray-400 shrink-0 cursor-default" />
                          </TooltipTrigger>
                          <TooltipContent>Execution status unknown</TooltipContent>
                        </Tooltip>
                      )}
                      <span className="text-[11px] font-semibold text-gray-700">
                        #{runNum}
                      </span>
                      {statusBadge(exec.status)}
                      {duration && duration !== "running" && (
                        <span className="ml-auto text-[10px] text-gray-400 flex items-center gap-1">
                          <Clock className="size-3" />
                          {duration}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
