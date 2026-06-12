"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";
import { resolveConfigExpressions, type ExpressionContext } from "./expressionResolver";

// ---------------------------------------------------------------------------
// Types
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
  sourcePort?: string;
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

type CodeOperation =
  | { operation: "pick"; fields: string[] }
  | { operation: "omit"; fields: string[] }
  | { operation: "merge"; fields?: string[]; mapping?: Record<string, string> }
  | { operation: "rename"; mapping: Record<string, string> };

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

// Satisfy TypeScript — CodeOperation is used via its union discriminant in safeCodeOperation
const _codeOpTypeCheck: CodeOperation = { operation: "pick", fields: [] };
void _codeOpTypeCheck;

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
    if (upstreamOutput !== null && upstreamOutput !== undefined && typeof upstreamOutput === "object" && !Array.isArray(upstreamOutput)) {
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

const BRANCHING_NODE_TYPES = new Set(["ifelse", "switch"]);

async function executeNode(
  node: NodeShape,
  inputData: Record<string, unknown>,
  exprContext: ExpressionContext
): Promise<unknown> {
  // Resolve expressions in configuration before executing
  const rawConfig = node.configuration ?? {};
  const config = resolveConfigExpressions(rawConfig, exprContext);

  switch (node.nodeType) {
    case "webhook":
      return {
        triggered: true,
        timestamp: new Date().toISOString(),
        message: "Webhook triggered",
      };

    case "schedule":
      return {
        triggered: true,
        timestamp: new Date().toISOString(),
        schedule: config.cron ?? "manual",
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

    // ── Logic nodes ──────────────────────────────────────────────────────────

    case "ifelse": {
      const condition = typeof config.condition === "string" ? config.condition : "false";
      const result = safeEvalFilter(condition, inputData);
      const branch = result.passed ? "true" : "false";
      return { branch, ...inputData };
    }

    case "switch": {
      const fieldPath = typeof config.field === "string" ? config.field : "";
      const fieldValue = fieldPath ? getNestedValue(inputData, fieldPath) : undefined;

      let matchedIndex: number | "default" = "default";

      if (typeof config.cases === "string") {
        try {
          const cases = JSON.parse(config.cases) as Array<{ value: unknown; label?: string }>;
          const idx = cases.findIndex((c) => String(c.value) === String(fieldValue));
          if (idx !== -1) matchedIndex = idx;
        } catch {
          console.warn("[switch] Failed to parse cases JSON");
        }
      }

      return {
        branch: String(matchedIndex),
        value: fieldValue,
        ...inputData,
      };
    }

    case "merge": {
      // Merges all upstream outputs — inputData is already merged by buildInputData
      return inputData;
    }

    case "delay": {
      const seconds = typeof config.delaySeconds === "string"
        ? parseFloat(config.delaySeconds)
        : typeof config.delaySeconds === "number"
          ? config.delaySeconds
          : 0;
      const ms = typeof config.delayMs === "number"
        ? config.delayMs
        : Math.max(0, seconds * 1000);
      const clampedMs = Math.min(ms, 30_000); // cap at 30 seconds for safety
      if (clampedMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, clampedMs));
      }
      return { delayed: true, delayMs: clampedMs, ...inputData };
    }

    case "noOp":
      return inputData;

    // ── Communication integrations ────────────────────────────────────────────

    case "slack": {
      const webhookUrl = config.webhookUrl as string;
      if (!webhookUrl) throw new Error("Slack: webhookUrl is required");
      const payload = {
        text: config.text as string || "Workflow notification",
        username: config.username as string || "Workflow Bot",
      };
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { sent: true, status: response.status, channel: config.channel };
    }

    case "discord": {
      const webhookUrl = config.webhookUrl as string;
      if (!webhookUrl) throw new Error("Discord: webhookUrl is required");
      const payload = {
        content: config.content as string || "Workflow notification",
        username: config.username as string || "Workflow Bot",
      };
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { sent: true, status: response.status };
    }

    case "telegram": {
      const botToken = config.botToken as string;
      const chatId = config.chatId as string;
      if (!botToken || !chatId) throw new Error("Telegram: botToken and chatId are required");
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: config.text as string || "Workflow notification",
          parse_mode: "HTML",
        }),
      });
      const data = await response.json() as { result?: { message_id?: number } };
      return { sent: true, messageId: data.result?.message_id };
    }

    // ── Data integrations ─────────────────────────────────────────────────────

    case "googleSheets": {
      const apiKey = config.apiKey as string;
      const spreadsheetId = config.spreadsheetId as string;
      const range = config.range as string || "Sheet1!A1:Z1000";
      const operation = config.operation as string || "read";
      if (!apiKey || !spreadsheetId) throw new Error("Google Sheets: apiKey and spreadsheetId are required");

      if (operation === "read") {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Google Sheets API error: ${response.status}`);
        const data = await response.json() as { values?: string[][] };
        return { rows: data.values ?? [], count: data.values?.length ?? 0 };
      } else {
        let values: unknown[][] = [];
        try { values = JSON.parse(config.values as string || "[]") as unknown[][]; } catch { values = []; }
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values }),
        });
        if (!response.ok) throw new Error(`Google Sheets API error: ${response.status}`);
        return { appended: true, rows: values.length };
      }
    }

    case "airtable": {
      const apiKey = config.apiKey as string;
      const baseId = config.baseId as string;
      const tableId = config.tableId as string;
      const operation = config.operation as string || "list";
      if (!apiKey || !baseId || !tableId) throw new Error("Airtable: apiKey, baseId, and tableId are required");

      const headers = { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" };
      const baseUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`;

      if (operation === "list") {
        const response = await fetch(baseUrl, { headers });
        if (!response.ok) throw new Error(`Airtable API error: ${response.status}`);
        const data = await response.json() as { records: unknown[] };
        return { records: data.records, count: data.records.length };
      } else if (operation === "create") {
        let fields: Record<string, unknown> = {};
        try { fields = JSON.parse(config.fields as string || "{}") as Record<string, unknown>; } catch { /* empty */ }
        const response = await fetch(baseUrl, { method: "POST", headers, body: JSON.stringify({ fields }) });
        if (!response.ok) throw new Error(`Airtable API error: ${response.status}`);
        return await response.json() as Record<string, unknown>;
      } else if (operation === "update") {
        const recordId = config.recordId as string;
        let fields: Record<string, unknown> = {};
        try { fields = JSON.parse(config.fields as string || "{}") as Record<string, unknown>; } catch { /* empty */ }
        const response = await fetch(`${baseUrl}/${recordId}`, { method: "PATCH", headers, body: JSON.stringify({ fields }) });
        if (!response.ok) throw new Error(`Airtable API error: ${response.status}`);
        return await response.json() as Record<string, unknown>;
      } else {
        const recordId = config.recordId as string;
        const response = await fetch(`${baseUrl}/${recordId}`, { method: "DELETE", headers });
        if (!response.ok) throw new Error(`Airtable API error: ${response.status}`);
        return { deleted: true, recordId };
      }
    }

    case "notion": {
      const apiKey = config.apiKey as string;
      if (!apiKey) throw new Error("Notion: apiKey is required");
      const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      };
      const operation = config.operation as string || "getPage";

      if (operation === "getPage") {
        const pageId = config.pageId as string;
        const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, { headers });
        if (!response.ok) throw new Error(`Notion API error: ${response.status}`);
        return await response.json() as Record<string, unknown>;
      } else if (operation === "createPage") {
        const databaseId = config.databaseId as string;
        let properties: Record<string, unknown> = {};
        try { properties = JSON.parse(config.properties as string || "{}") as Record<string, unknown>; } catch { /* empty */ }
        const response = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers,
          body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
        });
        if (!response.ok) throw new Error(`Notion API error: ${response.status}`);
        return await response.json() as Record<string, unknown>;
      } else {
        const blockId = config.pageId as string;
        const content = config.content as string || "";
        const response = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            children: [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content } }] } }],
          }),
        });
        if (!response.ok) throw new Error(`Notion API error: ${response.status}`);
        return { appended: true };
      }
    }

    // ── AI integrations ───────────────────────────────────────────────────────

    case "openai": {
      const apiKey = config.apiKey as string;
      if (!apiKey) throw new Error("OpenAI: apiKey is required");
      const operation = config.operation as string || "chat";

      if (operation === "chat") {
        const model = config.model as string || "gpt-4o-mini";
        const messages: Array<{ role: string; content: string }> = [];
        if (config.systemPrompt) messages.push({ role: "system", content: config.systemPrompt as string });
        messages.push({ role: "user", content: config.userMessage as string || JSON.stringify(inputData) });
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages }),
        });
        if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
        const data = await response.json() as { choices: Array<{ message: { content: string } }> };
        return { text: data.choices[0]?.message?.content, model };
      } else if (operation === "embedding") {
        const response = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "text-embedding-3-small", input: config.userMessage as string || "" }),
        });
        if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
        const data = await response.json() as { data: Array<{ embedding: number[] }> };
        return { embedding: data.data[0]?.embedding, dimensions: data.data[0]?.embedding?.length };
      } else {
        return { error: "Unsupported operation", operation };
      }
    }

    case "anthropic": {
      const apiKey = config.apiKey as string;
      if (!apiKey) throw new Error("Anthropic: apiKey is required");
      const model = config.model as string || "claude-3-haiku-20240307";
      const messages = [{ role: "user", content: config.userMessage as string || JSON.stringify(inputData) }];
      const body: Record<string, unknown> = { model, max_completion_tokens: 1024, messages };
      if (config.systemPrompt) body.system = config.systemPrompt as string;
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
      const data = await response.json() as { content: Array<{ text: string }> };
      return { text: data.content[0]?.text, model };
    }

    // ── Developer integrations ────────────────────────────────────────────────

    case "github": {
      const token = config.token as string;
      if (!token) throw new Error("GitHub: token is required");
      const owner = config.owner as string;
      const repo = config.repo as string;
      const operation = config.operation as string || "listIssues";
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };

      if (operation === "listIssues") {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, { headers });
        if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
        const issues = await response.json() as Array<{ id: number; title: string; number: number }>;
        return { issues: issues.slice(0, 20), count: issues.length };
      } else if (operation === "createIssue") {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: "POST",
          headers,
          body: JSON.stringify({ title: config.title as string, body: config.body as string, labels: [] }),
        });
        if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
        return await response.json() as Record<string, unknown>;
      } else if (operation === "getRepo") {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
        if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
        return await response.json() as Record<string, unknown>;
      }
      return { operation, status: "not implemented" };
    }

    case "jira": {
      const domain = config.domain as string;
      const email = config.email as string;
      const apiToken = config.apiToken as string;
      if (!domain || !email || !apiToken) throw new Error("Jira: domain, email, and apiToken are required");
      const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
      const headers = {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      };
      const operation = config.operation as string || "getIssue";
      const baseUrl = `https://${domain}/rest/api/3`;

      if (operation === "createIssue") {
        const response = await fetch(`${baseUrl}/issue`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            fields: {
              project: { key: config.projectKey as string },
              summary: config.summary as string,
              issuetype: { name: config.issueType as string || "Task" },
            },
          }),
        });
        if (!response.ok) throw new Error(`Jira API error: ${response.status}`);
        return await response.json() as Record<string, unknown>;
      } else if (operation === "getIssue") {
        const response = await fetch(`${baseUrl}/issue/${config.issueKey as string}`, { headers });
        if (!response.ok) throw new Error(`Jira API error: ${response.status}`);
        return await response.json() as Record<string, unknown>;
      } else if (operation === "updateStatus") {
        const transitions = await fetch(`${baseUrl}/issue/${config.issueKey as string}/transitions`, { headers });
        return { note: "Use transitionId to update status", transitions: await transitions.json() as Record<string, unknown> };
      }
      return { operation, status: "not implemented" };
    }

    // ── Utility integrations ──────────────────────────────────────────────────

    case "rss": {
      const url = config.url as string;
      if (!url) throw new Error("RSS: url is required");
      const response = await fetch(url);
      if (!response.ok) throw new Error(`RSS fetch error: ${response.status}`);
      const text = await response.text();
      const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(text)) !== null && items.length < 20) {
        const item = match[1];
        const title = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/.exec(item);
        const link = /<link>([\s\S]*?)<\/link>/.exec(item);
        const desc = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/.exec(item);
        const pubDate = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(item);
        items.push({
          title: (title?.[1] ?? title?.[2] ?? "").trim(),
          link: (link?.[1] ?? "").trim(),
          description: (desc?.[1] ?? desc?.[2] ?? "").trim().slice(0, 200),
          pubDate: (pubDate?.[1] ?? "").trim(),
        });
      }
      return { items, count: items.length, url };
    }

    case "jsonTransform": {
      const operation = config.operation as string || "get";
      if (operation === "parse") {
        try {
          const parsed: unknown = JSON.parse(config.input as string || "{}");
          return { parsed, success: true };
        } catch {
          return { error: "Invalid JSON", success: false };
        }
      } else if (operation === "stringify") {
        return { json: JSON.stringify(inputData, null, 2), success: true };
      } else if (operation === "get") {
        const field = config.field as string;
        const parts = field?.split(".");
        let val: unknown = inputData;
        for (const part of parts ?? []) {
          val = (val as Record<string, unknown>)?.[part];
        }
        return { value: val, field };
      } else if (operation === "pick") {
        const fields = (config.fields as string || "").split(",").map((f: string) => f.trim()).filter(Boolean);
        const picked: Record<string, unknown> = {};
        for (const f of fields) picked[f] = inputData[f];
        return picked;
      }
      return inputData;
    }

    case "math": {
      const expression = config.expression as string || "0";
      const resolved = expression.replace(/input\.(\w+)/g, (_: string, field: string) => {
        const val = inputData[field];
        return typeof val === "number" ? String(val) : "0";
      });
      if (!/^[0-9+\-*/.%()\s]+$/.test(resolved)) {
        return { error: "Invalid math expression", expression };
      }
      // Only digits and operators passed the regex above — safe to evaluate
      const computeResult = new Function(`return (${resolved})`)() as number;
      return { result: computeResult, expression };
    }

    case "dateTime": {
      const operation = config.operation as string || "now";
      const now = new Date();
      if (operation === "now") {
        return { iso: now.toISOString(), timestamp: now.getTime(), formatted: now.toLocaleString() };
      } else if (operation === "format") {
        const date = new Date(config.date as string || now.toISOString());
        return { iso: date.toISOString(), timestamp: date.getTime(), formatted: date.toLocaleString() };
      } else if (operation === "add") {
        const date = new Date(config.date as string || now.toISOString());
        const amount = Number(config.amount) || 1;
        const unit = config.unit as string || "days";
        const multipliers: Record<string, number> = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 };
        const ms = (multipliers[unit] ?? 86400000) * amount;
        const result = new Date(date.getTime() + ms);
        return { iso: result.toISOString(), original: date.toISOString() };
      }
      return { operation, note: "Unsupported operation" };
    }

    case "textProcess": {
      const operation = config.operation as string || "trim";
      const text = config.input as string || (typeof inputData.text === "string" ? inputData.text : JSON.stringify(inputData));
      if (operation === "uppercase") return { result: text.toUpperCase() };
      if (operation === "lowercase") return { result: text.toLowerCase() };
      if (operation === "trim") return { result: text.trim() };
      if (operation === "split") {
        const delimiter = config.delimiter as string || ",";
        return { result: text.split(delimiter).map((s: string) => s.trim()), count: text.split(delimiter).length };
      }
      if (operation === "replace") {
        const find = config.find as string || "";
        const replaceWith = config.replaceValue as string || "";
        return { result: text.replaceAll(find, replaceWith) };
      }
      if (operation === "length") return { length: text.length, words: text.trim().split(/\s+/).length };
      return { result: text };
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
// validateWorkflow — pre-flight check without creating an execution record
// ---------------------------------------------------------------------------

export const validateWorkflow = action({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args): Promise<{ valid: boolean; errors: string[] }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    const workflow = await ctx.runQuery(internal.workflowsInternal.getInternal, {
      workflowId: args.workflowId,
    });
    if (!workflow) {
      throw new ConvexError({ message: "Workflow not found", code: "NOT_FOUND" });
    }

    const nodes = await ctx.runQuery(internal.nodesInternal.listInternal, {
      workflowId: args.workflowId,
    });

    const configErrors = validateAllNodes(nodes as NodeShape[]);

    const connections = await ctx.runQuery(internal.connectionsInternal.listInternal, {
      workflowId: args.workflowId,
    });

    const inDegree = new Map<string, number>();
    for (const node of nodes as NodeShape[]) inDegree.set(node._id, 0);
    for (const conn of connections as ConnectionShape[]) {
      inDegree.set(conn.targetNodeId, (inDegree.get(conn.targetNodeId) ?? 0) + 1);
    }
    const hasRootNode = [...inDegree.values()].some((d) => d === 0);
    if (!hasRootNode) {
      configErrors.push("Workflow must have at least one trigger node (a node with no incoming connections).");
    }

    return { valid: configErrors.length === 0, errors: configErrors };
  },
});

