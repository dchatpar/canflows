import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";

export const createEvent = internalMutation({
  args: {
    workflowId: v.id("workflows"),
    nodeId: v.id("nodes"),
    method: v.string(),
    headers: v.any(),
    body: v.optional(v.string()),
    queryParams: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"webhookEvents">> => {
    return await ctx.db.insert("webhookEvents", {
      workflowId: args.workflowId,
      nodeId: args.nodeId,
      method: args.method,
      headers: args.headers,
      body: args.body,
      queryParams: args.queryParams,
      receivedAt: new Date().toISOString(),
      processed: false,
    });
  },
});

export const markProcessed = internalMutation({
  args: {
    eventId: v.id("webhookEvents"),
    executionId: v.id("executions"),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.eventId, {
      processed: true,
      executionId: args.executionId,
    });
  },
});
