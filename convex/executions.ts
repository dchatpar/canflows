import { v } from "convex/values";
import { query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

export const list = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"executions">;
    _creationTime: number;
    workflowId: Id<"workflows">;
    status: "running" | "success" | "failed" | "cancelled";
    startedAt: string;
    finishedAt?: string;
    error?: string;
    data?: Record<string, unknown>;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    return await ctx.db
      .query("executions")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .order("desc")
      .take(20);
  },
});

export const get = query({
  args: { executionId: v.id("executions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    const execution = await ctx.db.get(args.executionId);
    if (!execution) {
      throw new ConvexError({ message: "Execution not found", code: "NOT_FOUND" });
    }

    return execution;
  },
});

export const getLogs = query({
  args: { executionId: v.id("executions") },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"executionLogs">;
    _creationTime: number;
    executionId: Id<"executions">;
    nodeId: Id<"nodes">;
    timestamp: string;
    status: "pending" | "running" | "success" | "failed" | "skipped";
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    return await ctx.db
      .query("executionLogs")
      .withIndex("by_execution", (q) => q.eq("executionId", args.executionId))
      .collect();
  },
});

type RecentExecution = {
  workflowId: Id<"workflows">;
  status: string;
  startedAt: string;
  finishedAt?: string;
};

type StatsResult = {
  total: number;
  success: number;
  failed: number;
  running: number;
  successRate: number;
  recentExecutions: RecentExecution[];
};

export const getStats = query({
  args: {},
  handler: async (ctx): Promise<StatsResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return { total: 0, success: 0, failed: 0, running: 0, successRate: 0, recentExecutions: [] };
    }

    // Get user's workflows (bounded)
    const workflows = await ctx.db
      .query("workflows")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (workflows.length === 0) {
      return { total: 0, success: 0, failed: 0, running: 0, successRate: 0, recentExecutions: [] };
    }

    let total = 0;
    let success = 0;
    let failed = 0;
    let running = 0;
    const allRecent: RecentExecution[] = [];

    // Query executions per workflow (avoid full table scan)
    for (const workflow of workflows) {
      const executions = await ctx.db
        .query("executions")
        .withIndex("by_workflow", (q) => q.eq("workflowId", workflow._id))
        .order("desc")
        .take(10);

      for (const exec of executions) {
        total++;
        if (exec.status === "success") success++;
        else if (exec.status === "failed") failed++;
        else if (exec.status === "running") running++;

        allRecent.push({
          workflowId: exec.workflowId,
          status: exec.status,
          startedAt: exec.startedAt,
          finishedAt: exec.finishedAt,
        });
      }
    }

    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

    // Sort recent by startedAt desc, take 10
    const recentExecutions = allRecent
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 10);

    return { total, success, failed, running, successRate, recentExecutions };
  },
});
