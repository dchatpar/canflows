// Expression resolver for {{ ... }} template syntax
// Supports:
//   {{ $now }}                        → current ISO timestamp
//   {{ $workflow.id }}                → workflowId
//   {{ $execution.id }}               → executionId or "unknown"
//   {{ $node["Label"].json }}         → full JSON of a node's output
//   {{ $node["Label"].json.field }}   → specific field from a node's output
//   {{ $item.field }}                 → first upstream node's output field

export type ExpressionContext = {
  nodes: Array<{
    id: string;
    label?: string;
    nodeType: string;
    output?: Record<string, unknown>;
  }>;
  workflowId: string;
  executionId?: string;
  now: string; // ISO string
};

const EXPR_RE = /\{\{\s*(.*?)\s*\}\}/g;

// Resolve a dot-separated path on an object
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

  // $now
  if (trimmed === "$now") {
    return context.now;
  }

  // $workflow.id
  if (trimmed === "$workflow.id") {
    return context.workflowId;
  }

  // $execution.id
  if (trimmed === "$execution.id") {
    return context.executionId ?? "unknown";
  }

  // $node["Label"].json  or  $node["Label"].json.field
  const nodeMatch = /^\$node\["([^"]+)"\]\.json(?:\.(.+))?$/.exec(trimmed);
  if (nodeMatch) {
    const [, label, fieldPath] = nodeMatch;
    const found = context.nodes.find(
      (n) => n.label === label || n.id === label
    );
    if (!found?.output) return null;

    if (!fieldPath) {
      // Return entire output as JSON string
      return JSON.stringify(found.output);
    }

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

/**
 * Resolves all {{ ... }} expressions in a string value.
 * Unresolvable expressions are left as-is.
 */
export function resolveExpressions(value: string, context: ExpressionContext): string {
  return value.replace(EXPR_RE, (match, expr: string) => {
    const resolved = resolveExpression(expr, context);
    return resolved !== null ? resolved : match;
  });
}

/**
 * Recursively resolves all string values in a config object.
 */
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

function resolveValue(value: unknown, context: ExpressionContext): unknown {
  if (typeof value === "string") {
    return resolveExpressions(value, context);
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, context));
  }
  if (value !== null && typeof value === "object") {
    return resolveConfigExpressions(value as Record<string, unknown>, context);
  }
  return value;
}

/**
 * Build autocomplete suggestions for a given set of upstream nodes.
 */
export type ExpressionSuggestion = {
  label: string;
  value: string;
  description: string;
};

export function buildSuggestions(
  upstreamNodes: Array<{
    label?: string;
    nodeType: string;
    output?: Record<string, unknown>;
  }>
): ExpressionSuggestion[] {
  const suggestions: ExpressionSuggestion[] = [
    { label: "$now", value: "{{ $now }}", description: "Current ISO timestamp" },
    { label: "$workflow.id", value: "{{ $workflow.id }}", description: "Workflow ID" },
    { label: "$execution.id", value: "{{ $execution.id }}", description: "Execution ID" },
  ];

  for (const node of upstreamNodes) {
    const name = node.label ?? node.nodeType;
    suggestions.push({
      label: `$node["${name}"].json`,
      value: `{{ $node["${name}"].json }}`,
      description: `Full output of "${name}"`,
    });

    if (node.output) {
      for (const field of Object.keys(node.output)) {
        suggestions.push({
          label: `$node["${name}"].json.${field}`,
          value: `{{ $node["${name}"].json.${field} }}`,
          description: `"${field}" from "${name}"`,
        });
      }
    }
  }

  return suggestions;
}
