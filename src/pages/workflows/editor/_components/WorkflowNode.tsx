import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  Webhook, Globe, Code, Filter, Settings, Database, Mail, Calendar, FileText,
  GitMerge, Layers, GitFork, Timer, Minus,
  MessageSquare, MessageCircle, Send, Table2, Grid3X3, BookOpen,
  Sparkles, Brain, Github, SquareKanban, Rss, Braces, Calculator, CalendarClock, Type,
} from "lucide-react";

export type WorkflowNodeData = {
  label?: string;
  type: string;
  nodeType: string;
  configuration?: Record<string, unknown>;
  status?: "pending" | "running" | "success" | "failed";
  disabled?: boolean;
};

const nodeIcons: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  // Core
  webhook: Webhook, http: Globe, code: Code, filter: Filter, set: Settings,
  database: Database, email: Mail, schedule: Calendar, transform: FileText,
  ifelse: GitMerge, switch: Layers, merge: GitFork, delay: Timer, noOp: Minus,
  // Communication
  slack: MessageSquare, discord: MessageCircle, telegram: Send,
  // Data
  googleSheets: Table2, airtable: Grid3X3, notion: BookOpen,
  // AI
  openai: Sparkles, anthropic: Brain,
  // Developer
  github: Github, jira: SquareKanban,
  // Utility
  rss: Rss, jsonTransform: Braces, math: Calculator, dateTime: CalendarClock, textProcess: Type,
};

const categoryColors: Record<string, { border: string; iconBg: string; iconText: string; pill: string; pillText: string; handle: string }> = {
  trigger: {
    border: "#7c3aed",
    iconBg: "rgba(124,58,237,0.10)",
    iconText: "#7c3aed",
    pill: "rgba(124,58,237,0.10)",
    pillText: "#7c3aed",
    handle: "#7c3aed",
  },
  action: {
    border: "#2563eb",
    iconBg: "rgba(37,99,235,0.10)",
    iconText: "#2563eb",
    pill: "rgba(37,99,235,0.10)",
    pillText: "#2563eb",
    handle: "#2563eb",
  },
  logic: {
    border: "#d97706",
    iconBg: "rgba(217,119,6,0.10)",
    iconText: "#d97706",
    pill: "rgba(217,119,6,0.10)",
    pillText: "#d97706",
    handle: "#d97706",
  },
  integration: {
    border: "#059669",
    iconBg: "rgba(5,150,105,0.10)",
    iconText: "#059669",
    pill: "rgba(5,150,105,0.10)",
    pillText: "#059669",
    handle: "#059669",
  },
};

const statusRing: Record<string, { outline: string; shadow: string }> = {
  running: { outline: "2px solid #3b82f6", shadow: "0 0 0 4px rgba(59,130,246,0.15)" },
  success: { outline: "2px solid #22c55e", shadow: "none" },
  failed: { outline: "2px solid #ef4444", shadow: "none" },
  pending: { outline: "none", shadow: "none" },
};

function getSwitchCasesCount(configuration?: Record<string, unknown>): number {
  if (!configuration?.cases || typeof configuration.cases !== "string") return 2;
  try {
    const cases = JSON.parse(configuration.cases) as unknown[];
    return Array.isArray(cases) ? Math.max(cases.length, 1) : 2;
  } catch {
    return 2;
  }
}

