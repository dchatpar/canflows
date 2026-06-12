import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

export const list = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"nodes">;
    _creationTime: number;
    workflowId: Id<"workflows">;
    type: string;
    nodeType: string;
    position: { x: number; y: number };
    configuration?: Record<string, unknown>;
    label?: string;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    return await ctx.db
      .query("nodes")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();
  },
});

export const create = mutation({
  args: {
    workflowId: v.id("workflows"),
    type: v.string(),
    nodeType: v.string(),
    position: v.object({ x: v.number(), y: v.number() }),
    configuration: v.optional(v.any()),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const nodeId = await ctx.db.insert("nodes", {
      workflowId: args.workflowId,
      type: args.type,
      nodeType: args.nodeType,
      position: args.position,
      configuration: args.configuration,
      label: args.label,
    });

    return nodeId;
  },
});

export const update = mutation({
  args: {
    nodeId: v.id("nodes"),
    position: v.optional(v.object({ x: v.number(), y: v.number() })),
    configuration: v.optional(v.any()),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const node = await ctx.db.get(args.nodeId);
    if (!node) {
      throw new ConvexError({
        message: "Node not found",
        code: "NOT_FOUND",
      });
    }

    const updates: Record<string, unknown> = {};
    if (args.position !== undefined) updates.position = args.position;
    if (args.configuration !== undefined)
      updates.configuration = args.configuration;
    if (args.label !== undefined) updates.label = args.label;

    await ctx.db.patch(args.nodeId, updates);
  },
});

export const remove = mutation({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const node = await ctx.db.get(args.nodeId);
    if (!node) {
      throw new ConvexError({
        message: "Node not found",
        code: "NOT_FOUND",
      });
    }

    // Delete all connections involving this node
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_workflow", (q) => q.eq("workflowId", node.workflowId))
      .collect();

    for (const connection of connections) {
      if (
        connection.sourceNodeId === args.nodeId ||
        connection.targetNodeId === args.nodeId
      ) {
        await ctx.db.delete(connection._id);
      }
    }

    await ctx.db.delete(args.nodeId);
  },
});
