"use node";

import { internalAction } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

// ---------------------------------------------------------------------------
// Shared types (mirrored from execute.ts)
// ---------------------------------------------------------------------------

type NodeShape = {
  _id: string;
  nodeType: string;
  configuration?: Record<string, unknown>;
  label?: string;
};

type ConnectionShape = {
  sourceNodeId: string;
  targetNodeId: string;
};

// ---------------------------------------------------------------------------
// Config validation helpers
// ---------------------------------------------------------------------------

type ValidationError = string;

function validateNodeConfig(node: NodeShape): ValidationError[] {
  const config = node.configuration ?? {};
  const errors: ValidationError[] = [];

  switch (node.nodeType) {
    case "http":
      if (!config.url || typeof config.url !== "string" || config.url.trim() === "") {
        errors.push(`Node "${node.label ?? node._id}" (http): missing required field "url"`);
      }
      break;
    case "email":
      if (!config.to || typeof config.to !== "string" || config.to.trim() === "") {
        errors.push(`Node "${node.label ?? node._id}" (email): missing required field "to"`);
      }
      if (!config.subject || typeof config.subject !== "string" || config.subject.trim() === "") {
        errors.push(`Node "${node.label ?? node._id}" (email): missing required field "subject"`);
      }
      break;
    case "set":
      if (!config.variable || typeof config.variable !== "string" || config.variable.trim() === "") {
        errors.push(`Node "${node.label ?? node._id}" (set): missing required field "variable"`);
      }
      break;
  }

  return errors;
}

function validateAllNodes(nodes: NodeShape[]): ValidationError[] {
  return nodes.flatMap(validateNodeConfig);
}

// ---------------------------------------------------------------------------
// Safe filter evaluation
// ---------------------------------------------------------------------------

const COMPARISON_RE =
  /^\s*([\w.]+)\s*(>=|<=|!=|==|>|<)\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?)\s*$/;

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/^data\./, "").split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function safeEvalFilter(
  condition: string,
  inputData: Record<string, unknown>
): { passed: boolean; error?: string } {
  const match = COMPARISON_RE.exec(condition);
  if (!match) {
    return { passed: false, error: "Invalid condition: unsupported expression format" };
  }

  const [, leftPath, op, rightRaw] = match;

  let rightValue: unknown;
  if (rightRaw.startsWith('"') || rightRaw.startsWith("'")) {
    rightValue = rightRaw.slice(1, -1).replace(/\\(.)/g, "$1");
  } else {
    rightValue = parseFloat(rightRaw);
  }

  const leftValue = getNestedValue(inputData, leftPath);
  const left = typeof rightValue === "number" ? Number(leftValue) : leftValue;

  switch (op) {
    case ">":  return { passed: (left as number) > (rightValue as number) };
    case "<":  return { passed: (left as number) < (rightValue as number) };
    case ">=": return { passed: (left as number) >= (rightValue as number) };
    case "<=": return { passed: (left as number) <= (rightValue as number) };
    case "==": return { passed: left == rightValue };
    case "!=": return { passed: left != rightValue };
    default:   return { passed: false, error: "Invalid condition: unknown operator" };
  }
}

// ---------------------------------------------------------------------------
// Safe transform evaluation
// ---------------------------------------------------------------------------

const FIELD_NAME_RE = /^[\w.]+$/;
const OBJECT_MAPPING_RE = /^\s*\{([^}]+)\}\s*$/;
const MAPPING_ENTRY_RE = /^\s*([\w]+)\s*:\s*([\w.]+)\s*$/;

function safeEvalTransform(
  expression: string,
  inputData: Record<string, unknown>
): unknown {
  const trimmed = expression.trim();

  if (FIELD_NAME_RE.test(trimmed)) {
    return getNestedValue(inputData, trimmed);
  }

  const objectMatch = OBJECT_MAPPING_RE.exec(trimmed);
  if (objectMatch) {
    const entries = objectMatch[1].split(",");
    const result: Record<string, unknown> = {};
    for (const entry of entries) {
      const entryMatch = MAPPING_ENTRY_RE.exec(entry);
      if (!entryMatch) {
        console.warn(`[transform] Unparseable mapping entry: "${entry}". Returning input unchanged.`);
        return inputData;
      }
      const [, newKey, sourceField] = entryMatch;
      result[newKey] = getNestedValue(inputData, sourceField);
    }
    return result;
  }

  console.warn(`[transform] Expression not safely parseable: "${expression}". Returning input unchanged.`);
  return inputData;
}

// ---------------------------------------------------------------------------
// Safe code node
// ---------------------------------------------------------------------------

