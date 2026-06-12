import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

export const list = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"workflowVariables">;
    _creationTime: number;
    workflowId: Id<"workflows">;
    key: string;
    value: string;
    description?: string;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    return await ctx.db
      .query("workflowVariables")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    workflowId: v.id("workflows"),
    key: v.string(),
    value: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"workflowVariables">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    // Verify workflow ownership
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) {
      throw new ConvexError({ message: "Workflow not found", code: "NOT_FOUND" });
    }

    const existing = await ctx.db
      .query("workflowVariables")
      .withIndex("by_workflow_and_key", (q) =>
        q.eq("workflowId", args.workflowId).eq("key", args.key)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        description: args.description,
      });
      return existing._id;
    }

    return await ctx.db.insert("workflowVariables", {
      workflowId: args.workflowId,
      key: args.key,
      value: args.value,
      description: args.description,
    });
  },
});

export const remove = mutation({
  args: { workflowVariableId: v.id("workflowVariables") },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    const variable = await ctx.db.get(args.workflowVariableId);
    if (!variable) {
      throw new ConvexError({ message: "Variable not found", code: "NOT_FOUND" });
    }

    await ctx.db.delete(args.workflowVariableId);
  },
});
