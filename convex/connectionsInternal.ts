import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const listInternal = internalQuery({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("connections")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();
  },
});