function safeCodeOperation(
  config: Record<string, unknown>,
  inputData: Record<string, unknown>
): unknown {
  if (typeof config.code === "string") {
    console.warn("[code] Raw code execution is disabled. Returning input data unchanged.");
    return inputData;
  }

  const op = config.operation as string | undefined;
  if (!op) return inputData;

  const fields = Array.isArray(config.fields)
    ? (config.fields as string[]).filter((f): f is string => typeof f === "string")
    : [];

  const mapping =
    config.mapping !== null &&
    config.mapping !== undefined &&
    typeof config.mapping === "object" &&
    !Array.isArray(config.mapping)
      ? (config.mapping as Record<string, string>)
      : {};

  switch (op) {
    case "pick": {
      const picked: Record<string, unknown> = {};
      for (const field of fields) picked[field] = inputData[field];
      return picked;
    }
    case "omit": {
      const omitted: Record<string, unknown> = { ...inputData };
      for (const field of fields) delete omitted[field];
      return omitted;
    }
    case "merge": {
      if (fields.length === 0) return inputData;
      const merged: Record<string, unknown> = {};
      for (const field of fields) {
        const val = inputData[field];
        if (val !== null && val !== undefined && typeof val === "object" && !Array.isArray(val)) {
          Object.assign(merged, val as Record<string, unknown>);
        } else {
          merged[field] = val;
        }
      }
      return merged;
    }
    case "rename": {
      const renamed: Record<string, unknown> = { ...inputData };
      for (const [oldKey, newKey] of Object.entries(mapping)) {
        if (typeof newKey === "string" && Object.prototype.hasOwnProperty.call(renamed, oldKey)) {
          renamed[newKey] = renamed[oldKey];
          delete renamed[oldKey];
        }
      }
      return renamed;
    }
    default:
      console.warn(`[code] Unknown operation "${op}". Returning input unchanged.`);
      return inputData;
  }
}

// ---------------------------------------------------------------------------
// HTTP node with timeout + retry
// ---------------------------------------------------------------------------

