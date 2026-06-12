import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useState, useCallback, useRef, useEffect, type DragEvent } from "react";
import {
  ReactFlow, Background, Controls, MiniMap, addEdge,
  useNodesState, useEdgesState,
  type Connection, type Edge, type Node, type NodeTypes, type ReactFlowInstance,
  Panel, BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import WorkflowNode, { type WorkflowNodeData } from "./_components/WorkflowNode.tsx";
import NodePalette from "./_components/NodePalette.tsx";
import NodeConfigPanel from "./_components/NodeConfigPanel.tsx";
import ExecutionPanel from "./_components/ExecutionPanel.tsx";
import WorkflowSettingsPanel from "./_components/WorkflowSettingsPanel.tsx";
import AIWorkflowBuilder from "./_components/AIWorkflowBuilder.tsx";
import { useExecutionStatus } from "./_hooks/use-execution-status.ts";
import Logo from "@/components/Logo.tsx";
import {
  ArrowLeft, Play, Save, Power, PowerOff, Loader2, Check,
  Grid, Map, Maximize, HelpCircle, X, Plus, Settings, Activity,
  Webhook, Globe, Code, Filter, Database, Mail, Calendar, FileText,
  GitMerge, Layers, GitFork, Timer, MessageSquare, MessageCircle, Send,
  Table2, Grid3X3, BookOpen, Sparkles, Brain, Github, SquareKanban, Rss,
  Braces, Calculator, CalendarClock, Type, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { motion, AnimatePresence } from "motion/react";

const nodeTypes: NodeTypes = { workflowNode: WorkflowNode };

type SaveStatus = "idle" | "saving" | "saved";
type LastRunStatus = "idle" | "success" | "failed";
type HistoryEntry = { nodes: Node<WorkflowNodeData>[]; edges: Edge[] };
type ContextMenuState = { x: number; y: number; node: Node<WorkflowNodeData> } | null;

const SHORTCUTS = [
  { keys: "Ctrl+Z", label: "Undo" },
  { keys: "Ctrl+Shift+Z", label: "Redo" },
  { keys: "Ctrl+A", label: "Select all" },
  { keys: "Ctrl+D", label: "Duplicate selected" },
  { keys: "Esc", label: "Deselect / close panel" },
  { keys: "Del / Backspace", label: "Delete selected" },
];

// ─── Mobile node type definitions ───────────────────────────────────────────

type MobileNodeTypeDef = {
  type: string;
  nodeType: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

const MOBILE_NODE_TYPES: MobileNodeTypeDef[] = [
  { type: "trigger", nodeType: "webhook", label: "Webhook", icon: Webhook, description: "Trigger on HTTP webhook" },
  { type: "trigger", nodeType: "schedule", label: "Schedule", icon: Calendar, description: "Trigger on schedule" },
  { type: "action", nodeType: "http", label: "HTTP Request", icon: Globe, description: "Make HTTP API call" },
  { type: "action", nodeType: "email", label: "Send Email", icon: Mail, description: "Send an email" },
  { type: "action", nodeType: "database", label: "Database", icon: Database, description: "Query or update database" },
  { type: "logic", nodeType: "filter", label: "Filter", icon: Filter, description: "Filter data conditionally" },
  { type: "logic", nodeType: "code", label: "Code", icon: Code, description: "Run custom code" },
  { type: "logic", nodeType: "transform", label: "Transform", icon: FileText, description: "Transform data" },
  { type: "logic", nodeType: "set", label: "Set Variable", icon: Settings, description: "Set a variable" },
  { type: "logic", nodeType: "ifelse", label: "If / Else", icon: GitMerge, description: "Branch based on condition" },
  { type: "logic", nodeType: "switch", label: "Switch", icon: Layers, description: "Multi-way branch" },
  { type: "logic", nodeType: "merge", label: "Merge", icon: GitFork, description: "Merge multiple inputs" },
  { type: "logic", nodeType: "delay", label: "Delay", icon: Timer, description: "Wait before continuing" },
  { type: "integration", nodeType: "slack", label: "Slack", icon: MessageSquare, description: "Send Slack message" },
  { type: "integration", nodeType: "discord", label: "Discord", icon: MessageCircle, description: "Send Discord message" },
  { type: "integration", nodeType: "telegram", label: "Telegram", icon: Send, description: "Send Telegram message" },
  { type: "integration", nodeType: "googleSheets", label: "Google Sheets", icon: Table2, description: "Read/write spreadsheet" },
  { type: "integration", nodeType: "airtable", label: "Airtable", icon: Grid3X3, description: "Manage Airtable records" },
  { type: "integration", nodeType: "notion", label: "Notion", icon: BookOpen, description: "Create/get Notion pages" },
  { type: "integration", nodeType: "openai", label: "OpenAI", icon: Sparkles, description: "AI chat & embeddings" },
  { type: "integration", nodeType: "anthropic", label: "Anthropic", icon: Brain, description: "Claude AI completion" },
  { type: "integration", nodeType: "github", label: "GitHub", icon: Github, description: "Manage issues & repos" },
  { type: "integration", nodeType: "jira", label: "Jira", icon: SquareKanban, description: "Manage Jira issues" },
  { type: "integration", nodeType: "rss", label: "RSS Feed", icon: Rss, description: "Fetch RSS feed items" },
  { type: "integration", nodeType: "jsonTransform", label: "JSON", icon: Braces, description: "Parse & transform JSON" },
  { type: "integration", nodeType: "math", label: "Math", icon: Calculator, description: "Math expressions" },
  { type: "integration", nodeType: "dateTime", label: "Date & Time", icon: CalendarClock, description: "Date operations" },
  { type: "integration", nodeType: "textProcess", label: "Text", icon: Type, description: "Text processing" },
];

const MOBILE_NODE_CATEGORIES: { key: string; label: string }[] = [
  { key: "trigger", label: "Triggers" },
  { key: "action", label: "Actions" },
  { key: "logic", label: "Logic" },
  { key: "integration", label: "Integrations" },
];

function getMobileNodeStyle(type: string): { dot: string; badge: string } {
  switch (type) {
    case "trigger": return { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" };
    case "logic":   return { dot: "bg-amber-500",   badge: "bg-amber-100 text-amber-700" };
    case "integration": return { dot: "bg-violet-500", badge: "bg-violet-100 text-violet-700" };
    case "action":  return { dot: "bg-sky-500",     badge: "bg-sky-100 text-sky-700" };
    default:        return { dot: "bg-gray-400",    badge: "bg-gray-100 text-gray-600" };
  }
}

// ─── Bottom Sheet wrapper ────────────────────────────────────────────────────

function BottomSheet({
  open,
  onClose,
  children,
  title,
  maxHeight = "85vh",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxHeight?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 flex flex-col"
            style={{ maxHeight }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Handle + header */}
            <div className="shrink-0 px-4 pt-3 pb-2 border-b border-gray-100">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
              {title && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{title}</span>
                  <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer">
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Mobile Editor View ──────────────────────────────────────────────────────

type MobileNodeSummary = { _id: string; label?: string; nodeType: string };

type MobileEditorViewProps = {
  workflow: { name: string; isActive: boolean; description?: string };
  flowNodes: Node<WorkflowNodeData>[];
  setFlowNodes: React.Dispatch<React.SetStateAction<Node<WorkflowNodeData>[]>>;
  isExecuting: boolean;
  handleExecute: () => void;
  handleSavePositions: () => void;
  saveStatus: SaveStatus;
  selectedNode: Node<WorkflowNodeData> | null;
  setSelectedNode: (node: Node<WorkflowNodeData> | null) => void;
  workflowId: Id<"workflows">;
  createNode: (args: {
    workflowId: Id<"workflows">;
    type: string;
    nodeType: string;
    position: { x: number; y: number };
    label: string;
  }) => Promise<Id<"nodes">>;
  handleNodeUpdate: (nodeId: string, label: string, configuration: Record<string, unknown>) => Promise<void>;
  handleNodeDelete: (nodes: Node<WorkflowNodeData>[]) => Promise<void>;
  convexNodes: MobileNodeSummary[];
  currentExecutionId: Id<"executions"> | null;
  handleToggleActive: () => void;
  aiReloadKey: number;
  setAiReloadKey: React.Dispatch<React.SetStateAction<number>>;
};

function MobileEditorView({
  workflow,
  flowNodes,
  setFlowNodes,
  isExecuting,
  handleExecute,
  handleSavePositions,
  saveStatus,
  selectedNode,
  setSelectedNode,
  workflowId,
  createNode,
  handleNodeUpdate,
  handleNodeDelete,
  convexNodes,
  currentExecutionId,
  handleToggleActive,
  setAiReloadKey,
}: MobileEditorViewProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [bottomSheet, setBottomSheet] = useState<"execution" | "settings" | null>(null);
  const [addingNode, setAddingNode] = useState(false);

  const handleOpenConfig = (node: Node<WorkflowNodeData>) => {
    setSelectedNode(node);
    setConfigOpen(true);
  };

  const handleAddNode = async (def: MobileNodeTypeDef) => {
    setAddingNode(true);
    const position = { x: 100 + flowNodes.length * 20, y: 300 };
    try {
      const nodeId = await createNode({
        workflowId,
        type: def.type,
        nodeType: def.nodeType,
        position,
        label: def.label,
      });
      const newNode: Node<WorkflowNodeData> = {
        id: nodeId,
        type: "workflowNode",
        position,
        data: { label: def.label, type: def.type, nodeType: def.nodeType, status: undefined },
      };
      setFlowNodes((nds) => [...nds, newNode]);
      toast.success(`${def.label} added`);
      setPaletteOpen(false);
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else {
        toast.error("Failed to add node");
      }
    } finally {
      setAddingNode(false);
    }
  };

  const handleDeleteNode = async (node: Node<WorkflowNodeData>) => {
    await handleNodeDelete([node]);
    setFlowNodes((nds) => nds.filter((n) => n.id !== node.id));
    setConfigOpen(false);
    setSelectedNode(null);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* ── Mobile Header ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 shrink-0">
        <div className="px-3 py-2.5">
          {/* Row 1: back + name + badge */}
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" asChild className="size-8 shrink-0">
              <Link to="/workflows"><ArrowLeft className="size-4" /></Link>
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm font-bold text-gray-900 truncate">{workflow.name}</h1>
                <Badge
                  variant={workflow.isActive ? "default" : "secondary"}
                  className="text-[10px] px-1.5 py-0 shrink-0 cursor-pointer"
                  onClick={handleToggleActive}
                >
                  {workflow.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {workflow.description && (
                <p className="text-[11px] text-gray-400 truncate">{workflow.description}</p>
              )}
            </div>
          </div>

          {/* Row 2: action buttons */}
          <div className="flex items-center gap-2">
            <AIWorkflowBuilder
              workflowId={workflowId}
              onGenerated={() => setAiReloadKey((k) => k + 1)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSavePositions}
              className="gap-1.5 h-8 text-xs flex-1"
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : saveStatus === "saved" ? (
                <Check className="size-3.5 text-green-600" />
              ) : (
                <Save className="size-3.5" />
              )}
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Save"}
            </Button>
            <Button
              size="sm"
              onClick={handleExecute}
              disabled={isExecuting}
              className="gap-1.5 h-8 text-xs flex-1"
            >
              {isExecuting ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
              {isExecuting ? "Running…" : "Test Run"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Node List ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-32 space-y-2">
        {flowNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
              <Grid3X3 className="size-6 text-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">No nodes yet</p>
            <p className="text-xs text-gray-400">Tap "+ Add Node" to build your workflow</p>
          </div>
        ) : (
          flowNodes.map((node) => {
            const style = getMobileNodeStyle(node.data.type);
            const isSelected = selectedNode?.id === node.id;
            return (
              <div
                key={node.id}
                className={`bg-white rounded-xl border-2 transition-all shadow-sm px-4 py-3 ${
                  isSelected ? "border-indigo-500 shadow-indigo-100" : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Color dot */}
                  <div className={`size-3 rounded-full shrink-0 ${style.dot}`} />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 truncate">{node.data.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${style.badge}`}>
                        {node.data.nodeType}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{node.data.type}</p>
                  </div>
                  {/* Configure button */}
                  <button
                    onClick={() => handleOpenConfig(node)}
                    className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-800 cursor-pointer shrink-0 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    Configure
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Bottom tab bar ────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="flex items-center">
          <button
            onClick={() => setBottomSheet("execution")}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-gray-500 hover:text-indigo-600 cursor-pointer transition-colors"
          >
            <Activity className="size-4" />
            <span className="text-[10px] font-medium">Execution</span>
          </button>
          {/* Center add button */}
          <div className="flex items-center justify-center px-4">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg transition-colors cursor-pointer"
            >
              <Plus className="size-4" />
              Add Node
            </button>
          </div>
          <button
            onClick={() => setBottomSheet("settings")}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-gray-500 hover:text-indigo-600 cursor-pointer transition-colors"
          >
            <Settings className="size-4" />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </div>

      {/* ── Config Bottom Sheet ───────────────────────────────────── */}
      <BottomSheet
        open={configOpen && selectedNode !== null}
        onClose={() => { setConfigOpen(false); setSelectedNode(null); }}
        title={selectedNode ? `Configure: ${selectedNode.data.label}` : "Configure Node"}
        maxHeight="90vh"
      >
        <div className="px-4 pb-4">
          <NodeConfigPanel
            node={selectedNode}
            onClose={() => { setConfigOpen(false); setSelectedNode(null); }}
            onUpdate={async (nodeId, label, configuration) => {
              await handleNodeUpdate(nodeId, label, configuration);
              setConfigOpen(false);
              setSelectedNode(null);
            }}
          />
          {selectedNode && (
            <div className="pt-2 border-t border-gray-100 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => selectedNode && handleDeleteNode(selectedNode)}
              >
                Delete Node
              </Button>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* ── Node Palette Bottom Sheet ─────────────────────────────── */}
      <BottomSheet
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        title="Add Node"
        maxHeight="85vh"
      >
        <div className="px-4 pb-6 space-y-5">
          {MOBILE_NODE_CATEGORIES.map((cat) => {
            const catNodes = MOBILE_NODE_TYPES.filter((n) => n.type === cat.key);
            const style = getMobileNodeStyle(cat.key);
            return (
              <div key={cat.key}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`size-2 rounded-full ${style.dot}`} />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                    {cat.label}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {catNodes.map((def) => {
                    const Icon = def.icon;
                    return (
                      <button
                        key={def.nodeType}
                        onClick={() => handleAddNode(def)}
                        disabled={addingNode}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer text-left disabled:opacity-50"
                      >
                        <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${style.badge}`}>
                          <Icon className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-800">{def.label}</div>
                          <div className="text-xs text-gray-400 truncate">{def.description}</div>
                        </div>
                        <Plus className="size-4 text-gray-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </BottomSheet>

      {/* ── Execution Bottom Sheet ────────────────────────────────── */}
      <BottomSheet
        open={bottomSheet === "execution"}
        onClose={() => setBottomSheet(null)}
        title="Execution Logs"
        maxHeight="85vh"
      >
        <ExecutionPanel
          workflowId={workflowId}
          currentExecutionId={currentExecutionId}
          nodes={convexNodes}
        />
      </BottomSheet>

      {/* ── Settings Bottom Sheet ─────────────────────────────────── */}
      <BottomSheet
        open={bottomSheet === "settings"}
        onClose={() => setBottomSheet(null)}
        title="Workflow Settings"
        maxHeight="90vh"
      >
        <div className="px-4 pb-6">
          <WorkflowSettingsPanel workflowId={workflowId} />
        </div>
      </BottomSheet>
    </div>
  );
}

// ─── Desktop Editor ──────────────────────────────────────────────────────────

function WorkflowEditorInner() {
  const { id } = useParams<{ id: string }>();
  const workflow = useQuery(api.workflows.get, { workflowId: id as Id<"workflows"> });
  const nodes = useQuery(api.nodes.list, { workflowId: id as Id<"workflows"> });
  const connections = useQuery(api.connections.list, { workflowId: id as Id<"workflows"> });
  const updateWorkflow = useMutation(api.workflows.update);
  const createNode = useMutation(api.nodes.create);
  const updateNode = useMutation(api.nodes.update);
  const deleteNode = useMutation(api.nodes.remove);
  const createConnection = useMutation(api.connections.create);
  const deleteConnection = useMutation(api.connections.remove);
  const executeWorkflow = useAction(api.execute.executeWorkflow);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node<WorkflowNodeData>>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null);
  const [currentExecutionId, setCurrentExecutionId] = useState<Id<"executions"> | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [draggedNodeType, setDraggedNodeType] = useState<{ nodeType: string; type: string; label: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastRunStatus, setLastRunStatus] = useState<LastRunStatus>("idle");
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [aiReloadKey, setAiReloadKey] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // History for undo/redo
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isLoadingRef = useRef(true);
  const isUndoRedoRef = useRef(false);

  useExecutionStatus({ executionId: currentExecutionId, setFlowNodes });

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // aiReloadKey triggers child re-renders via key prop if needed

  // Push to history when nodes/edges change (not from loading or undo/redo)
  const pushHistory = useCallback((newNodes: Node<WorkflowNodeData>[], newEdges: Edge[]) => {
    if (isLoadingRef.current || isUndoRedoRef.current) return;
    const stack = historyRef.current;
    const truncated = stack.slice(0, historyIndexRef.current + 1);
    truncated.push({ nodes: newNodes, edges: newEdges });
    if (truncated.length > 50) truncated.shift();
    historyRef.current = truncated;
    historyIndexRef.current = truncated.length - 1;
  }, []);

  useEffect(() => {
    if (nodes && connections) {
      isLoadingRef.current = true;
      const loadedNodes: Node<WorkflowNodeData>[] = nodes.map((node) => ({
        id: node._id, type: "workflowNode", position: node.position,
        data: { label: node.label, type: node.type, nodeType: node.nodeType, configuration: node.configuration, status: undefined },
      }));
      const loadedEdges: Edge[] = connections.map((conn) => ({
        id: conn._id, source: conn.sourceNodeId, target: conn.targetNodeId,
      }));
      setFlowNodes(loadedNodes);
      setFlowEdges(loadedEdges);
      historyRef.current = [{ nodes: loadedNodes, edges: loadedEdges }];
      historyIndexRef.current = 0;
      setTimeout(() => { isLoadingRef.current = false; }, 100);
    }
  }, [nodes, connections, setFlowNodes, setFlowEdges]);

  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    try {
      const connectionId = await createConnection({
        workflowId: id as Id<"workflows">, sourceNodeId: connection.source as Id<"nodes">, targetNodeId: connection.target as Id<"nodes">,
      });
      setFlowEdges((eds) => {
        const next = addEdge({ ...connection, id: connectionId }, eds);
        pushHistory(flowNodes, next);
        return next;
      });
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else { toast.error("Failed to create connection"); }
    }
  }, [createConnection, id, setFlowEdges, flowNodes, pushHistory]);

  const onNodeDragStart = (nodeType: string, type: string, label: string) => {
    setDraggedNodeType({ nodeType, type, label });
  };
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(async (event: DragEvent) => {
    event.preventDefault();
    if (!draggedNodeType || !reactFlowInstance || !reactFlowWrapper.current) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    try {
      const nodeId = await createNode({
        workflowId: id as Id<"workflows">, type: draggedNodeType.type,
        nodeType: draggedNodeType.nodeType, position, label: draggedNodeType.label,
      });
      const newNode: Node<WorkflowNodeData> = {
        id: nodeId, type: "workflowNode", position,
        data: { label: draggedNodeType.label, type: draggedNodeType.type, nodeType: draggedNodeType.nodeType, status: undefined },
      };
      setFlowNodes((nds) => {
        const next = [...nds, newNode];
        pushHistory(next, flowEdges);
        return next;
      });
      toast.success("Node added");
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else { toast.error("Failed to add node"); }
    }
    setDraggedNodeType(null);
  }, [draggedNodeType, reactFlowInstance, createNode, id, setFlowNodes, flowEdges, pushHistory]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node<WorkflowNodeData>) => {
    setSelectedNode(node);
    setContextMenu(null);
  }, []);
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setContextMenu(null);
    setShowShortcuts(false);
  }, []);

  const handleNodeUpdate = async (nodeId: string, label: string, configuration: Record<string, unknown>) => {
    try {
      await updateNode({ nodeId: nodeId as Id<"nodes">, label, configuration });
      setFlowNodes((nds) => nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, label, configuration } } : node
      ));
      toast.success("Node updated");
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else { toast.error("Failed to update node"); }
    }
  };

  const handleSavePositions = async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus("saving");
    try {
      await Promise.all(
        flowNodes.map((node) =>
          updateNode({ nodeId: node.id as Id<"nodes">, position: node.position })
        )
      );
      setSaveStatus("saved");
      saveTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      setSaveStatus("idle");
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else { toast.error("Failed to save workflow"); }
    }
  };

  const handleToggleActive = async () => {
    if (!workflow) return;
    try {
      await updateWorkflow({ workflowId: id as Id<"workflows">, isActive: !workflow.isActive });
      toast.success(workflow.isActive ? "Workflow deactivated" : "Workflow activated");
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else { toast.error("Failed to toggle workflow"); }
    }
  };

  const handleNodeDelete = useCallback(async (nodesToDelete: Node<WorkflowNodeData>[]) => {
    for (const node of nodesToDelete) {
      try { await deleteNode({ nodeId: node.id as Id<"nodes"> }); }
      catch (error) {
        if (error instanceof ConvexError) {
          const { message } = error.data as { code: string; message: string };
          toast.error(message);
        }
      }
    }
    setSelectedNode(null);
    setContextMenu(null);
  }, [deleteNode]);

  const handleEdgeDelete = useCallback(async (edgesToDelete: Edge[]) => {
    for (const edge of edgesToDelete) {
      try { await deleteConnection({ connectionId: edge.id as Id<"connections"> }); }
      catch (error) {
        if (error instanceof ConvexError) {
          const { message } = error.data as { code: string; message: string };
          toast.error(message);
        }
      }
    }
  }, [deleteConnection]);

  const handleExecute = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setLastRunStatus("idle");
    try {
      setFlowNodes((nds) => nds.map((node) => ({ ...node, data: { ...node.data, status: undefined } })));
      const executionId = await executeWorkflow({ workflowId: id as Id<"workflows"> });
      setCurrentExecutionId(executionId);
      toast.success("Workflow started");
      setLastRunStatus("success");
    } catch (error) {
      setLastRunStatus("failed");
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else { toast.error("Failed to execute workflow"); }
    } finally { setIsExecuting(false); }
  };

  const duplicateNode = useCallback(async (node: Node<WorkflowNodeData>) => {
    const position = { x: node.position.x + 50, y: node.position.y + 50 };
    try {
      const nodeId = await createNode({
        workflowId: id as Id<"workflows">,
        type: node.data.type,
        nodeType: node.data.nodeType,
        position,
        label: `${node.data.label} (copy)`,
      });
      const newNode: Node<WorkflowNodeData> = {
        id: nodeId, type: "workflowNode", position,
        data: { ...node.data, label: `${node.data.label} (copy)`, status: undefined },
      };
      setFlowNodes((nds) => {
        const next = [...nds, newNode];
        pushHistory(next, flowEdges);
        return next;
      });
      toast.success("Node duplicated");
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else { toast.error("Failed to duplicate node"); }
    }
  }, [createNode, id, setFlowNodes, flowEdges, pushHistory]);

  const toggleNodeDisabled = useCallback((node: Node<WorkflowNodeData>) => {
    setFlowNodes((nds) =>
      nds.map((n) =>
        n.id === node.id ? { ...n, data: { ...n.data, disabled: !n.data.disabled } } : n
      )
    );
  }, [setFlowNodes]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current -= 1;
    const entry = historyRef.current[historyIndexRef.current];
    setFlowNodes(entry.nodes);
    setFlowEdges(entry.edges);
    setTimeout(() => { isUndoRedoRef.current = false; }, 50);
  }, [setFlowNodes, setFlowEdges]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current += 1;
    const entry = historyRef.current[historyIndexRef.current];
    setFlowNodes(entry.nodes);
    setFlowEdges(entry.edges);
    setTimeout(() => { isUndoRedoRef.current = false; }, 50);
  }, [setFlowNodes, setFlowEdges]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (meta && e.shiftKey && (e.key === "z" || e.key === "Z")) { e.preventDefault(); redo(); return; }
      if (meta && (e.key === "z" || e.key === "Z")) { e.preventDefault(); undo(); return; }
      if (meta && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        setFlowNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
        return;
      }
      if (meta && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        setFlowNodes((nds) => {
          const selected = nds.filter((n) => n.selected);
          if (selected.length === 0 && selectedNode) { duplicateNode(selectedNode); }
          else { selected.forEach((n) => duplicateNode(n)); }
          return nds;
        });
        return;
      }
      if (e.key === "Escape") {
        setSelectedNode(null);
        setContextMenu(null);
        setShowShortcuts(false);
        setFlowNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, selectedNode, duplicateNode, setFlowNodes]);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node<WorkflowNodeData>) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, node: node as Node<WorkflowNodeData> });
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  const edgeStyle = { stroke: "#6366f1", strokeWidth: 2 };
  const defaultEdgeOptions = { style: edgeStyle, animated: isExecuting };
  const connectionLineStyle = { stroke: "#6366f1", strokeWidth: 2 };

  if (!workflow || !nodes || !connections) {
    return <div className="h-screen flex items-center justify-center"><Skeleton className="h-full w-full" /></div>;
  }

  // ── Mobile view ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <MobileEditorView
        workflow={workflow}
        flowNodes={flowNodes}
        setFlowNodes={setFlowNodes}
        isExecuting={isExecuting}
        handleExecute={handleExecute}
        handleSavePositions={handleSavePositions}
        saveStatus={saveStatus}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        workflowId={id as Id<"workflows">}
        createNode={createNode}
        handleNodeUpdate={handleNodeUpdate}
        handleNodeDelete={handleNodeDelete}
        convexNodes={nodes}
        currentExecutionId={currentExecutionId}
        handleToggleActive={handleToggleActive}
        aiReloadKey={aiReloadKey}
        setAiReloadKey={setAiReloadKey}
      />
    );
  }

  // ── Desktop view ─────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" asChild className="size-8">
                    <Link to="/workflows"><ArrowLeft className="size-4" /></Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back to workflows dashboard</TooltipContent>
              </Tooltip>
              <Logo variant="icon" showText />
              <div className="h-5 w-px bg-gray-200" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold text-gray-900">{workflow.name}</h1>
                  <Badge variant={workflow.isActive ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                    {workflow.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {workflow.description && (
                  <p className="text-xs text-gray-400">{workflow.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AIWorkflowBuilder
                workflowId={id as Id<"workflows">}
                onGenerated={() => setAiReloadKey((k) => k + 1)}
              />
              <div className="h-5 w-px bg-gray-200" />
              <div className="flex items-center gap-1.5 mr-1">
                {saveStatus === "saving" && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" />Saving...
                  </span>
                )}
                {saveStatus === "saved" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-green-600 flex items-center gap-1 cursor-default">
                        <Check className="size-3" />Saved
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>All node positions saved to the cloud</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleSavePositions} className="gap-1.5 h-8 text-xs">
                    <Save className="size-3.5" />Save
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save all node positions to the cloud</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={workflow.isActive ? "outline" : "default"}
                    size="sm" onClick={handleToggleActive} className="gap-1.5 h-8 text-xs"
                  >
                    {workflow.isActive ? <><PowerOff className="size-3.5" />Deactivate</> : <><Power className="size-3.5" />Activate</>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {workflow.isActive
                    ? "Deactivate this workflow so triggers no longer fire"
                    : "Activate this workflow so triggers can fire automatically"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm" onClick={handleExecute} disabled={isExecuting}
                    className={`gap-1.5 h-8 text-xs ${lastRunStatus === "success" ? "bg-green-600 hover:bg-green-700" : lastRunStatus === "failed" ? "bg-red-600 hover:bg-red-700" : ""}`}
                  >
                    {isExecuting ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                    {isExecuting ? "Running..." : "Test Run"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isExecuting ? "Workflow is currently executing…" : "Manually trigger a test run of this workflow and view live logs"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas and Panels */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-60 border-r border-gray-200 bg-white shrink-0">
          <NodePalette onNodeDragStart={onNodeDragStart} />
        </div>
        <div className="flex-1 relative flex flex-col overflow-hidden">
          <div className="flex-1 relative" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={flowNodes} edges={flowEdges}
              onNodesChange={onNodesChange as unknown as (changes: unknown) => void}
              onEdgesChange={onEdgesChange} onConnect={onConnect} onInit={setReactFlowInstance}
              onDrop={onDrop} onDragOver={onDragOver}
              onNodeClick={onNodeClick as unknown as (event: React.MouseEvent, node: Node) => void}
              onPaneClick={onPaneClick}
              onNodesDelete={handleNodeDelete as unknown as (nodes: Node[]) => void}
              onEdgesDelete={handleEdgeDelete}
              onNodeContextMenu={onNodeContextMenu as unknown as (event: React.MouseEvent, node: Node) => void}
              nodeTypes={nodeTypes} fitView
              snapToGrid={snapToGrid}
              snapGrid={[20, 20] as [number, number]}
              className="bg-white" connectionLineStyle={connectionLineStyle} defaultEdgeOptions={defaultEdgeOptions}
            >
              <Background variant={BackgroundVariant.Lines} gap={20} color="#e5e7eb" />
              <Controls />
              {showMinimap && <MiniMap />}

              <Panel position="top-right">
                <div className="relative">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowShortcuts((v) => !v); }}
                        className="size-7 flex items-center justify-center bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                      >
                        <HelpCircle className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Show keyboard shortcuts</TooltipContent>
                  </Tooltip>
                  {showShortcuts && (
                    <div className="absolute top-9 right-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">Keyboard shortcuts</span>
                        <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                          <X className="size-3" />
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {SHORTCUTS.map((s) => (
                          <div key={s.keys} className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">{s.label}</span>
                            <kbd className="text-[10px] bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 font-mono text-gray-600">{s.keys}</kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Panel>

              <Panel position="bottom-left">
                <div className="flex items-center gap-1.5 mb-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSnapToGrid((v) => !v)}
                        className={`flex items-center gap-1.5 px-2 py-1 text-[11px] rounded border shadow-sm transition-colors cursor-pointer font-medium ${snapToGrid ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                      >
                        <Grid className="size-3" />Snap
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle snap-to-grid — aligns nodes to a 20px grid for tidy layouts</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowMinimap((v) => !v)}
                        className={`flex items-center gap-1.5 px-2 py-1 text-[11px] rounded border shadow-sm transition-colors cursor-pointer font-medium ${showMinimap ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                      >
                        <Map className="size-3" />Map
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle the minimap overview in the bottom-right corner</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => reactFlowInstance?.fitView({ padding: 0.1 })}
                        className="flex items-center gap-1.5 px-2 py-1 text-[11px] rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 shadow-sm transition-colors cursor-pointer font-medium"
                      >
                        <Maximize className="size-3" />Fit
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Fit all nodes into view (zoom to fit)</TooltipContent>
                  </Tooltip>
                </div>
              </Panel>
            </ReactFlow>
          </div>

          {/* Status bar */}
          <div className="h-6 border-t border-gray-100 bg-gray-50 flex items-center px-3 gap-3 shrink-0">
            <span className="text-[11px] text-gray-400">
              {flowNodes.length} node{flowNodes.length !== 1 ? "s" : ""} &bull; {flowEdges.length} connection{flowEdges.length !== 1 ? "s" : ""}
            </span>
            {isExecuting && (
              <span className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
                <span>⚡</span> Running...
              </span>
            )}
            {snapToGrid && (
              <span className="text-[11px] text-gray-400">Snap on</span>
            )}
          </div>
        </div>

        <div className="w-80 border-l border-gray-200 bg-white shrink-0">
          <Tabs defaultValue="config" className="h-full flex flex-col">
            <div className="border-b border-gray-100 px-4 shrink-0">
              <TabsList className="w-full h-9 bg-transparent border-0 p-0 gap-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="config" className="flex-1 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Config</TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Configure the selected node — click a node on the canvas first</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="execution" className="flex-1 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Execution</TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>View live and historical execution logs for this workflow</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="settings" className="flex-1 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none">Settings</TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Edit workflow name, description, variables, and export/import options</TooltipContent>
                </Tooltip>
              </TabsList>
            </div>
            <TabsContent value="config" className="flex-1 mt-0 overflow-auto">
              <NodeConfigPanel node={selectedNode} onClose={() => setSelectedNode(null)} onUpdate={handleNodeUpdate} />
            </TabsContent>
            <TabsContent value="execution" className="flex-1 mt-0 overflow-hidden">
              <ExecutionPanel workflowId={id as Id<"workflows">} currentExecutionId={currentExecutionId} nodes={nodes ?? []} />
            </TabsContent>
            <TabsContent value="settings" className="flex-1 mt-0 overflow-auto">
              <WorkflowSettingsPanel workflowId={id as Id<"workflows">} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => { setSelectedNode(contextMenu.node); setContextMenu(null); }}
          >Configure</button>
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => { duplicateNode(contextMenu.node); setContextMenu(null); }}
          >Duplicate</button>
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => { toggleNodeDisabled(contextMenu.node); setContextMenu(null); }}
          >{contextMenu.node.data.disabled ? "Enable" : "Disable"}</button>
          <div className="my-1 border-t border-gray-100" />
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            onClick={() => { handleNodeDelete([contextMenu.node]); setFlowNodes((nds) => nds.filter((n) => n.id !== contextMenu.node.id)); setContextMenu(null); }}
          >Delete</button>
        </div>
      )}
    </div>
  );
}

export default function WorkflowEditor() {
  return (
    <>
      <Unauthenticated>
        <div className="h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader><CardTitle>Sign In Required</CardTitle><CardDescription>Please sign in to access the workflow editor</CardDescription></CardHeader>
            <CardContent><SignInButton><Button className="w-full">Sign In</Button></SignInButton></CardContent>
          </Card>
        </div>
      </Unauthenticated>
      <AuthLoading><div className="h-screen flex items-center justify-center"><Skeleton className="h-full w-full" /></div></AuthLoading>
      <Authenticated><WorkflowEditorInner /></Authenticated>
    </>
  );
}
