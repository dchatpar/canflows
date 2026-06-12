import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useEffect } from "react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import type { Node } from "@xyflow/react";
import type { WorkflowNodeData } from "../_components/WorkflowNode.tsx";

type UseExecutionStatusProps = {
  executionId: Id<"executions"> | null;
  setFlowNodes: (nodes: Node<WorkflowNodeData>[] | ((prev: Node<WorkflowNodeData>[]) => Node<WorkflowNodeData>[])) => void;
};

export function useExecutionStatus({ executionId, setFlowNodes }: UseExecutionStatusProps) {
  const logs = useQuery(
    api.executions.getLogs,
    executionId ? { executionId } : "skip"
  );

  useEffect(() => {
    if (!logs) return;

    // Update node statuses based on logs
    setFlowNodes((nodes) =>
      nodes.map((node) => {
        const nodeLog = logs.find((log) => log.nodeId === node.id);
        if (nodeLog) {
          return {
            ...node,
            data: {
              ...node.data,
              // Map "skipped" to undefined since WorkflowNodeData.status doesn't include it
              status: nodeLog.status === "skipped" ? undefined : nodeLog.status,
            },
          };
        }
        return node;
      })
    );
  }, [logs, setFlowNodes]);

  return { logs };
}