async function executeHttpNode(
  config: Record<string, unknown>
): Promise<{ statusCode: number; data: unknown }> {
  const url = config.url as string;
  const method = typeof config.method === "string" ? config.method.toUpperCase() : "GET";

  let headers: Record<string, string> = {};
  if (config.headers) {
    try {
      const parsed: unknown = JSON.parse(config.headers as string);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        headers = parsed as Record<string, string>;
      } else {
        console.warn("[http] headers field is not a JSON object — using empty headers.");
      }
    } catch {
      console.warn("[http] Failed to parse headers JSON — using empty headers.");
    }
  }

  const body =
    method !== "GET" && config.body && typeof config.body === "string"
      ? config.body
      : undefined;

  const doFetch = async (): Promise<{ statusCode: number; data: unknown }> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, { method, headers, body, signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP request failed with status ${response.status} ${response.statusText}`);
      }
      const contentType = response.headers.get("content-type") ?? "";
      const data: unknown = contentType.includes("application/json")
        ? await response.json()
        : await response.text();
      return { statusCode: response.status, data };
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    return await doFetch();
  } catch (error) {
    const isNetworkError =
      error instanceof TypeError ||
      (error instanceof Error && error.name === "AbortError");
    if (isNetworkError) {
      console.warn("[http] Network error on first attempt, retrying in 1s…");
      await new Promise<void>((resolve) => setTimeout(resolve, 1_000));
      return await doFetch();
    }
    throw new Error(
      `HTTP request failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// ---------------------------------------------------------------------------
// Build input data for a node from upstream outputs
// ---------------------------------------------------------------------------

function buildInputData(
  nodeId: string,
  connections: ConnectionShape[],
  executionData: Record<string, unknown>
): Record<string, unknown> {
  const incomingConnections = connections.filter((c) => c.targetNodeId === nodeId);

  if (incomingConnections.length === 0) return {};

  if (incomingConnections.length === 1) {
    const upstreamOutput = executionData[incomingConnections[0].sourceNodeId];
    if (
      upstreamOutput !== null &&
      upstreamOutput !== undefined &&
      typeof upstreamOutput === "object" &&
      !Array.isArray(upstreamOutput)
    ) {
      return upstreamOutput as Record<string, unknown>;
    }
    return {};
  }

  const merged: Record<string, unknown> = {};
  for (const conn of incomingConnections) {
    merged[conn.sourceNodeId] = executionData[conn.sourceNodeId];
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Execute individual node
// ---------------------------------------------------------------------------

async function executeNode(
  node: NodeShape,
  inputData: Record<string, unknown>
): Promise<unknown> {
  const config = node.configuration ?? {};

  switch (node.nodeType) {
    case "webhook":
      return {
        triggered: true,
        timestamp: new Date().toISOString(),
        message: "Webhook triggered",
        ...inputData,
      };

    case "schedule":
      return {
        triggered: true,
        timestamp: new Date().toISOString(),
        schedule: config.cron ?? "scheduled",
      };

    case "http":
      return executeHttpNode(config);

    case "email":
      return {
        sent: true,
        to: config.to,
        subject: config.subject,
        timestamp: new Date().toISOString(),
      };

    case "database":
      return {
        executed: true,
        query: config.query ?? "SELECT * FROM table",
        rowCount: 0,
      };

    case "filter": {
      const condition = typeof config.condition === "string" ? config.condition : "true";
      const result = safeEvalFilter(condition, inputData);
      return { passed: result.passed, condition, ...(result.error ? { error: result.error } : {}) };
    }

    case "code":
      return safeCodeOperation(config, inputData);

    case "transform": {
      const expression = typeof config.expression === "string" ? config.expression : "";
      if (!expression) return inputData;
      return safeEvalTransform(expression, inputData);
    }

    case "set": {
      const variable = config.variable as string;
      const value = config.value ?? "";
      return { [variable]: value };
    }

    default:
      return {
        nodeType: node.nodeType,
        message: "Node executed",
        timestamp: new Date().toISOString(),
      };
  }
}

// ---------------------------------------------------------------------------
// executeWorkflowInternal — internal action (no auth check)
// ---------------------------------------------------------------------------

export const executeWorkflowInternal = internalAction({
  args: {
    workflowId: v.id("workflows"),
    triggerNodeId: v.optional(v.id("nodes")),
    triggerType: v.optional(v.string()),
    triggerData: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<Id<"executions">> => {
    const workflow = await ctx.runQuery(internal.workflowsInternal.getInternal, {
      workflowId: args.workflowId,
    });
    if (!workflow) {
      throw new ConvexError({ message: "Workflow not found", code: "NOT_FOUND" });
    }

    const nodes = (await ctx.runQuery(internal.nodesInternal.listInternal, {
      workflowId: args.workflowId,
    })) as NodeShape[];

    const connections = (await ctx.runQuery(internal.connectionsInternal.listInternal, {
      workflowId: args.workflowId,
    })) as ConnectionShape[];

    // Pre-execution validation
    const configErrors = validateAllNodes(nodes);
    if (configErrors.length > 0) {
      throw new ConvexError({
        message: `Workflow validation failed:\n${configErrors.join("\n")}`,
        code: "BAD_REQUEST",
      });
    }

    // Create execution record with trigger metadata
    const executionId = await ctx.runMutation(internal.executionsInternal.createWithTrigger, {
      workflowId: args.workflowId,
      triggerType: args.triggerType,
      triggerData: args.triggerData,
    });

    // Build execution graph
    const nodeMap = new Map<string, NodeShape>(nodes.map((n) => [n._id, n]));
    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of nodes) {
      adjacencyList.set(node._id, []);
      inDegree.set(node._id, 0);
    }

    for (const conn of connections) {
      adjacencyList.get(conn.sourceNodeId)?.push(conn.targetNodeId);
      inDegree.set(conn.targetNodeId, (inDegree.get(conn.targetNodeId) ?? 0) + 1);
    }

    // Find root nodes (no incoming connections)
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(nodeId);
    }

    if (queue.length === 0) {
      await ctx.runMutation(internal.executionsInternal.updateStatus, {
        executionId,
        status: "failed",
        error: "No trigger nodes found",
      });
      throw new ConvexError({
        message: "Workflow must have at least one trigger node",
        code: "BAD_REQUEST",
      });
    }

    // Seed trigger node data so downstream nodes receive the incoming payload
    const executionData: Record<string, unknown> = {};
    if (args.triggerNodeId && args.triggerData) {
      executionData[args.triggerNodeId] = args.triggerData;
    }

    // Topological execution
    try {
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        const node = nodeMap.get(nodeId);
        if (!node) continue;

        // If this is the seeded trigger node, skip re-execution and just propagate downstream
        if (
          args.triggerNodeId &&
          nodeId === args.triggerNodeId &&
          executionData[nodeId] !== undefined
        ) {
          const nextNodes = adjacencyList.get(nodeId) ?? [];
          for (const nextNodeId of nextNodes) {
            const nextDegree = (inDegree.get(nextNodeId) ?? 0) - 1;
            inDegree.set(nextNodeId, nextDegree);
            if (nextDegree === 0) queue.push(nextNodeId);
          }
          continue;
        }

        await ctx.runMutation(internal.executionLogsInternal.create, {
          executionId,
          nodeId: nodeId as Id<"nodes">,
          status: "running",
        });

        try {
          const inputData = buildInputData(nodeId, connections, executionData);
          const result = await executeNode(node, inputData);
          executionData[nodeId] = result;

          await ctx.runMutation(internal.executionLogsInternal.updateLatest, {
            executionId,
            nodeId: nodeId as Id<"nodes">,
            status: "success",
            output: result as Record<string, unknown>,
          });

          const nextNodes = adjacencyList.get(nodeId) ?? [];
          for (const nextNodeId of nextNodes) {
            const nextDegree = (inDegree.get(nextNodeId) ?? 0) - 1;
            inDegree.set(nextNodeId, nextDegree);
            if (nextDegree === 0) queue.push(nextNodeId);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          await ctx.runMutation(internal.executionLogsInternal.updateLatest, {
            executionId,
            nodeId: nodeId as Id<"nodes">,
            status: "failed",
            error: errorMessage,
          });
          throw error;
        }
      }

      await ctx.runMutation(internal.executionsInternal.updateStatus, {
        executionId,
        status: "success",
        data: executionData,
      });

      return executionId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.executionsInternal.updateStatus, {
        executionId,
        status: "failed",
        error: errorMessage,
      });
      throw error;
    }
  },
});
