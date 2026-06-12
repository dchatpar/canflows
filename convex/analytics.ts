/**
 * Analytics & Reporting — aggregated metrics for the CanFlow.ai dashboard.
 * All queries are tenant-scoped and read-only.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not signed in" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User record not found" });
  return user;
}

// ─── Submission Volume ────────────────────────────────────────────────────────

/**
 * Returns daily submission counts for the last N days.
 * We read submissions by tenant (indexed) and bucket by day client-side.
 */
export const submissionVolume = query({
  args: {
    tenantId: v.id("tenants"),
    days: v.number(),
  },
  handler: async (ctx, args): Promise<Array<{ date: string; count: number }>> => {
    await requireUser(ctx);
    const since = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000).toISOString();

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const filtered = submissions.filter((s) => s.submittedAt >= since);

    // Bucket by date (YYYY-MM-DD)
    const buckets: Record<string, number> = {};
    for (let i = args.days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    for (const s of filtered) {
      const day = s.submittedAt.slice(0, 10);
      if (day in buckets) buckets[day]++;
    }

    return Object.entries(buckets).map(([date, count]) => ({ date, count }));
  },
});

// ─── Submission Status Breakdown ──────────────────────────────────────────────

export const submissionStatusBreakdown = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<Array<{ status: string; count: number }>> => {
    await requireUser(ctx);
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const counts: Record<string, number> = {
      submitted: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
      returned: 0,
    };
    for (const s of submissions) {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  },
});

// ─── Top Forms ────────────────────────────────────────────────────────────────

export const topForms = query({
  args: { tenantId: v.id("tenants"), limit: v.number() },
  handler: async (ctx, args): Promise<Array<{ formId: Id<"forms">; formName: string; count: number; approvalRate: number }>> => {
    await requireUser(ctx);
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const formCounts: Record<string, { total: number; approved: number }> = {};
    for (const s of submissions) {
      const id = s.formId;
      if (!formCounts[id]) formCounts[id] = { total: 0, approved: 0 };
      formCounts[id].total++;
      if (s.status === "approved") formCounts[id].approved++;
    }

    const sorted = Object.entries(formCounts)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, args.limit);

    const results = await Promise.all(
      sorted.map(async ([formId, data]) => {
        const form = await ctx.db.get(formId as Id<"forms">);
        return {
          formId: formId as Id<"forms">,
          formName: form?.name ?? "Unknown Form",
          count: data.total,
          approvalRate: data.total > 0 ? Math.round((data.approved / data.total) * 100) : 0,
        };
      })
    );
    return results;
  },
});

// ─── Processing Time ──────────────────────────────────────────────────────────

export const processingTimeMetrics = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<{
    avgHours: number;
    medianHours: number;
    p90Hours: number;
    fastestHours: number;
    slowestHours: number;
  }> => {
    await requireUser(ctx);
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const resolved = submissions.filter((s) => s.resolvedAt);
    if (resolved.length === 0) {
      return { avgHours: 0, medianHours: 0, p90Hours: 0, fastestHours: 0, slowestHours: 0 };
    }

    const hours = resolved.map((s) => {
      const ms = new Date(s.resolvedAt!).getTime() - new Date(s.submittedAt).getTime();
      return ms / (1000 * 3600);
    }).sort((a, b) => a - b);

    const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
    const median = hours[Math.floor(hours.length / 2)];
    const p90 = hours[Math.floor(hours.length * 0.9)];

    return {
      avgHours: Math.round(avg * 10) / 10,
      medianHours: Math.round(median * 10) / 10,
      p90Hours: Math.round(p90 * 10) / 10,
      fastestHours: Math.round(hours[0] * 10) / 10,
      slowestHours: Math.round(hours[hours.length - 1] * 10) / 10,
    };
  },
});

// ─── SLA Compliance ───────────────────────────────────────────────────────────

export const slaComplianceMetrics = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<{
    totalTracked: number;
    responseCompliant: number;
    resolutionCompliant: number;
    responseRate: number;
    resolutionRate: number;
    breachedCount: number;
  }> => {
    await requireUser(ctx);
    const tracking = await ctx.db
      .query("slaTracking")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const total = tracking.length;
    if (total === 0) {
      return { totalTracked: 0, responseCompliant: 0, resolutionCompliant: 0, responseRate: 0, resolutionRate: 0, breachedCount: 0 };
    }

    const responseCompliant = tracking.filter((t) => !t.responseBreached).length;
    const resolutionCompliant = tracking.filter((t) => !t.resolutionBreached).length;
    const breachedCount = tracking.filter((t) => t.resolutionBreached).length;

    return {
      totalTracked: total,
      responseCompliant,
      resolutionCompliant,
      responseRate: Math.round((responseCompliant / total) * 100),
      resolutionRate: Math.round((resolutionCompliant / total) * 100),
      breachedCount,
    };
  },
});

