import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

export const bulkCreateNodes = internalMutation({
  args: {
    workflowId: v.id("workflows"),
    nodes: v.array(v.object({
      type: v.string(),
      nodeType: v.string(),
      position: v.object({ x: v.number(), y: v.number() }),
      configuration: v.optional(v.any()),
      label: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args): Promise<Id<"nodes">[]> => {
    const ids: Id<"nodes">[] = [];
    for (const node of args.nodes) {
      const id = await ctx.db.insert("nodes", {
        workflowId: args.workflowId,
        type: node.type,
        nodeType: node.nodeType,
        position: node.position,
        configuration: node.configuration,
        label: node.label,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const bulkCreateConnections = internalMutation({
  args: {
    workflowId: v.id("workflows"),
    connections: v.array(v.object({
      sourceNodeId: v.id("nodes"),
      targetNodeId: v.id("nodes"),
      sourcePort: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args): Promise<void> => {
    for (const conn of args.connections) {
      await ctx.db.insert("connections", {
        workflowId: args.workflowId,
        sourceNodeId: conn.sourceNodeId,
        targetNodeId: conn.targetNodeId,
        sourcePort: conn.sourcePort,
      });
    }
  },
});

export const clearWorkflowNodes = internalMutation({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args): Promise<void> => {
    const nodes = await ctx.db
      .query("nodes")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();
    for (const node of nodes) {
      await ctx.db.delete(node._id);
    }
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();
    for (const conn of connections) {
      await ctx.db.delete(conn._id);
    }
  },
});
