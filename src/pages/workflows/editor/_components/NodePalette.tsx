import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Webhook, Globe, Code, Filter, Settings, Database, Mail, Calendar, FileText, Search,
  GitMerge, Layers, GitFork, Timer,
  MessageSquare, MessageCircle, Send, Table2, Grid3X3, BookOpen,
  Sparkles, Brain, Github, SquareKanban, Rss, Braces, Calculator, CalendarClock, Type,
} from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

type NodeType = {
  type: string;
  nodeType: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  description: string;
};

const nodeTypes: NodeType[] = [
  // Triggers
  { type: "trigger", nodeType: "webhook", label: "Webhook", icon: Webhook, description: "Trigger on HTTP webhook" },
  { type: "trigger", nodeType: "schedule", label: "Schedule", icon: Calendar, description: "Trigger on schedule" },
  // Actions
  { type: "action", nodeType: "http", label: "HTTP Request", icon: Globe, description: "Make HTTP API call" },
  { type: "action", nodeType: "email", label: "Send Email", icon: Mail, description: "Send an email" },
  { type: "action", nodeType: "database", label: "Database", icon: Database, description: "Query or update database" },
  // Logic
  { type: "logic", nodeType: "filter", label: "Filter", icon: Filter, description: "Filter data conditionally" },
  { type: "logic", nodeType: "code", label: "Code", icon: Code, description: "Run custom code" },
  { type: "logic", nodeType: "transform", label: "Transform", icon: FileText, description: "Transform data" },
  { type: "logic", nodeType: "set", label: "Set Variable", icon: Settings, description: "Set a variable" },
  { type: "logic", nodeType: "ifelse", label: "If / Else", icon: GitMerge, description: "Branch based on condition" },
  { type: "logic", nodeType: "switch", label: "Switch", icon: Layers, description: "Multi-way branch" },
  { type: "logic", nodeType: "merge", label: "Merge", icon: GitFork, description: "Merge multiple inputs" },
  { type: "logic", nodeType: "delay", label: "Delay", icon: Timer, description: "Wait before continuing" },
  // Integrations — Communication
  { type: "integration", nodeType: "slack", label: "Slack", icon: MessageSquare, description: "Send Slack message" },
  { type: "integration", nodeType: "discord", label: "Discord", icon: MessageCircle, description: "Send Discord message" },
  { type: "integration", nodeType: "telegram", label: "Telegram", icon: Send, description: "Send Telegram message" },
  // Integrations — Data
  { type: "integration", nodeType: "googleSheets", label: "Google Sheets", icon: Table2, description: "Read/write spreadsheet" },
  { type: "integration", nodeType: "airtable", label: "Airtable", icon: Grid3X3, description: "Manage Airtable records" },
  { type: "integration", nodeType: "notion", label: "Notion", icon: BookOpen, description: "Create/get Notion pages" },
  // Integrations — AI
  { type: "integration", nodeType: "openai", label: "OpenAI", icon: Sparkles, description: "AI chat & embeddings" },
  { type: "integration", nodeType: "anthropic", label: "Anthropic", icon: Brain, description: "Claude AI completion" },
  // Integrations — Developer
  { type: "integration", nodeType: "github", label: "GitHub", icon: Github, description: "Manage issues & repos" },
  { type: "integration", nodeType: "jira", label: "Jira", icon: SquareKanban, description: "Manage Jira issues" },
  // Integrations — Utility
  { type: "integration", nodeType: "rss", label: "RSS Feed", icon: Rss, description: "Fetch RSS feed items" },
  { type: "integration", nodeType: "jsonTransform", label: "JSON", icon: Braces, description: "Parse, stringify, transform" },
  { type: "integration", nodeType: "math", label: "Math", icon: Calculator, description: "Math expressions" },
  { type: "integration", nodeType: "dateTime", label: "Date & Time", icon: CalendarClock, description: "Date operations" },
  { type: "integration", nodeType: "textProcess", label: "Text", icon: Type, description: "Text processing" },
];