// ─── Reviewer Workload ────────────────────────────────────────────────────────

export const reviewerWorkload = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<Array<{
    userId: Id<"users">;
    name: string;
    email: string;
    assigned: number;
    resolved: number;
    pending: number;
  }>> => {
    await requireUser(ctx);
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const workload: Record<string, { assigned: number; resolved: number }> = {};
    for (const s of submissions) {
      if (!s.assignedTo) continue;
      const id = s.assignedTo;
      if (!workload[id]) workload[id] = { assigned: 0, resolved: 0 };
      workload[id].assigned++;
      if (s.status === "approved" || s.status === "rejected") workload[id].resolved++;
    }

    const results = await Promise.all(
      Object.entries(workload).map(async ([userId, data]) => {
        const user = await ctx.db.get(userId as Id<"users">);
        return {
          userId: userId as Id<"users">,
          name: user?.name ?? "Unknown",
          email: user?.email ?? "",
          assigned: data.assigned,
          resolved: data.resolved,
          pending: data.assigned - data.resolved,
        };
      })
    );

    return results.sort((a, b) => b.assigned - a.assigned);
  },
});

// ─── eSignature Metrics ───────────────────────────────────────────────────────

export const esignatureMetrics = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    declined: number;
    completionRate: number;
    avgSigners: number;
  }> => {
    await requireUser(ctx);
    const requests = await ctx.db
      .query("signatureRequests")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const total = requests.length;
    if (total === 0) {
      return { total: 0, completed: 0, inProgress: 0, declined: 0, completionRate: 0, avgSigners: 0 };
    }

    const completed = requests.filter((r) => r.status === "completed").length;
    const inProgress = requests.filter((r) => r.status === "in_progress").length;
    const declined = requests.filter((r) => r.status === "cancelled").length;

    // Avg signers: sample first 20 requests for performance
    const sample = requests.slice(0, 20);
    let totalSigners = 0;
    for (const req of sample) {
      const signers = await ctx.db
        .query("signers")
        .withIndex("by_request", (q) => q.eq("requestId", req._id))
        .collect();
      totalSigners += signers.length;
    }

    return {
      total,
      completed,
      inProgress,
      declined,
      completionRate: Math.round((completed / total) * 100),
      avgSigners: sample.length > 0 ? Math.round((totalSigners / sample.length) * 10) / 10 : 0,
    };
  },
});

// ─── Priority Breakdown ───────────────────────────────────────────────────────

export const priorityBreakdown = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<Array<{ priority: string; count: number }>> => {
    await requireUser(ctx);
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const counts: Record<string, number> = { urgent: 0, high: 0, normal: 0, low: 0, unset: 0 };
    for (const s of submissions) {
      const p = s.priority ?? "unset";
      counts[p] = (counts[p] ?? 0) + 1;
    }
    return Object.entries(counts).map(([priority, count]) => ({ priority, count }));
  },
});

// ─── Summary KPIs (single query for the overview cards) ──────────────────────

export const summaryKpis = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<{
    totalSubmissions: number;
    openSubmissions: number;
    approvedThisMonth: number;
    avgProcessingHours: number;
    slaComplianceRate: number;
    activeSigningRequests: number;
    formsPublished: number;
  }> => {
    await requireUser(ctx);

    const [submissions, slaTracking, signatureRequests, forms] = await Promise.all([
      ctx.db.query("submissions").withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("slaTracking").withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("signatureRequests").withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId)).collect(),
      ctx.db.query("forms").withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId)).collect(),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const open = submissions.filter((s) => s.status === "submitted" || s.status === "under_review").length;
    const approvedThisMonth = submissions.filter((s) => s.status === "approved" && s.updatedAt >= monthStart).length;

    const resolved = submissions.filter((s) => s.resolvedAt);
    const avgHours = resolved.length > 0
      ? resolved.reduce((acc, s) => {
          return acc + (new Date(s.resolvedAt!).getTime() - new Date(s.submittedAt).getTime()) / 3600000;
        }, 0) / resolved.length
      : 0;

    const slaCompliant = slaTracking.filter((t) => !t.resolutionBreached).length;
    const slaRate = slaTracking.length > 0 ? Math.round((slaCompliant / slaTracking.length) * 100) : 100;

    const activeSigningRequests = signatureRequests.filter((r) => r.status === "in_progress").length;
    const formsPublished = forms.filter((f) => f.status === "published").length;

    return {
      totalSubmissions: submissions.length,
      openSubmissions: open,
      approvedThisMonth,
      avgProcessingHours: Math.round(avgHours * 10) / 10,
      slaComplianceRate: slaRate,
      activeSigningRequests,
      formsPublished,
    };
  },
});
