import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

export const list = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"connections">;
    _creationTime: number;
    workflowId: Id<"workflows">;
    sourceNodeId: Id<"nodes">;
    targetNodeId: Id<"nodes">;
    sourcePort?: string;
    targetPort?: string;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    return await ctx.db
      .query("connections")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();
  },
});

export const create = mutation({
  args: {
    workflowId: v.id("workflows"),
    sourceNodeId: v.id("nodes"),
    targetNodeId: v.id("nodes"),
    sourcePort: v.optional(v.string()),
    targetPort: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const connectionId = await ctx.db.insert("connections", {
      workflowId: args.workflowId,
      sourceNodeId: args.sourceNodeId,
      targetNodeId: args.targetNodeId,
      sourcePort: args.sourcePort,
      targetPort: args.targetPort,
    });

    return connectionId;
  },
});

export const remove = mutation({
  args: { connectionId: v.id("connections") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new ConvexError({
        message: "Connection not found",
        code: "NOT_FOUND",
      });
    }

    await ctx.db.delete(args.connectionId);
  },
});
