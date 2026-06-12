import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles, X, Wand2, Loader2, RefreshCw,
  Zap, ArrowRight, CheckCircle2, ChevronDown, ChevronRight,
  Bell, GitBranch, Clock, Database, MessageSquare, Code2,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type Props = {
  workflowId: Id<"workflows">;
  onGenerated: () => void;
};

// ─── Categorized rich examples ──────────────────────────────────────────────

type ExampleNode = { label: string; type: string };

type Example = {
  title: string;
  category: string;
  prompt: string;
  nodes: ExampleNode[];
  description: string;
};

const EXAMPLES: Example[] = [
  // ── Notifications & Alerts ─────────────────────────────────────────────────
  {
    category: "Notifications & Alerts",
    title: "GitHub Issues → Slack",
    prompt:
      "Every 30 minutes, fetch the latest GitHub issues from my repository using a schedule trigger, then send a formatted Slack message listing the issue titles and URLs. Only send if there are open issues.",
    description: "Polls GitHub on a schedule and posts new issues to Slack with issue details.",
    nodes: [
      { label: "Schedule Trigger", type: "trigger" },
      { label: "GitHub – List Issues", type: "integration" },
      { label: "If/Else – Has Issues?", type: "logic" },
      { label: "Slack – Post Message", type: "integration" },
    ],
  },
  {
    category: "Notifications & Alerts",
    title: "Webhook Alert → Discord + Telegram",
    prompt:
      "When a webhook fires with a JSON payload containing a severity field, use an if/else to check if severity equals 'critical'. If critical, post to both Discord and Telegram with the alert details. Otherwise, post only to Discord.",
    description: "Routes webhook alerts to different channels based on severity level.",
    nodes: [
      { label: "Webhook Trigger", type: "trigger" },
      { label: "If/Else – severity == critical", type: "logic" },
      { label: "Discord – Post Alert", type: "integration" },
      { label: "Telegram – Critical Alert", type: "integration" },
    ],
  },
  {
    category: "Notifications & Alerts",
    title: "RSS Feed → Email Digest",
    prompt:
      "Every Monday at 9am, fetch articles from a tech RSS feed, transform the items to extract just the title and link, then send an HTML email digest to my team address with a list of the top 10 articles.",
    description: "Weekly email digest of RSS feed articles sent on a schedule.",
    nodes: [
      { label: "Schedule – Mon 9am", type: "trigger" },
      { label: "RSS – Fetch Feed", type: "integration" },
      { label: "JSON Transform – Extract titles", type: "action" },
      { label: "Send Email – Digest", type: "action" },
    ],
  },
  // ── AI-Powered ─────────────────────────────────────────────────────────────
  {
    category: "AI-Powered",
    title: "Webhook → AI Summarize → Slack",
    prompt:
      "When a webhook receives text content, send it to OpenAI GPT to summarize in 2-3 sentences using a system prompt that says 'You are a concise summarizer'. Then post the summary to a Slack webhook URL with the original text and summary side by side.",
    description: "Automatically summarizes incoming text content with AI and distributes to Slack.",
    nodes: [
      { label: "Webhook Trigger", type: "trigger" },
      { label: "OpenAI – Summarize", type: "integration" },
      { label: "Set Variable – summary", type: "action" },
      { label: "Slack – Post Summary", type: "integration" },
    ],
  },
  {
    category: "AI-Powered",
    title: "Schedule → Anthropic Report → Notion",
    prompt:
      "Every day at 8am, call Anthropic Claude with a prompt asking for a daily productivity tip, then create a new page in Notion database with today's date as the title and the AI response as the page content.",
    description: "Daily AI-generated productivity tips saved automatically to a Notion database.",
    nodes: [
      { label: "Schedule – Daily 8am", type: "trigger" },
      { label: "Anthropic – Generate Tip", type: "integration" },
      { label: "DateTime – Get Today", type: "action" },
      { label: "Notion – Create Page", type: "integration" },
    ],
  },
  {
    category: "AI-Powered",
    title: "Webhook → Classify → Branch → Route",
    prompt:
      "When a webhook fires with a 'message' field, use OpenAI to classify the message as either 'support', 'sales', or 'other'. Use a switch node on the classification result to route support messages to a support Slack channel, sales to a sales channel, and others to a general channel.",
    description: "AI-powered message classification that routes to the right team automatically.",
    nodes: [
      { label: "Webhook Trigger", type: "trigger" },
      { label: "OpenAI – Classify message", type: "integration" },
      { label: "Switch – Route by type", type: "logic" },
      { label: "Slack – Support Channel", type: "integration" },
      { label: "Slack – Sales Channel", type: "integration" },
      { label: "Slack – General Channel", type: "integration" },
    ],
  },
  // ── Data Sync ──────────────────────────────────────────────────────────────
  {
    category: "Data Sync",
    title: "Airtable → Google Sheets Sync",
    prompt:
      "Every hour, list all records from an Airtable base and table, transform the data to extract name and email fields, then append each record as a new row in a Google Sheets spreadsheet. Only sync records where the status field equals 'active'.",
    description: "Hourly sync of active Airtable records into a Google Sheets tracking sheet.",
    nodes: [
      { label: "Schedule – Hourly", type: "trigger" },
      { label: "Airtable – List Records", type: "integration" },
      { label: "Filter – status == active", type: "logic" },
      { label: "JSON Transform – Extract fields", type: "action" },
      { label: "Google Sheets – Append Rows", type: "integration" },
    ],
  },
  {
    category: "Data Sync",
    title: "Webhook → Validate → Airtable Create",
    prompt:
      "When a webhook fires with form submission data including name, email, and message fields, validate that email is not empty using a filter node, transform the data to add a 'submittedAt' timestamp field, then create a new record in Airtable and send a confirmation to a Slack channel.",
    description: "Form submission handler that validates, enriches, and stores data in Airtable.",
    nodes: [
      { label: "Webhook Trigger", type: "trigger" },
      { label: "Filter – Email not empty", type: "logic" },
      { label: "DateTime – Add timestamp", type: "action" },
      { label: "Airtable – Create Record", type: "integration" },
      { label: "Slack – Notify team", type: "integration" },
    ],
  },
  // ── Developer Workflows ─────────────────────────────────────────────────────
  {
    category: "Developer Workflows",
    title: "GitHub PR → Jira Ticket",
    prompt:
      "When a webhook fires from a GitHub pull request event, extract the PR title, URL, and author from the payload using JSON transform, then create a Jira issue in project 'ENG' of type 'Task' with the PR title as the summary and a link in the description. Finally notify the team in a Discord channel.",
    description: "Automatically creates Jira tickets from GitHub pull requests.",
    nodes: [
      { label: "Webhook – GitHub PR event", type: "trigger" },
      { label: "JSON Transform – Extract PR data", type: "action" },
      { label: "Jira – Create Issue", type: "integration" },
      { label: "Discord – Notify Team", type: "integration" },
    ],
  },
  {
    category: "Developer Workflows",
    title: "HTTP Monitor → Alert on Failure",
    prompt:
      "Every 5 minutes on a schedule, make a GET request to my API health endpoint. Use an if/else node to check if the response status is not 200. If it fails, send a Telegram alert to my phone saying the service is down with the error details. If successful, use a noOp node to do nothing.",
    description: "Uptime monitoring that alerts via Telegram when an endpoint goes down.",
    nodes: [
      { label: "Schedule – Every 5 min", type: "trigger" },
      { label: "HTTP – GET Health Check", type: "action" },
      { label: "If/Else – status != 200", type: "logic" },
      { label: "Telegram – Send Alert", type: "integration" },
      { label: "No-Op – All Clear", type: "logic" },
    ],
  },
  // ── Data Transform ─────────────────────────────────────────────────────────
  {
    category: "Data Transform",
    title: "Webhook → Multi-Step Transform Pipeline",
    prompt:
      "When a webhook fires with an array of product data, use a JSON transform to pick only the id, name, and price fields, then use a math node to apply a 20% tax to the price (expression: input.price * 1.2), then uppercase the product name with a text processing node, and finally POST the transformed data to an external HTTP endpoint.",
    description: "Multi-step data transformation pipeline applied before forwarding to an API.",
    nodes: [
      { label: "Webhook Trigger", type: "trigger" },
      { label: "JSON Transform – Pick fields", type: "action" },
      { label: "Math – Apply 20% tax", type: "action" },
      { label: "Text Process – Uppercase name", type: "action" },
      { label: "HTTP – POST to API", type: "action" },
    ],
  },
  {
    category: "Data Transform",
    title: "Schedule → Enrich → Merge → Store",
    prompt:
      "Every night at midnight, trigger a schedule. Make two parallel HTTP GET requests — one to fetch user data and one to fetch order data. Merge the results into a single object, then transform the data to compute total order value using a math node, and finally send a summary report email.",
    description: "Nightly data enrichment from multiple sources merged into a unified report.",
    nodes: [
      { label: "Schedule – Midnight", type: "trigger" },
      { label: "HTTP – Fetch Users", type: "action" },
      { label: "HTTP – Fetch Orders", type: "action" },
      { label: "Merge – Combine data", type: "logic" },
      { label: "Math – Compute total", type: "action" },
      { label: "Send Email – Report", type: "action" },
    ],
  },
];