export default function WorkflowNode({ data, selected }: NodeProps<Node<WorkflowNodeData>>) {
  const Icon = nodeIcons[data.nodeType] ?? Settings;
  const colors = categoryColors[data.type] ?? categoryColors.action;
  const ring = data.status ? (statusRing[data.status] ?? statusRing.pending) : { outline: "none", shadow: "none" };

  const cardOutline = selected
    ? `2px solid ${colors.border}`
    : ring.outline;
  const cardShadow = selected
    ? `0 4px 24px rgba(0,0,0,0.13), 0 0 0 3px ${colors.border}33`
    : data.status === "running"
      ? ring.shadow
      : "0 1px 4px rgba(0,0,0,0.07)";

  const isIfElse = data.nodeType === "ifelse";
  const isSwitch = data.nodeType === "switch";
  const switchCount = isSwitch ? getSwitchCasesCount(data.configuration) : 0;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: colors.handle,
          width: 10,
          height: 10,
          border: `2px solid #fff`,
          boxShadow: `0 0 0 1px ${colors.handle}`,
        }}
      />
      <div
        style={{
          minWidth: 200,
          background: "#fff",
          borderRadius: 10,
          border: `1px solid #e5e7eb`,
          outline: cardOutline,
          outlineOffset: -1,
          boxShadow: cardShadow,
          overflow: "hidden",
          display: "flex",
          transition: "box-shadow 0.18s, outline 0.18s",
        }}
        className={data.status === "running" ? "animate-pulse" : ""}
      >
        {/* Left color bar */}
        <div
          style={{
            width: 4,
            background: colors.border,
            flexShrink: 0,
            borderRadius: "10px 0 0 10px",
          }}
        />
        {/* Content */}
        <div style={{ padding: "10px 12px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Icon */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: colors.iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon className="size-4" style={{ color: colors.iconText } as React.CSSProperties} />
            </div>
            {/* Label + badge */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: "#111827",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.4,
                }}
              >
                {data.label ?? data.nodeType}
              </div>
              <span
                style={{
                  display: "inline-block",
                  marginTop: 3,
                  padding: "1px 7px",
                  borderRadius: 999,
                  background: colors.pill,
                  color: colors.pillText,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {data.nodeType}
              </span>
            </div>
          </div>

          {/* If/Else branch labels */}
          {isIfElse && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, gap: 4 }}>
              <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 600, background: "rgba(22,163,74,0.08)", borderRadius: 4, padding: "1px 6px" }}>
                True
              </span>
              <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 600, background: "rgba(220,38,38,0.08)", borderRadius: 4, padding: "1px 6px" }}>
                False
              </span>
            </div>
          )}

          {/* Switch case labels */}
          {isSwitch && switchCount > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
              {Array.from({ length: switchCount }, (_, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 10,
                    color: "#2563eb",
                    fontWeight: 600,
                    background: "rgba(37,99,235,0.08)",
                    borderRadius: 4,
                    padding: "1px 6px",
                  }}
                >
                  {i}
                </span>
              ))}
              <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, background: "rgba(107,114,128,0.08)", borderRadius: 4, padding: "1px 6px" }}>
                default
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Output handles */}
      {isIfElse ? (
        <>
          {/* True handle — bottom left */}
          <Handle
            id="true"
            type="source"
            position={Position.Bottom}
            style={{
              background: "#16a34a",
              width: 10,
              height: 10,
              border: `2px solid #fff`,
              boxShadow: `0 0 0 1px #16a34a`,
              left: "30%",
              transform: "translateX(-50%)",
            }}
          />
          {/* False handle — bottom right */}
          <Handle
            id="false"
            type="source"
            position={Position.Bottom}
            style={{
              background: "#dc2626",
              width: 10,
              height: 10,
              border: `2px solid #fff`,
              boxShadow: `0 0 0 1px #dc2626`,
              left: "70%",
              transform: "translateX(-50%)",
            }}
          />
        </>
      ) : isSwitch ? (
        <>
          {Array.from({ length: switchCount }, (_, i) => {
            const total = switchCount + 1; // +1 for default
            const position = ((i + 1) / (total + 1)) * 100;
            return (
              <Handle
                key={i}
                id={String(i)}
                type="source"
                position={Position.Bottom}
                style={{
                  background: "#2563eb",
                  width: 10,
                  height: 10,
                  border: `2px solid #fff`,
                  boxShadow: `0 0 0 1px #2563eb`,
                  left: `${position}%`,
                  transform: "translateX(-50%)",
                }}
              />
            );
          })}
          {/* Default handle */}
          <Handle
            id="default"
            type="source"
            position={Position.Bottom}
            style={{
              background: "#6b7280",
              width: 10,
              height: 10,
              border: `2px solid #fff`,
              boxShadow: `0 0 0 1px #6b7280`,
              left: `${((switchCount + 1) / (switchCount + 2)) * 100}%`,
              transform: "translateX(-50%)",
            }}
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            background: colors.handle,
            width: 10,
            height: 10,
            border: `2px solid #fff`,
            boxShadow: `0 0 0 1px ${colors.handle}`,
          }}
        />
      )}
    </>
  );
}
