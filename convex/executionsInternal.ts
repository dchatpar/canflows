import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";

// Creates an execution record that includes trigger provenance metadata.
// Used by internal/webhook/schedule triggers (as opposed to manual `create`).
export const createWithTrigger = internalMutation({
  args: {
    workflowId: v.id("workflows"),
    triggerType: v.optional(v.string()),
    triggerData: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<Id<"executions">> => {
    const now = new Date().toISOString();
    return await ctx.db.insert("executions", {
      workflowId: args.workflowId,
      status: "running",
      startedAt: now,
      triggerType: args.triggerType,
      triggerData: args.triggerData,
    });
  },
});

export const create = internalMutation({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args): Promise<Id<"executions">> => {
    const now = new Date().toISOString();
    return await ctx.db.insert("executions", {
      workflowId: args.workflowId,
      status: "running",
      startedAt: now,
    });
  },
});

export const updateStatus = internalMutation({
  args: {
    executionId: v.id("executions"),
    status: v.union(
      v.literal("running"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    error: v.optional(v.string()),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.patch(args.executionId, {
      status: args.status,
      finishedAt: now,
      error: args.error,
      data: args.data,
    });
  },
});
