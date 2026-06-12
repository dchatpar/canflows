// Backend expression resolver — pure TS, no browser APIs, no React, no src/ imports.
// Mirrors the logic in src/lib/expressions.ts.

export type ExpressionContext = {
  nodes: Array<{
    id: string;
    label?: string;
    nodeType: string;
    output?: Record<string, unknown>;
  }>;
  workflowId: string;
  executionId?: string;
  now: string;
};

const EXPR_RE = /\{\{\s*(.*?)\s*\}\}/g;

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function resolveExpression(expr: string, context: ExpressionContext): string | null {
  const trimmed = expr.trim();

  if (trimmed === "$now") return context.now;
  if (trimmed === "$workflow.id") return context.workflowId;
  if (trimmed === "$execution.id") return context.executionId ?? "unknown";

  // $node["Label"].json  or  $node["Label"].json.field
  const nodeMatch = /^\$node\["([^"]+)"\]\.json(?:\.(.+))?$/.exec(trimmed);
  if (nodeMatch) {
    const [, label, fieldPath] = nodeMatch;
    const found = context.nodes.find((n) => n.label === label || n.id === label);
    if (!found?.output) return null;

    if (!fieldPath) return JSON.stringify(found.output);

    const value = getNestedValue(found.output, fieldPath);
    if (value === undefined) return null;
    return typeof value === "string" ? value : JSON.stringify(value);
  }

  // $item.field → first upstream node's output
  const itemMatch = /^\$item\.(.+)$/.exec(trimmed);
  if (itemMatch) {
    const [, fieldPath] = itemMatch;
    const firstWithOutput = context.nodes.find((n) => n.output !== undefined);
    if (!firstWithOutput?.output) return null;
    const value = getNestedValue(firstWithOutput.output, fieldPath);
    if (value === undefined) return null;
    return typeof value === "string" ? value : JSON.stringify(value);
  }

  return null;
}

function resolveExpressions(value: string, context: ExpressionContext): string {
  return value.replace(EXPR_RE, (match: string, expr: string) => {
    const resolved = resolveExpression(expr, context);
    return resolved !== null ? resolved : match;
  });
}

function resolveValue(value: unknown, context: ExpressionContext): unknown {
  if (typeof value === "string") return resolveExpressions(value, context);
  if (Array.isArray(value)) return value.map((item) => resolveValue(item, context));
  if (value !== null && typeof value === "object") {
    return resolveConfigExpressions(value as Record<string, unknown>, context);
  }
  return value;
}

export function resolveConfigExpressions(
  config: Record<string, unknown>,
  context: ExpressionContext
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    resolved[key] = resolveValue(value, context);
  }
  return resolved;
}
