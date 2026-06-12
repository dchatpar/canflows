"use node";

import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

// ---------------------------------------------------------------------------
// Node type catalog — used in the AI system prompt
// ---------------------------------------------------------------------------

const NODE_CATALOG = `
AVAILABLE NODE TYPES (use these exact values for "nodeType"):

TRIGGERS (start nodes — no incoming connections):
- webhook: Receive HTTP requests. config: { path, method }
- schedule: Run on a cron schedule. config: { cron (e.g. "0 9 * * 1-5") }

FLOW CONTROL:
- ifelse: Branch on a condition. config: { condition (e.g. "data.status == 200") }. Outputs: branch="true" or branch="false"
- switch: Multi-way branch on a field value. config: { field, cases (JSON array of {value,label}) }
- merge: Combine multiple upstream paths. No config needed.
- delay: Wait before continuing. config: { delaySeconds }
- filter: Stop execution if condition fails. config: { condition }
- noOp: Pass-through, no operation. No config needed.

DATA & TRANSFORM:
- http: Make HTTP requests. config: { url, method (GET/POST/PUT/DELETE), headers (JSON), body (JSON) }
- transform: Transform data with an expression. config: { expression }
- set: Set a variable. config: { variable, value }
- code: Run safe JavaScript. config: { code }
- jsonTransform: JSON operations. config: { operation (parse/stringify/get/pick), field, fields }
- math: Math expression. config: { expression (e.g. "input.price * 1.2") }
- dateTime: Date/time ops. config: { operation (now/format/add), date, amount, unit }
- textProcess: Text operations. config: { operation (uppercase/lowercase/trim/split/replace/length), input }

INTEGRATIONS:
- slack: Send Slack message. config: { webhookUrl, text, username, channel }
- discord: Send Discord message. config: { webhookUrl, content, username }
- telegram: Send Telegram message. config: { botToken, chatId, text }
- email: Send email. config: { to, subject, body }
- googleSheets: Read/write Google Sheets. config: { apiKey, spreadsheetId, range, operation (read/append), values }
- airtable: Airtable CRUD. config: { apiKey, baseId, tableId, operation (list/create/update/delete), fields, recordId }
- notion: Notion operations. config: { apiKey, operation (getPage/createPage/appendBlock), pageId, databaseId, properties, content }
- openai: Call OpenAI API. config: { apiKey, operation (chat/embedding), model, systemPrompt, userMessage }
- anthropic: Call Anthropic API. config: { apiKey, model, systemPrompt, userMessage }
- github: GitHub operations. config: { token, owner, repo, operation (listIssues/createIssue/getRepo), title, body }
- jira: Jira operations. config: { domain, email, apiToken, operation (createIssue/getIssue), projectKey, summary, issueType, issueKey }
- rss: Fetch RSS feed. config: { url }
- database: Database query placeholder. config: { query }
`;

// ---------------------------------------------------------------------------
// Parsed workflow structure from AI
// ---------------------------------------------------------------------------

type AINodeSpec = {
  id: string; // temporary local id like "node_1"
  nodeType: string;
  label: string;
  type: string; // "trigger" | "action" | "logic" | "integration"
  configuration: Record<string, unknown>;
  position: { x: number; y: number };
};

type AIEdgeSpec = {
  source: string;
  target: string;
  sourcePort?: string;
};

type AIWorkflowSpec = {
  name: string;
  description: string;
  nodes: AINodeSpec[];
  edges: AIEdgeSpec[];
};

// ---------------------------------------------------------------------------
// generateWorkflow — main AI action
// ---------------------------------------------------------------------------

