import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getInternal = internalQuery({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workflowId);
  },
});

// Returns all workflows that are currently marked active.
// Used by the scheduler to find workflows with schedule triggers due to run.
export const listActive = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("workflows")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});
