import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

export const list = query({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: Id<"workflows">;
    _creationTime: number;
    name: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }

    return await ctx.db
      .query("workflows")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) {
      throw new ConvexError({ message: "Workflow not found", code: "NOT_FOUND" });
    }

    return workflow;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"workflows">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }

    const now = new Date().toISOString();
    return await ctx.db.insert("workflows", {
      name: args.name,
      description: args.description,
      isActive: false,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    workflowId: v.id("workflows"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) {
      throw new ConvexError({ message: "Workflow not found", code: "NOT_FOUND" });
    }

    const updates: Record<string, string | boolean | undefined> = {
      updatedAt: new Date().toISOString(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.timezone !== undefined) updates.timezone = args.timezone;

    await ctx.db.patch(args.workflowId, updates);
  },
});

export const remove = mutation({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) {
      throw new ConvexError({ message: "Workflow not found", code: "NOT_FOUND" });
    }

    // Delete all nodes
    const nodes = await ctx.db
      .query("nodes")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();
    for (const node of nodes) {
      await ctx.db.delete(node._id);
    }

    // Delete all connections
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();
    for (const connection of connections) {
      await ctx.db.delete(connection._id);
    }

    // Delete workflow variables
    const variables = await ctx.db
      .query("workflowVariables")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();
    for (const variable of variables) {
      await ctx.db.delete(variable._id);
    }

    // Delete workflow
    await ctx.db.delete(args.workflowId);
  },
});

type ExportedNode = {
  tempId: string;
  type: string;
  nodeType: string;
  position: { x: number; y: number };
  label?: string;
  configuration?: Record<string, unknown>;
};

type ExportedConnection = {
  sourceTempId: string;
  targetTempId: string;
  sourcePort?: string;
  targetPort?: string;
};

type WorkflowExport = {
  version: string;
  exportedAt: string;
  workflow: { name: string; description?: string };
  nodes: ExportedNode[];
  connections: ExportedConnection[];
};

export const exportWorkflow = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args): Promise<WorkflowExport> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) {
      throw new ConvexError({ message: "Workflow not found", code: "NOT_FOUND" });
    }

    const nodes = await ctx.db
      .query("nodes")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();

    const connections = await ctx.db
      .query("connections")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();

    // Build nodeId -> tempId (index) map
    const nodeIdToTempId = new Map<string, string>();
    nodes.forEach((node, idx) => {
      nodeIdToTempId.set(node._id, String(idx));
    });

    const exportedNodes: ExportedNode[] = nodes.map((node, idx) => ({
      tempId: String(idx),
      type: node.type,
      nodeType: node.nodeType,
      position: node.position,
      label: node.label,
      configuration: node.configuration as Record<string, unknown> | undefined,
    }));

    const exportedConnections: ExportedConnection[] = connections
      .flatMap((conn) => {
        const sourceTempId = nodeIdToTempId.get(conn.sourceNodeId);
        const targetTempId = nodeIdToTempId.get(conn.targetNodeId);
        if (!sourceTempId || !targetTempId) return [];
        const entry: ExportedConnection = {
          sourceTempId,
          targetTempId,
          sourcePort: conn.sourcePort,
          targetPort: conn.targetPort,
        };
        return [entry];
      });

    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      workflow: {
        name: workflow.name,
        description: workflow.description,
      },
      nodes: exportedNodes,
      connections: exportedConnections,
    };
  },
});

export const importWorkflow = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    nodes: v.array(
      v.object({
        tempId: v.string(),
        type: v.string(),
        nodeType: v.string(),
        position: v.object({ x: v.number(), y: v.number() }),
        label: v.optional(v.string()),
        configuration: v.optional(v.any()),
      })
    ),
    connections: v.array(
      v.object({
        sourceTempId: v.string(),
        targetTempId: v.string(),
        sourcePort: v.optional(v.string()),
        targetPort: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args): Promise<Id<"workflows">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }

    const now = new Date().toISOString();
    const workflowId = await ctx.db.insert("workflows", {
      name: args.name,
      description: args.description,
      isActive: false,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Insert nodes, build tempId -> real nodeId map
    const tempIdToNodeId = new Map<string, Id<"nodes">>();
    for (const node of args.nodes) {
      const nodeId = await ctx.db.insert("nodes", {
        workflowId,
        type: node.type,
        nodeType: node.nodeType,
        position: node.position,
        label: node.label,
        configuration: node.configuration,
      });
      tempIdToNodeId.set(node.tempId, nodeId);
    }

    // Insert connections using mapped node IDs
    for (const conn of args.connections) {
      const sourceNodeId = tempIdToNodeId.get(conn.sourceTempId);
      const targetNodeId = tempIdToNodeId.get(conn.targetTempId);
      if (!sourceNodeId || !targetNodeId) continue;
      await ctx.db.insert("connections", {
        workflowId,
        sourceNodeId,
        targetNodeId,
        sourcePort: conn.sourcePort,
        targetPort: conn.targetPort,
      });
    }

    return workflowId;
  },
});

export const duplicate = mutation({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args): Promise<Id<"workflows">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) {
      throw new ConvexError({ message: "Workflow not found", code: "NOT_FOUND" });
    }

    const nodes = await ctx.db
      .query("nodes")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();

    const connections = await ctx.db
      .query("connections")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();

    const now = new Date().toISOString();
    const newWorkflowId = await ctx.db.insert("workflows", {
      name: `${workflow.name} (copy)`,
      description: workflow.description,
      isActive: false,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
      timezone: workflow.timezone,
      tags: workflow.tags,
    });

    // Create nodes with old -> new ID mapping
    const oldToNewNodeId = new Map<string, Id<"nodes">>();
    for (const node of nodes) {
      const newNodeId = await ctx.db.insert("nodes", {
        workflowId: newWorkflowId,
        type: node.type,
        nodeType: node.nodeType,
        position: node.position,
        label: node.label,
        configuration: node.configuration,
        outputHandles: node.outputHandles,
        disabled: node.disabled,
        notes: node.notes,
      });
      oldToNewNodeId.set(node._id, newNodeId);
    }

    // Create connections using new node IDs
    for (const conn of connections) {
      const newSourceId = oldToNewNodeId.get(conn.sourceNodeId);
      const newTargetId = oldToNewNodeId.get(conn.targetNodeId);
      if (!newSourceId || !newTargetId) continue;
      await ctx.db.insert("connections", {
        workflowId: newWorkflowId,
        sourceNodeId: newSourceId,
        targetNodeId: newTargetId,
        sourcePort: conn.sourcePort,
        targetPort: conn.targetPort,
      });
    }

    return newWorkflowId;
  },
});