// ---------------------------------------------------------------------------
// executeWorkflow — main execution action
// ---------------------------------------------------------------------------

export const executeWorkflow = action({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args): Promise<Id<"executions">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

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

    // ── Pre-execution validation ──────────────────────────────────────────
    const configErrors = validateAllNodes(nodes);
    if (configErrors.length > 0) {
      throw new ConvexError({
        message: `Workflow validation failed:\n${configErrors.join("\n")}`,
        code: "BAD_REQUEST",
      });
    }

    // ── Create execution record ───────────────────────────────────────────
    const executionId = await ctx.runMutation(internal.executionsInternal.create, {
      workflowId: args.workflowId,
    });

    // ── Build execution graph ─────────────────────────────────────────────
    const nodeMap = new Map<string, NodeShape>(nodes.map((n) => [n._id, n]));

    // adjacencyList: sourceNodeId → array of { targetNodeId, sourcePort }
    const adjacencyList = new Map<string, Array<{ targetNodeId: string; sourcePort?: string }>>();
    const inDegree = new Map<string, number>();

    for (const node of nodes) {
      adjacencyList.set(node._id, []);
      inDegree.set(node._id, 0);
    }

    for (const conn of connections) {
      adjacencyList.get(conn.sourceNodeId)?.push({
        targetNodeId: conn.targetNodeId,
        sourcePort: conn.sourcePort,
      });
      inDegree.set(conn.targetNodeId, (inDegree.get(conn.targetNodeId) ?? 0) + 1);
    }

    // Find starting nodes (no incoming connections)
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

    // ── Topological execution ─────────────────────────────────────────────
    const executionData: Record<string, unknown> = {};
    // Track nodes skipped due to a branch not being taken
    const skippedNodes = new Set<string>();

    try {
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        const node = nodeMap.get(nodeId);
        if (!node) continue;

        // If this node was skipped due to branching, propagate skip and move on
        if (skippedNodes.has(nodeId)) {
          const downstream = adjacencyList.get(nodeId) ?? [];
          for (const { targetNodeId } of downstream) {
            skippedNodes.add(targetNodeId);
            const nextDeg = (inDegree.get(targetNodeId) ?? 0) - 1;
            inDegree.set(targetNodeId, nextDeg);
            if (nextDeg === 0) queue.push(targetNodeId);
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

          // Build expression context with current execution state
          const exprContext: ExpressionContext = {
            nodes: nodes.map((n) => ({
              id: n._id,
              label: n.label,
              nodeType: n.nodeType,
              output: executionData[n._id] as Record<string, unknown> | undefined,
            })),
            workflowId: args.workflowId,
            executionId,
            now: new Date().toISOString(),
          };

          const result = await executeNode(node, inputData, exprContext);
          executionData[nodeId] = result;

          await ctx.runMutation(internal.executionLogsInternal.updateLatest, {
            executionId,
            nodeId: nodeId as Id<"nodes">,
            status: "success",
            output: result as Record<string, unknown>,
          });

          // ── Enqueue downstream nodes, respecting branches ─────────────────
          const isBranchingNode = BRANCHING_NODE_TYPES.has(node.nodeType);
          const takenBranch = isBranchingNode
            ? String((result as Record<string, unknown>).branch ?? "")
            : null;

          const downstream = adjacencyList.get(nodeId) ?? [];
          for (const { targetNodeId, sourcePort } of downstream) {
            const isActivePath =
              !isBranchingNode ||
              sourcePort === undefined ||
              sourcePort === takenBranch;

            if (!isActivePath) {
              // Mark the non-taken branch's target as skipped
              skippedNodes.add(targetNodeId);
            }

            const nextDeg = (inDegree.get(targetNodeId) ?? 0) - 1;
            inDegree.set(targetNodeId, nextDeg);
            if (nextDeg === 0) queue.push(targetNodeId);
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