export const generateWorkflow = action({
  args: {
    workflowId: v.id("workflows"),
    prompt: v.string(),
    replaceExisting: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; nodeCount: number; edgeCount: number; name: string; description: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    const apiKey = process.env.HERCULES_API_KEY;
    if (!apiKey) {
      throw new ConvexError({ message: "AI Gateway not configured. Please check your Hercules API key.", code: "BAD_REQUEST" });
    }

    const systemPrompt = `You are an expert workflow automation builder. Given a user's description, generate a complete, production-ready workflow as JSON.

${NODE_CATALOG}

RULES:
1. Always start with a trigger node (webhook or schedule) unless the user says otherwise
2. Place nodes in a clear left-to-right flow
3. Use realistic positions: triggers start at x:100, y:300. Space nodes 220px apart horizontally, keep y around 300 unless branching
4. For each node's "type" field, use: "trigger" for triggers, "logic" for flow control, "integration" for external services, "action" for everything else
5. Configuration values should be helpful placeholders (e.g. "YOUR_API_KEY", "https://your-webhook-url.com")
6. Keep it practical — don't add unnecessary nodes
7. Edge sourcePort: for ifelse nodes use "true" or "false" to target the correct branch

Respond ONLY with a valid JSON object — no markdown, no explanation, no code fences. Format:
{
  "name": "string",
  "description": "string",
  "nodes": [
    { "id": "node_1", "nodeType": "webhook", "label": "Webhook Trigger", "type": "trigger", "configuration": {}, "position": { "x": 100, "y": 300 } }
  ],
  "edges": [
    { "source": "node_1", "target": "node_2" }
  ]
}`;

    const response = await fetch("https://ai-gateway.hercules.app/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.prompt },
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new ConvexError({ message: `AI request failed: ${err}`, code: "EXTERNAL_SERVICE_ERROR" });
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const raw = data.choices[0]?.message?.content ?? "";

    // Parse JSON — strip markdown code fences if present
    let spec: AIWorkflowSpec;
    try {
      const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
      spec = JSON.parse(jsonStr) as AIWorkflowSpec;
    } catch {
      throw new ConvexError({ message: "AI returned invalid JSON. Please try again with a clearer description.", code: "BAD_REQUEST" });
    }

    if (!Array.isArray(spec.nodes) || spec.nodes.length === 0) {
      throw new ConvexError({ message: "AI generated an empty workflow. Please try again.", code: "BAD_REQUEST" });
    }

    // Clear existing workflow if requested
    if (args.replaceExisting) {
      await ctx.runMutation(internal.aiWorkflowBuilderInternal.clearWorkflowNodes, {
        workflowId: args.workflowId,
      });
    }

    // Create all nodes
    const nodeSpecs = spec.nodes.map((n) => ({
      type: n.type || "action",
      nodeType: n.nodeType,
      position: n.position || { x: 100, y: 300 },
      configuration: (n.configuration ?? {}) as Record<string, never>,
      label: n.label || n.nodeType,
    }));

    const realNodeIds = await ctx.runMutation(internal.aiWorkflowBuilderInternal.bulkCreateNodes, {
      workflowId: args.workflowId,
      nodes: nodeSpecs,
    });

    // Map local temp ids → real Convex ids
    const idMap = new Map<string, Id<"nodes">>();
    spec.nodes.forEach((n, i) => {
      idMap.set(n.id, realNodeIds[i]);
    });

    // Create connections
    const connections: Array<{ sourceNodeId: Id<"nodes">; targetNodeId: Id<"nodes">; sourcePort?: string }> = [];
    for (const edge of (spec.edges ?? [])) {
      const sourceId = idMap.get(edge.source);
      const targetId = idMap.get(edge.target);
      if (sourceId && targetId) {
        connections.push({ sourceNodeId: sourceId, targetNodeId: targetId, sourcePort: edge.sourcePort });
      }
    }

    if (connections.length > 0) {
      await ctx.runMutation(internal.aiWorkflowBuilderInternal.bulkCreateConnections, {
        workflowId: args.workflowId,
        connections,
      });
    }

    return {
      success: true,
      nodeCount: spec.nodes.length,
      edgeCount: connections.length,
      name: spec.name || "AI Generated Workflow",
      description: spec.description || "",
    };
  },
});
