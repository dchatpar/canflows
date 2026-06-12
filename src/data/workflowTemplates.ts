// Pre-built workflow templates that users can import
// Node format matches the importWorkflow mutation expectations

export type WorkflowTemplateNode = {
  tempId: string;
  type: string;
  nodeType: string;
  label: string;
  position: { x: number; y: number };
  configuration: Record<string, unknown>;
};

export type WorkflowTemplateConnection = {
  sourceTempId: string;
  targetTempId: string;
  sourcePort?: string;
};

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  category: "automation" | "ai" | "data" | "notification";
  nodes: WorkflowTemplateNode[];
  connections: WorkflowTemplateConnection[];
};

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "github-slack-alerts",
    name: "GitHub Issues → Slack Alerts",
    description: "Poll GitHub for new issues every 30 minutes and post them to Slack.",
    category: "notification",
    nodes: [
      {
        tempId: "n1",
        type: "trigger",
        nodeType: "schedule",
        label: "Every 30 minutes",
        position: { x: 100, y: 300 },
        configuration: { cron: "*/30 * * * *" },
      },
      {
        tempId: "n2",
        type: "integration",
        nodeType: "github",
        label: "Fetch Issues",
        position: { x: 320, y: 300 },
        configuration: { token: "YOUR_GITHUB_TOKEN", owner: "your-org", repo: "your-repo", operation: "listIssues" },
      },
      {
        tempId: "n3",
        type: "logic",
        nodeType: "ifelse",
        label: "Has Open Issues?",
        position: { x: 540, y: 300 },
        configuration: { condition: "data.length > 0" },
      },
      {
        tempId: "n4",
        type: "integration",
        nodeType: "slack",
        label: "Post to Slack",
        position: { x: 760, y: 260 },
        configuration: { webhookUrl: "https://hooks.slack.com/services/YOUR_WEBHOOK", text: "New GitHub issues found!" },
      },
    ],
    connections: [
      { sourceTempId: "n1", targetTempId: "n2" },
      { sourceTempId: "n2", targetTempId: "n3" },
      { sourceTempId: "n3", targetTempId: "n4", sourcePort: "true" },
    ],
  },
  {
    id: "webhook-openai-summarize",
    name: "Webhook → AI Summarize → Distribute",
    description: "Receive content via webhook, summarize with AI, post to Slack and save to Airtable.",
    category: "ai",
    nodes: [
      {
        tempId: "n1",
        type: "trigger",
        nodeType: "webhook",
        label: "Receive Content",
        position: { x: 100, y: 300 },
        configuration: { path: "/summarize", method: "POST" },
      },
      {
        tempId: "n2",
        type: "integration",
        nodeType: "openai",
        label: "Summarize with AI",
        position: { x: 320, y: 300 },
        configuration: {
          apiKey: "YOUR_AI_API_KEY",
          operation: "chat",
          model: "Enter model name",
          systemPrompt: "Summarize the following content in 2-3 sentences.",
          userMessage: "{{ data.text }}",
        },
      },
      {
        tempId: "n3",
        type: "integration",
        nodeType: "slack",
        label: "Post Summary to Slack",
        position: { x: 540, y: 200 },
        configuration: { webhookUrl: "https://hooks.slack.com/services/YOUR_WEBHOOK", text: "Summary ready!" },
      },
      {
        tempId: "n4",
        type: "integration",
        nodeType: "airtable",
        label: "Save to Airtable",
        position: { x: 540, y: 400 },
        configuration: { apiKey: "YOUR_AIRTABLE_KEY", baseId: "YOUR_BASE_ID", tableId: "Summaries", operation: "create" },
      },
    ],
    connections: [
      { sourceTempId: "n1", targetTempId: "n2" },
      { sourceTempId: "n2", targetTempId: "n3" },
      { sourceTempId: "n2", targetTempId: "n4" },
    ],
  },
  {
    id: "airtable-sheets-sync",
    name: "Airtable → Google Sheets Sync",
    description: "Sync active Airtable records to Google Sheets every hour.",
    category: "data",
    nodes: [
      {
        tempId: "n1",
        type: "trigger",
        nodeType: "schedule",
        label: "Every Hour",
        position: { x: 100, y: 300 },
        configuration: { cron: "0 * * * *" },
      },
      {
        tempId: "n2",
        type: "integration",
        nodeType: "airtable",
        label: "List Active Records",
        position: { x: 320, y: 300 },
        configuration: { apiKey: "YOUR_AIRTABLE_KEY", baseId: "YOUR_BASE_ID", tableId: "Contacts", operation: "list" },
      },
      {
        tempId: "n3",
        type: "logic",
        nodeType: "filter",
        label: "Active Only",
        position: { x: 540, y: 300 },
        configuration: { condition: "data.status == 'active'" },
      },
      {
        tempId: "n4",
        type: "integration",
        nodeType: "googleSheets",
        label: "Append to Sheet",
        position: { x: 760, y: 300 },
        configuration: {
          apiKey: "YOUR_GOOGLE_API_KEY",
          spreadsheetId: "YOUR_SPREADSHEET_ID",
          range: "Sheet1!A:Z",
          operation: "append",
        },
      },
    ],
    connections: [
      { sourceTempId: "n1", targetTempId: "n2" },
      { sourceTempId: "n2", targetTempId: "n3" },
      { sourceTempId: "n3", targetTempId: "n4" },
    ],
  },
  {
    id: "uptime-monitor",
    name: "Uptime Monitor & Alert",
    description: "Check your service health every 5 minutes and alert via Telegram if it's down.",
    category: "automation",
    nodes: [
      {
        tempId: "n1",
        type: "trigger",
        nodeType: "schedule",
        label: "Every 5 Minutes",
        position: { x: 100, y: 300 },
        configuration: { cron: "*/5 * * * *" },
      },
      {
        tempId: "n2",
        type: "action",
        nodeType: "http",
        label: "Health Check",
        position: { x: 320, y: 300 },
        configuration: { url: "https://yourapp.com/health", method: "GET" },
      },
      {
        tempId: "n3",
        type: "logic",
        nodeType: "ifelse",
        label: "Is Down?",
        position: { x: 540, y: 300 },
        configuration: { condition: "data.status != 200" },
      },
      {
        tempId: "n4",
        type: "integration",
        nodeType: "telegram",
        label: "Alert via Telegram",
        position: { x: 760, y: 260 },
        configuration: { botToken: "YOUR_BOT_TOKEN", chatId: "YOUR_CHAT_ID", text: "Service is down!" },
      },
    ],
    connections: [
      { sourceTempId: "n1", targetTempId: "n2" },
      { sourceTempId: "n2", targetTempId: "n3" },
      { sourceTempId: "n3", targetTempId: "n4", sourcePort: "true" },
    ],
  },
  {
    id: "pr-jira-discord",
    name: "GitHub PR → Jira Ticket → Discord",
    description: "When a PR is opened, create a Jira task and notify the team in Discord.",
    category: "automation",
    nodes: [
      {
        tempId: "n1",
        type: "trigger",
        nodeType: "webhook",
        label: "GitHub PR Webhook",
        position: { x: 100, y: 300 },
        configuration: { path: "/github-pr", method: "POST" },
      },
      {
        tempId: "n2",
        type: "action",
        nodeType: "jsonTransform",
        label: "Extract PR Info",
        position: { x: 320, y: 300 },
        configuration: { operation: "pick", fields: ["title", "html_url"] },
      },
      {
        tempId: "n3",
        type: "integration",
        nodeType: "jira",
        label: "Create Jira Task",
        position: { x: 540, y: 300 },
        configuration: {
          domain: "your-org.atlassian.net",
          email: "you@example.com",
          apiToken: "YOUR_JIRA_TOKEN",
          operation: "createIssue",
          projectKey: "ENG",
          issueType: "Task",
          summary: "Review PR",
        },
      },
      {
        tempId: "n4",
        type: "integration",
        nodeType: "discord",
        label: "Notify Team",
        position: { x: 760, y: 300 },
        configuration: { webhookUrl: "https://discord.com/api/webhooks/YOUR_WEBHOOK", content: "New PR opened!" },
      },
    ],
    connections: [
      { sourceTempId: "n1", targetTempId: "n2" },
      { sourceTempId: "n2", targetTempId: "n3" },
      { sourceTempId: "n3", targetTempId: "n4" },
    ],
  },
  {
    id: "classify-route-messages",
    name: "Classify & Route Messages",
    description: "Use AI to classify incoming messages and route each type to the right Slack channel.",
    category: "ai",
    nodes: [
      {
        tempId: "n1",
        type: "trigger",
        nodeType: "webhook",
        label: "Incoming Message",
        position: { x: 100, y: 300 },
        configuration: { path: "/classify", method: "POST" },
      },
      {
        tempId: "n2",
        type: "integration",
        nodeType: "openai",
        label: "Classify Message",
        position: { x: 320, y: 300 },
        configuration: {
          apiKey: "YOUR_AI_API_KEY",
          operation: "chat",
          model: "Enter model name",
          systemPrompt: "Classify the message as exactly one of: support, sales, other. Respond with just the word.",
          userMessage: "{{ data.message }}",
        },
      },
      {
        tempId: "n3",
        type: "logic",
        nodeType: "switch",
        label: "Route by Category",
        position: { x: 540, y: 300 },
        configuration: { field: "data.text", cases: [{ value: "support", label: "Support" }, { value: "sales", label: "Sales" }] },
      },
      {
        tempId: "n4",
        type: "integration",
        nodeType: "slack",
        label: "Support Channel",
        position: { x: 760, y: 200 },
        configuration: { webhookUrl: "https://hooks.slack.com/services/SUPPORT", text: "New support request!" },
      },
      {
        tempId: "n5",
        type: "integration",
        nodeType: "slack",
        label: "Sales Channel",
        position: { x: 760, y: 400 },
        configuration: { webhookUrl: "https://hooks.slack.com/services/SALES", text: "New sales inquiry!" },
      },
    ],
    connections: [
      { sourceTempId: "n1", targetTempId: "n2" },
      { sourceTempId: "n2", targetTempId: "n3" },
      { sourceTempId: "n3", targetTempId: "n4", sourcePort: "support" },
      { sourceTempId: "n3", targetTempId: "n5", sourcePort: "sales" },
    ],
  },
];