const nodeTooltips: Record<string, string> = {
  webhook: "Listens for incoming HTTP requests. Use as a starting point for workflows triggered by external services.",
  schedule: "Fires the workflow at a set time or recurring interval using a cron expression (e.g. '0 9 * * 1' = every Monday 9am).",
  http: "Makes an outbound HTTP/REST API call to any URL. Supports GET, POST, PUT, DELETE, custom headers, and a JSON body.",
  email: "Sends an email message. Configure the recipient, subject, and body. Supports expressions in all fields.",
  database: "Executes a raw SQL or NoSQL query against a connected database. Returns results as JSON.",
  filter: "Passes data through only if a condition is truthy. Stops execution of downstream nodes when the condition is false.",
  code: "Runs arbitrary JavaScript. The input data is available as `data`. Whatever you `return` becomes the output.",
  transform: "Maps or reshapes the input data using a JavaScript expression (e.g. `data.map(x => x.id)`).",
  set: "Creates or overwrites a named variable in the workflow context. Reference it downstream with `{{ $vars.myVar }}`.",
  ifelse: "Splits the flow into two paths: True (left handle) and False (right handle) based on a condition expression.",
  switch: "Routes data to one of N output handles based on a field value. Define cases as a JSON array.",
  merge: "Collects outputs from multiple upstream nodes and combines them into a single object passed downstream.",
  delay: "Pauses execution for a specified number of seconds before continuing to the next node.",
  slack: "Posts a message to a Slack channel or user via an Incoming Webhook URL.",
  discord: "Posts a message to a Discord channel via a Webhook URL.",
  telegram: "Sends a message to a Telegram chat via the Bot API. Requires a Bot Token and Chat ID.",
  googleSheets: "Reads rows from or appends rows to a Google Sheets spreadsheet using the Sheets API.",
  airtable: "Lists, creates, updates, or deletes records in an Airtable base using the Airtable REST API.",
  notion: "Gets or creates pages and appends blocks to a Notion database via the Notion API.",
  openai: "Calls the OpenAI API to generate chat completions or embeddings. Configure model, system prompt, and user message.",
  anthropic: "Calls the Anthropic API to get a Claude AI completion. Configure model, system prompt, and user message.",
  github: "Interacts with GitHub: list/create issues, fetch repo info. Requires a Personal Access Token.",
  jira: "Gets or creates Jira issues and updates their status using the Jira REST API.",
  rss: "Fetches and parses an RSS/Atom feed. Returns all feed items as a JSON array.",
  jsonTransform: "Parses a JSON string, stringifies an object, picks specific fields, or extracts a value by dot-path.",
  math: "Evaluates a math expression using values from the input data (e.g. `input.price * input.qty`).",
  dateTime: "Gets the current time, formats a date string, or adds/subtracts time units from a date.",
  textProcess: "Transforms a string: uppercase, lowercase, trim whitespace, split into array, replace, or get length.",
};

const categories = ["trigger", "action", "logic", "integration"] as const;
type Category = typeof categories[number];

const categoryMeta: Record<Category, { label: string; color: string; dot: string }> = {
  trigger:     { label: "Triggers",     color: "#7c3aed", dot: "#7c3aed" },
  action:      { label: "Actions",      color: "#2563eb", dot: "#2563eb" },
  logic:       { label: "Logic",        color: "#d97706", dot: "#d97706" },
  integration: { label: "Integrations", color: "#059669", dot: "#059669" },
};

const categoryIconBg: Record<Category, string> = {
  trigger:     "rgba(124,58,237,0.10)",
  action:      "rgba(37,99,235,0.10)",
  logic:       "rgba(217,119,6,0.10)",
  integration: "rgba(5,150,105,0.10)",
};

type NodePaletteProps = {
  onNodeDragStart: (nodeType: string, type: string, label: string) => void;
};

export default function NodePalette({ onNodeDragStart }: NodePaletteProps) {
  const [search, setSearch] = useState("");

  const filtered = search.trim().length > 0
    ? nodeTypes.filter(
        (n) =>
          n.label.toLowerCase().includes(search.toLowerCase()) ||
          n.description.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-800 mb-3">Nodes</div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-gray-50 border-gray-200 focus-visible:ring-1"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-3 space-y-5">
          {filtered !== null ? (
            filtered.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-6">No nodes found</div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((node) => (
                  <PaletteItem key={node.nodeType} node={node} onNodeDragStart={onNodeDragStart} />
                ))}
              </div>
            )
          ) : (
            categories.map((category) => {
              const meta = categoryMeta[category];
              const nodes = nodeTypes.filter((n) => n.type === category);
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <div
                      style={{ background: meta.dot }}
                      className="w-2 h-2 rounded-full shrink-0"
                    />
                    <span
                      style={{ color: meta.color }}
                      className="text-[11px] font-bold uppercase tracking-widest"
                    >
                      {meta.label}
                    </span>
                    <span className="ml-auto text-[10px] text-gray-400 font-medium">
                      {nodes.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {nodes.map((node) => (
                      <PaletteItem key={node.nodeType} node={node} onNodeDragStart={onNodeDragStart} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function PaletteItem({
  node,
  onNodeDragStart,
}: {
  node: NodeType;
  onNodeDragStart: (nodeType: string, type: string, label: string) => void;
}) {
  const Icon = node.icon;
  const category = node.type as Category;
  const colorMap: Record<Category, string> = {
    trigger: "#7c3aed",
    action: "#2563eb",
    logic: "#d97706",
    integration: "#059669",
  };
  const color = colorMap[category] ?? "#6b7280";
  const bg = categoryIconBg[category] ?? "rgba(0,0,0,0.06)";
  const tooltipText = nodeTooltips[node.nodeType] ?? node.description;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          draggable
          onDragStart={() => onNodeDragStart(node.nodeType, node.type, node.label)}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 cursor-grab active:cursor-grabbing transition-colors group border border-transparent hover:border-gray-200"
        >
          <div
            style={{ background: bg, width: 28, height: 28, borderRadius: 7 }}
            className="flex items-center justify-center shrink-0"
          >
            <Icon className="size-3.5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-800 leading-tight">{node.label}</div>
            <div className="text-[10px] text-gray-400 leading-tight truncate">{node.description}</div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[240px] text-xs leading-relaxed">
        <p className="font-semibold mb-0.5">{node.label}</p>
        <p>{tooltipText}</p>
        <p className="mt-1 text-muted-foreground italic">Drag onto canvas to add</p>
      </TooltipContent>
    </Tooltip>
  );
}
