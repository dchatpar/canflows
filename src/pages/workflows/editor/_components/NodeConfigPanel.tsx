import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { X, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { useState, useEffect } from "react";
import type { Node } from "@xyflow/react";
import type { WorkflowNodeData } from "./WorkflowNode.tsx";
import ExpressionInput from "@/components/ExpressionInput.tsx";

type UpstreamNode = {
  label?: string;
  nodeType: string;
  output?: Record<string, unknown>;
};

type ConfigField = {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
};

type NodeConfigPanelProps = {
  node: Node<WorkflowNodeData> | null;
  onClose: () => void;
  onUpdate: (nodeId: string, label: string, configuration: Record<string, unknown>) => void;
  upstreamNodes?: UpstreamNode[];
};

export default function NodeConfigPanel({
  node,
  onClose,
  onUpdate,
  upstreamNodes = [],
}: NodeConfigPanelProps) {
  const [label, setLabel] = useState("");
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || node.data.nodeType);
      setConfig((node.data.configuration || {}) as Record<string, string>);
    }
  }, [node]);

  if (!node) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">
            Select a node to configure
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSave = () => {
    onUpdate(node.id, label, config);
  };

  const getConfigFields = (): ConfigField[] => {
    switch (node.data.nodeType) {
      // ── Existing nodes ──────────────────────────────────────────────────────
      case "webhook":
        return [
          { key: "path", label: "Webhook Path", placeholder: "/webhook" },
          { key: "method", label: "HTTP Method", placeholder: "POST" },
        ];
      case "http":
        return [
          { key: "url", label: "URL", placeholder: "https://api.example.com" },
          { key: "method", label: "Method", placeholder: "GET" },
          { key: "headers", label: "Headers (JSON)", placeholder: '{"Authorization": "Bearer ..."}', multiline: true },
          { key: "body", label: "Body (JSON)", placeholder: '{"key": "value"}', multiline: true },
        ];
      case "email":
        return [
          { key: "to", label: "To", placeholder: "user@example.com" },
          { key: "subject", label: "Subject", placeholder: "Email subject" },
          { key: "body", label: "Body", placeholder: "Email content", multiline: true },
        ];
      case "database":
        return [
          { key: "query", label: "Query", placeholder: "SELECT * FROM...", multiline: true },
        ];
      case "filter":
        return [
          { key: "condition", label: "Condition", placeholder: "data.value > 10" },
        ];
      case "code":
        return [
          { key: "code", label: "Code", placeholder: "// Write your code here\nreturn data;", multiline: true },
        ];
      case "transform":
        return [
          { key: "expression", label: "Expression", placeholder: "data.map(x => x.value)", multiline: true },
        ];
      case "set":
        return [
          { key: "variable", label: "Variable Name", placeholder: "myVariable" },
          { key: "value", label: "Value", placeholder: "data.result" },
        ];
      case "schedule":
        return [
          { key: "cron", label: "Cron Expression", placeholder: "0 0 * * *" },
        ];
      case "ifelse":
        return [
          { key: "condition", label: "Condition", placeholder: "{{ $item.value }} > 10" },
          { key: "trueLabel", label: "True Label", placeholder: "Yes" },
          { key: "falseLabel", label: "False Label", placeholder: "No" },
        ];
      case "switch":
        return [
          { key: "field", label: "Field to Switch On", placeholder: "data.status" },
          { key: "cases", label: "Cases (JSON)", placeholder: '[{"value":"active","label":"Active"}]', multiline: true },
        ];
      case "delay":
        return [
          { key: "delaySeconds", label: "Delay (seconds)", placeholder: "5" },
        ];
      case "merge":
        return [];

      // ── Communication integrations ──────────────────────────────────────────
      case "slack":
        return [
          { key: "webhookUrl", label: "Webhook URL", placeholder: "https://hooks.slack.com/services/..." },
          { key: "text", label: "Message Text", placeholder: "Workflow notification", multiline: true },
          { key: "username", label: "Bot Name (optional)", placeholder: "Workflow Bot" },
          { key: "channel", label: "Channel (optional)", placeholder: "#general" },
        ];
      case "discord":
        return [
          { key: "webhookUrl", label: "Webhook URL", placeholder: "https://discord.com/api/webhooks/..." },
          { key: "content", label: "Message Content", placeholder: "Workflow notification", multiline: true },
          { key: "username", label: "Bot Name (optional)", placeholder: "Workflow Bot" },
        ];
      case "telegram":
        return [
          { key: "botToken", label: "Bot Token", placeholder: "123456:ABC-DEF..." },
          { key: "chatId", label: "Chat ID", placeholder: "-1001234567890" },
          { key: "text", label: "Message Text", placeholder: "Workflow notification", multiline: true },
        ];

      // ── Data integrations ───────────────────────────────────────────────────
      case "googleSheets":
        return [
          { key: "apiKey", label: "API Key", placeholder: "AIza..." },
          { key: "spreadsheetId", label: "Spreadsheet ID", placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" },
          { key: "range", label: "Range", placeholder: "Sheet1!A1:Z1000" },
          { key: "operation", label: "Operation (read / append)", placeholder: "read" },
          { key: "values", label: "Values (JSON array, for append)", placeholder: '[["Name","Email"],["Alice","a@example.com"]]', multiline: true },
        ];
      case "airtable":
        return [
          { key: "apiKey", label: "API Key", placeholder: "patXXXXXX..." },
          { key: "baseId", label: "Base ID", placeholder: "appXXXXXXXXXXXXXX" },
          { key: "tableId", label: "Table Name or ID", placeholder: "tblXXXXXXXXXXXXXX" },
          { key: "operation", label: "Operation (list / create / update / delete)", placeholder: "list" },
          { key: "recordId", label: "Record ID (for update/delete)", placeholder: "recXXXXXXXXXXXXXX" },
          { key: "fields", label: "Fields (JSON, for create/update)", placeholder: '{"Name":"Alice","Status":"Active"}', multiline: true },
        ];
      case "notion":
        return [
          { key: "apiKey", label: "Integration Token", placeholder: "secret_XXXXXXXXX" },
          { key: "operation", label: "Operation (getPage / createPage / appendBlock)", placeholder: "getPage" },
          { key: "pageId", label: "Page / Block ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
          { key: "databaseId", label: "Database ID (for createPage)", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
          { key: "properties", label: "Properties (JSON, for createPage)", placeholder: '{"Name":{"title":[{"text":{"content":"My page"}}]}}', multiline: true },
          { key: "content", label: "Content (for appendBlock)", placeholder: "New paragraph text" },
        ];

      // ── AI integrations ─────────────────────────────────────────────────────
      case "openai":
        return [
          { key: "apiKey", label: "AI API Key", placeholder: "sk-..." },
          { key: "operation", label: "Operation (chat / embedding)", placeholder: "chat" },
          { key: "model", label: "Model", placeholder: "Enter model name" },
          { key: "systemPrompt", label: "System Prompt (optional)", placeholder: "You are a helpful assistant.", multiline: true },
          { key: "userMessage", label: "User Message", placeholder: "Summarize the input data.", multiline: true },
        ];
      case "anthropic":
        return [
          { key: "apiKey", label: "AI API Key", placeholder: "sk-..." },
          { key: "model", label: "Model", placeholder: "Enter model name" },
          { key: "systemPrompt", label: "System Prompt (optional)", placeholder: "You are a helpful assistant.", multiline: true },
          { key: "userMessage", label: "User Message", placeholder: "Summarize the input data.", multiline: true },
        ];

      // ── Developer integrations ──────────────────────────────────────────────
      case "github":
        return [
          { key: "token", label: "Personal Access Token", placeholder: "ghp_XXXXXXXXXX" },
          { key: "owner", label: "Owner (user or org)", placeholder: "octocat" },
          { key: "repo", label: "Repository", placeholder: "hello-world" },
          { key: "operation", label: "Operation (listIssues / createIssue / getRepo)", placeholder: "listIssues" },
          { key: "title", label: "Issue Title (for createIssue)", placeholder: "Bug: something is broken" },
          { key: "body", label: "Issue Body (for createIssue)", placeholder: "Steps to reproduce...", multiline: true },
        ];
      case "jira":
        return [
          { key: "domain", label: "Domain", placeholder: "mycompany.atlassian.net" },
          { key: "email", label: "Email", placeholder: "user@example.com" },
          { key: "apiToken", label: "API Token", placeholder: "ATATT3xFfGF0..." },
          { key: "operation", label: "Operation (getIssue / createIssue / updateStatus)", placeholder: "getIssue" },
          { key: "issueKey", label: "Issue Key (for getIssue / updateStatus)", placeholder: "PROJ-123" },
          { key: "projectKey", label: "Project Key (for createIssue)", placeholder: "PROJ" },
          { key: "summary", label: "Summary (for createIssue)", placeholder: "New task from workflow" },
          { key: "issueType", label: "Issue Type (for createIssue)", placeholder: "Task" },
        ];

      // ── Utility integrations ────────────────────────────────────────────────
      case "rss":
        return [
          { key: "url", label: "RSS Feed URL", placeholder: "https://feeds.example.com/rss.xml" },
        ];
      case "jsonTransform":
        return [
          { key: "operation", label: "Operation (parse / stringify / get / pick)", placeholder: "get" },
          { key: "field", label: "Field Path (for get)", placeholder: "data.items.0.title" },
          { key: "fields", label: "Fields (comma-separated, for pick)", placeholder: "id, name, email" },
          { key: "input", label: "JSON Input (for parse)", placeholder: '{"key":"value"}', multiline: true },
        ];
      case "math":
        return [
          { key: "expression", label: "Math Expression", placeholder: "input.price * input.quantity" },
        ];
      case "dateTime":
        return [
          { key: "operation", label: "Operation (now / format / add)", placeholder: "now" },
          { key: "date", label: "Date (ISO string, for format/add)", placeholder: "2024-01-15T10:30:00Z" },
          { key: "amount", label: "Amount (for add)", placeholder: "7" },
          { key: "unit", label: "Unit (seconds / minutes / hours / days, for add)", placeholder: "days" },
        ];
      case "textProcess":
        return [
          { key: "operation", label: "Operation (uppercase / lowercase / trim / split / replace / length)", placeholder: "trim" },
          { key: "input", label: "Input Text", placeholder: "Hello, World!", multiline: true },
          { key: "delimiter", label: "Delimiter (for split)", placeholder: "," },
          { key: "find", label: "Find (for replace)", placeholder: "old text" },
          { key: "replaceValue", label: "Replace With (for replace)", placeholder: "new text" },
        ];

      default:
        return [];
    }
  };

  const configFields = getConfigFields();
  const isInfoOnly = node.data.nodeType === "merge";

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Node Configuration</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close panel (Esc)</TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-4 pr-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <ExpressionInput
                id="label"
                value={label}
                onChange={setLabel}
                placeholder="Node label"
                upstreamNodes={upstreamNodes}
              />
            </div>

            {configFields.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  Configuration
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="size-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px] text-xs">
                      {'Use {{ $node["Name"].json.field }} expressions to reference upstream node data.'}
                    </TooltipContent>
                  </Tooltip>
                </h4>
                <div className="space-y-3">
                  {configFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key}>{field.label}</Label>
                      <ExpressionInput
                        id={field.key}
                        value={config[field.key] ?? ""}
                        onChange={(val) => setConfig({ ...config, [field.key]: val })}
                        placeholder={field.placeholder}
                        multiline={field.multiline}
                        rows={4}
                        upstreamNodes={upstreamNodes}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isInfoOnly && (
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Merge combines all upstream node outputs into a single object. No configuration needed.
                </p>
              </div>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleSave} className="w-full">
                  Save Changes
                </Button>
              </TooltipTrigger>
              <TooltipContent>Apply configuration changes to this node</TooltipContent>
            </Tooltip>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