const CATEGORIES = [...new Set(EXAMPLES.map((e) => e.category))];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Notifications & Alerts": Bell,
  "AI-Powered": Sparkles,
  "Data Sync": Database,
  "Developer Workflows": GitBranch,
  "Data Transform": Code2,
};

const NODE_TYPE_COLORS: Record<string, string> = {
  trigger: "bg-emerald-100 text-emerald-700 border-emerald-200",
  integration: "bg-violet-100 text-violet-700 border-violet-200",
  logic: "bg-amber-100 text-amber-700 border-amber-200",
  action: "bg-sky-100 text-sky-700 border-sky-200",
};

// ─── Sub-component: Example Card ─────────────────────────────────────────────

function ExampleCard({
  example,
  onUse,
  disabled,
}: {
  example: Example;
  onUse: (prompt: string) => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden hover:border-violet-200 transition-colors">
      {/* Header row */}
      <button
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-violet-50/50 transition-colors cursor-pointer text-left"
        onClick={() => setExpanded((v) => !v)}
        disabled={disabled}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-5 shrink-0 text-violet-500">
            {expanded
              ? <ChevronDown className="size-4" />
              : <ChevronRight className="size-4 text-gray-300" />}
          </div>
          <span className="text-xs font-semibold text-gray-800 truncate">{example.title}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUse(example.prompt);
          }}
          className="ml-2 shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-violet-600 text-white hover:bg-violet-500 transition-colors cursor-pointer"
          disabled={disabled}
        >
          Use
        </button>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" as const }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 space-y-3 border-t border-gray-100 pt-3">
              {/* Description */}
              <p className="text-[11px] text-gray-500 leading-snug">{example.description}</p>

              {/* Node preview */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Nodes created
                </p>
                <div className="flex flex-wrap gap-1">
                  {example.nodes.map((n, i) => (
                    <span
                      key={i}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded border ${NODE_TYPE_COLORS[n.type] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {n.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Full prompt preview */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Prompt
                </p>
                <p className="text-[11px] text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-2.5 py-2 border border-gray-100 line-clamp-3">
                  {example.prompt}
                </p>
              </div>

              <button
                onClick={() => onUse(example.prompt)}
                className="w-full text-xs font-semibold py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                disabled={disabled}
              >
                <Wand2 className="size-3" />
                Use this prompt
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AIWorkflowBuilder({ workflowId, onGenerated }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ nodeCount: number; edgeCount: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const generateWorkflow = useAction(api.aiWorkflowBuilder.generateWorkflow);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateWorkflow({
        workflowId,
        prompt: prompt.trim(),
        replaceExisting,
      });
      setResult({ nodeCount: res.nodeCount, edgeCount: res.edgeCount, name: res.name });
      toast.success(`Workflow generated — ${res.nodeCount} nodes, ${res.edgeCount} connections`);
      onGenerated();
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { code: string; message: string };
        setError(message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseExample = (examplePrompt: string) => {
    setPrompt(examplePrompt);
    setResult(null);
    setError(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setResult(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleGenerate();
    }
  };

  const filteredExamples = EXAMPLES.filter((e) => e.category === activeCategory);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-105 active:scale-100"
      >
        <Sparkles className="size-3.5" />
        AI Build
      </button>

      {/* Panel overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={handleClose}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.97 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-[520px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-gray-100 bg-gradient-to-br from-violet-50 to-indigo-50 shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md">
                      <Wand2 className="size-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">AI Workflow Builder</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Describe your automation in plain English
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="size-8 flex items-center justify-center rounded-lg hover:bg-white/80 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Tips row */}
                <div className="flex flex-wrap gap-1.5 mt-3.5">
                  {[
                    "Be specific about triggers",
                    "Name the integrations",
                    "Describe conditions & branches",
                    "Mention data fields",
                  ].map((tip) => (
                    <Badge
                      key={tip}
                      variant="secondary"
                      className="text-[10px] px-2 py-0.5 bg-white/70 border border-violet-100 text-violet-700"
                    >
                      {tip}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Body — scrollable */}
              <div className="flex-1 overflow-y-auto">
                {/* Prompt section */}
                <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    What should this workflow do?
                  </label>
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        "e.g. Every Monday at 9am, fetch new GitHub issues, classify them with OpenAI as 'bug' or 'feature', then post bugs to the #alerts Slack channel and features to #roadmap..."
                      }
                      className="min-h-[110px] resize-none text-sm leading-relaxed border-gray-200 focus:border-violet-400 focus:ring-violet-200 pr-3 pb-8"
                      disabled={isGenerating}
                    />
                    <div className="absolute bottom-2.5 right-3 text-[10px] text-gray-300 pointer-events-none">
                      ⌘↵ to generate
                    </div>
                  </div>

                  {/* Writing tips */}
                  <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                    <p className="text-[11px] font-semibold text-amber-700 mb-1">
                      Tips for better results:
                    </p>
                    <ul className="text-[11px] text-amber-600 space-y-0.5">
                      <li>{"→ Specify when/how it starts: \"Every Monday at 9am\" or \"When a webhook fires\""}</li>
                      <li>{"→ Name the apps: \"send to Slack\", \"create in Airtable\", \"call OpenAI\""}</li>
                      <li>{"→ Describe conditions: \"only if status == active\", \"if error, do X else do Y\""}</li>
                      <li>{"→ Mention data fields: \"extract the title and email fields\""}</li>
                    </ul>
                  </div>

                  {/* Replace toggle */}
                  <div className="flex items-center justify-between mt-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Replace existing workflow</p>
                      <p className="text-[11px] text-gray-400">Clear current nodes before generating</p>
                    </div>
                    <button
                      onClick={() => setReplaceExisting((v) => !v)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${replaceExisting ? "bg-violet-600" : "bg-gray-200"}`}
                    >
                      <span
                        className={`inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${replaceExisting ? "translate-x-4" : "translate-x-0"}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Examples section */}
                <div className="px-6 pt-4 pb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">
                      Example Prompts
                    </p>
                    <Clock className="size-3.5 text-gray-300" />
                  </div>

                  {/* Category tabs */}
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {CATEGORIES.map((cat) => {
                      const Icon = CATEGORY_ICONS[cat] ?? MessageSquare;
                      return (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all cursor-pointer ${activeCategory === cat
                            ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                            : "bg-white text-gray-500 border-gray-200 hover:border-violet-200 hover:text-violet-600"
                          }`}
                          disabled={isGenerating}
                        >
                          <Icon className="size-3" />
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* Example cards */}
                  <div className="space-y-2">
                    {filteredExamples.map((ex) => (
                      <ExampleCard
                        key={ex.title}
                        example={ex}
                        onUse={handleUseExample}
                        disabled={isGenerating}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Result / Error feedback */}
              <AnimatePresence>
                {(result ?? error) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="px-6 pb-2 shrink-0"
                  >
                    {result && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
                        <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-green-800 truncate">{result.name}</p>
                          <p className="text-[11px] text-green-600 mt-0.5">
                            {result.nodeCount} nodes · {result.edgeCount} connections generated
                          </p>
                        </div>
                        <button
                          onClick={() => { setResult(null); setPrompt(""); }}
                          className="text-green-500 hover:text-green-700 cursor-pointer"
                        >
                          <RefreshCw className="size-3.5" />
                        </button>
                      </div>
                    )}
                    {error && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                        <p className="text-xs font-semibold text-red-700">Generation failed</p>
                        <p className="text-[11px] text-red-500 mt-0.5">{error}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center gap-3 shrink-0">
                <Button
                  onClick={() => void handleGenerate()}
                  disabled={!prompt.trim() || isGenerating}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm h-10 shadow-md disabled:opacity-50 gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Generating workflow...
                    </>
                  ) : result ? (
                    <>
                      <RefreshCw className="size-4" />
                      Regenerate
                    </>
                  ) : (
                    <>
                      <Zap className="size-4" />
                      Generate Workflow
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
                {result && (
                  <Button
                    onClick={handleClose}
                    variant="secondary"
                    className="h-10 px-4 font-medium"
                  >
                    Done
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
