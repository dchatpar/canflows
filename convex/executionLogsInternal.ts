import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";

export const create = internalMutation({
  args: {
    executionId: v.id("executions"),
    nodeId: v.id("nodes"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("success"),
      v.literal("failed")
    ),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"executionLogs">> => {
    const now = new Date().toISOString();
    return await ctx.db.insert("executionLogs", {
      executionId: args.executionId,
      nodeId: args.nodeId,
      timestamp: now,
      status: args.status,
      input: args.input,
      output: args.output,
      error: args.error,
    });
  },
});

export const updateLatest = internalMutation({
  args: {
    executionId: v.id("executions"),
    nodeId: v.id("nodes"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("success"),
      v.literal("failed")
    ),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the most recent log for this node in this execution
    const logs = await ctx.db
      .query("executionLogs")
      .withIndex("by_execution", (q) => q.eq("executionId", args.executionId))
      .collect();

    const nodeLog = logs
      .filter((log) => log.nodeId === args.nodeId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (nodeLog) {
      await ctx.db.patch(nodeLog._id, {
        status: args.status,
        output: args.output,
        error: args.error,
        timestamp: new Date().toISOString(),
      });
    }
  },
});
