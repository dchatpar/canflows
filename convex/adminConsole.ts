/**
 * Admin Console — system health, tenant usage, seat management, stuck workflows.
 * All queries require super_admin or org_admin role.
 */
import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server.js";
import { requireAdmin, requireSuperAdmin } from "./authHelpers.js";

// ─── System Health ────────────────────────────────────────────────────────────

export const systemHealth = query({
  args: {},
  handler: async (ctx): Promise<{
    totals: {
      users: number;
      tenants: number;
      forms: number;
      submissions: number;
      workflows: number;
      executions: number;
    };
    executions: {
      running: number;
      success: number;
      failed: number;
      cancelled: number;
      stuckCount: number;
    };
    recentErrors: Array<{
      _id: string;
      workflowId: string;
      status: string;
      startedAt: string;
      error?: string;
    }>;
  }> => {
    await requireAdmin(ctx);

    const [users, tenants, forms, submissions, workflows, executions] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("tenants").collect(),
      ctx.db.query("forms").collect(),
      ctx.db.query("submissions").collect(),
      ctx.db.query("workflows").collect(),
      ctx.db.query("executions").collect(),
    ]);

    const stuckThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago
    const running = executions.filter((e) => e.status === "running");
    const stuck = running.filter((e) => e.startedAt < stuckThreshold);

    const recentErrors = executions
      .filter((e) => e.status === "failed")
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 10)
      .map((e) => ({
        _id: e._id,
        workflowId: e.workflowId,
        status: e.status,
        startedAt: e.startedAt,
        error: e.error,
      }));

    return {
      totals: {
        users: users.length,
        tenants: tenants.length,
        forms: forms.length,
        submissions: submissions.length,
        workflows: workflows.length,
        executions: executions.length,
      },
      executions: {
        running: running.length,
        success: executions.filter((e) => e.status === "success").length,
        failed: executions.filter((e) => e.status === "failed").length,
        cancelled: executions.filter((e) => e.status === "cancelled").length,
        stuckCount: stuck.length,
      },
      recentErrors,
    };
  },
});

// ─── Tenant Usage ─────────────────────────────────────────────────────────────

export const tenantUsage = query({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: string;
    name: string;
    slug: string;
    createdAt: string;
    memberCount: number;
    formCount: number;
    submissionCount: number;
    workflowCount: number;
    publishedFormCount: number;
  }>> => {
    await requireAdmin(ctx);

    const [tenants, memberships, forms, submissions, workflows] = await Promise.all([
      ctx.db.query("tenants").collect(),
      ctx.db.query("tenantMemberships").collect(),
      ctx.db.query("forms").collect(),
      ctx.db.query("submissions").collect(),
      ctx.db.query("workflows").collect(),
    ]);

    return tenants.map((t) => ({
      _id: t._id,
      name: t.name,
      slug: t.slug,
      createdAt: t.createdAt,
      memberCount: memberships.filter((m) => m.tenantId === t._id).length,
      formCount: forms.filter((f) => f.tenantId === t._id).length,
      publishedFormCount: forms.filter((f) => f.tenantId === t._id && f.status === "published").length,
      submissionCount: submissions.filter((s) => s.tenantId === t._id).length,
      workflowCount: workflows.length, // workflows are user-scoped, show total for now
    }));
  },
});

// ─── Stuck Workflow Detection ─────────────────────────────────────────────────

export const stuckExecutions = query({
  args: { thresholdHours: v.optional(v.number()) },
  handler: async (ctx, args): Promise<Array<{
    _id: string;
    workflowId: string;
    workflowName: string;
    startedAt: string;
    runningForMinutes: number;
    error?: string;
  }>> => {
    await requireAdmin(ctx);

    const hours = args.thresholdHours ?? 1;
    const threshold = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const running = await ctx.db
      .query("executions")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .collect();

    const stuck = running.filter((e) => e.startedAt < threshold);

    const result = await Promise.all(
      stuck.map(async (e) => {
        const workflow = await ctx.db.get(e.workflowId);
        const runningForMs = Date.now() - new Date(e.startedAt).getTime();
        return {
          _id: e._id,
          workflowId: e.workflowId,
          workflowName: workflow?.name ?? "Unknown workflow",
          startedAt: e.startedAt,
          runningForMinutes: Math.round(runningForMs / 60000),
          error: e.error,
        };
      })
    );

    return result.sort((a, b) => b.runningForMinutes - a.runningForMinutes);
  },
});

// ─── Admin Override ───────────────────────────────────────────────────────────

export const cancelExecution = mutation({
  args: {
    executionId: v.id("executions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const exec = await ctx.db.get(args.executionId);
    if (!exec) throw new ConvexError({ message: "Execution not found", code: "NOT_FOUND" });
    await ctx.db.patch(args.executionId, {
      status: "cancelled",
      finishedAt: new Date().toISOString(),
      error: args.reason ?? "Cancelled by admin",
    });
  },
});

export const retryExecution = mutation({
  args: { executionId: v.id("executions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const exec = await ctx.db.get(args.executionId);
    if (!exec) throw new ConvexError({ message: "Execution not found", code: "NOT_FOUND" });
    // Reset to running so the scheduler can pick it up
    await ctx.db.patch(args.executionId, {
      status: "running",
      finishedAt: undefined,
      error: undefined,
    });
  },
});

// ─── Seat / License Management ────────────────────────────────────────────────

export const seatSummary = query({
  args: {},
  handler: async (ctx): Promise<{
    totalUsers: number;
    byRole: Record<string, number>;
    tenantSeats: Array<{
      tenantId: string;
      tenantName: string;
      seats: number;
      admins: number;
    }>;
  }> => {
    await requireAdmin(ctx);

    const [users, tenants, memberships] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("tenants").collect(),
      ctx.db.query("tenantMemberships").collect(),
    ]);

    const byRole: Record<string, number> = {};
    for (const u of users) {
      const role = u.role ?? "public";
      byRole[role] = (byRole[role] ?? 0) + 1;
    }

    const tenantSeats = tenants.map((t) => {
      const members = memberships.filter((m) => m.tenantId === t._id);
      const admins = members.filter((m) => m.role === "org_admin").length;
      return { tenantId: t._id, tenantName: t.name, seats: members.length, admins };
    });

    return { totalUsers: users.length, byRole, tenantSeats };
  },
});

// ─── Platform broadcast message ───────────────────────────────────────────────

export const systemMessages = query({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: string;
    message: string;
    severity: string;
    createdAt: string;
    isActive: boolean;
  }>> => {
    await requireAdmin(ctx);
    // Return from audit log as system messages
    const logs = await ctx.db
      .query("securityAuditLogs")
      .withIndex("by_category", (q) => q.eq("category", "admin"))
      .order("desc")
      .take(20);
    return logs.map((l) => ({
      _id: l._id,
      message: l.description,
      severity: l.outcome === "failure" ? "error" : l.outcome === "warning" ? "warning" : "info",
      createdAt: l.timestamp,
      isActive: true,
    }));
  },
});
