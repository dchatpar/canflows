/**
 * sla.ts — SLA policy management, per-submission tracking,
 * breach detection, escalation, and compliance metrics.
 */
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel.d.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Priority = "low" | "normal" | "high" | "urgent";

type PriorityOverride = { response: number; resolution: number };

function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();
}

function getDeadlines(
  policy: Doc<"slaPolicies">,
  priority: Priority,
  submittedAt: string,
): { responseDeadline: string; resolutionDeadline: string } {
  let responseHours = policy.responseTargetHours;
  let resolutionHours = policy.resolutionTargetHours;

  if (policy.priorityOverrides) {
    try {
      const overrides = JSON.parse(policy.priorityOverrides) as Record<string, PriorityOverride>;
      const o = overrides[priority];
      if (o) {
        responseHours = o.response;
        resolutionHours = o.resolution;
      }
    } catch { /* ignore */ }
  }

  return {
    responseDeadline: addHours(submittedAt, responseHours),
    resolutionDeadline: addHours(submittedAt, resolutionHours),
  };
}

async function requireStaff(
  ctx: QueryCtx | MutationCtx,
  tenantId: Id<"tenants">,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
  if (user.role === "super_admin") return user;
  const membership = await ctx.db
    .query("tenantMemberships")
    .withIndex("by_tenant_and_user", (q) =>
      q.eq("tenantId", tenantId).eq("userId", user._id),
    )
    .unique();
  if (!membership) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
  return user;
}

// ─── Public Queries ───────────────────────────────────────────────────────────

/** List all SLA policies for a tenant. */
export const listPolicies = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<Doc<"slaPolicies">[]> => {
    await requireStaff(ctx, args.tenantId);
    return ctx.db
      .query("slaPolicies")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

/** Get the default SLA policy for a tenant. */
export const getDefaultPolicy = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<Doc<"slaPolicies"> | null> => {
    return ctx.db
      .query("slaPolicies")
      .withIndex("by_tenant_and_default", (q) =>
        q.eq("tenantId", args.tenantId).eq("isDefault", true),
      )
      .first();
  },
});

/** Get SLA tracking record for a submission. */
export const getTracking = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args): Promise<(Doc<"slaTracking"> & { policyName: string }) | null> => {
    const tracking = await ctx.db
      .query("slaTracking")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .first();
    if (!tracking) return null;
    const policy = await ctx.db.get(tracking.policyId);
    return { ...tracking, policyName: policy?.name ?? "Unknown" };
  },
});

/** SLA compliance metrics for a tenant. */
export const complianceMetrics = query({
  args: {
    tenantId: v.id("tenants"),
    since: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    total: number;
    responseCompliant: number;
    resolutionCompliant: number;
    responseBreached: number;
    resolutionBreached: number;
    responseCompliancePct: number;
    resolutionCompliancePct: number;
    avgResolutionHours: number;
    overdueCount: number;
    atRiskCount: number;
    byPriority: Record<string, { total: number; breached: number }>;
  }> => {
    await requireStaff(ctx, args.tenantId);

    const allTracking = await ctx.db
      .query("slaTracking")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const since = args.since ? new Date(args.since).getTime() : 0;
    const filtered = since
      ? allTracking.filter((t) => new Date(t.createdAt).getTime() >= since)
      : allTracking;

    const now = new Date().toISOString();
    const total = filtered.length;
    const responseBreached = filtered.filter((t) => t.responseBreached).length;
    const resolutionBreached = filtered.filter((t) => t.resolutionBreached).length;
    const responseCompliant = total - responseBreached;
    const resolutionCompliant = total - resolutionBreached;

    // Overdue = not resolved, past deadline
    const overdueCount = filtered.filter(
      (t) => !t.resolvedAt && t.resolutionDeadline < now,
    ).length;

    // At risk = not resolved, within 20% of deadline
    const atRiskCount = filtered.filter((t) => {
      if (t.resolvedAt || t.resolutionDeadline < now) return false;
      const created = new Date(t.createdAt).getTime();
      const deadline = new Date(t.resolutionDeadline).getTime();
      const nowMs = Date.now();
      const totalWindow = deadline - created;
      const elapsed = nowMs - created;
      return totalWindow > 0 && elapsed / totalWindow >= 0.8;
    }).length;

    // Avg resolution hours for resolved items
    const resolved = filtered.filter((t) => t.resolvedAt);
    const avgResolutionHours =
      resolved.length === 0
        ? 0
        : resolved.reduce((acc, t) => {
            const ms = new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime();
            return acc + ms / 3_600_000;
          }, 0) / resolved.length;

    // Enrich with submission priority
    const byPriority: Record<string, { total: number; breached: number }> = {
      urgent: { total: 0, breached: 0 },
      high: { total: 0, breached: 0 },
      normal: { total: 0, breached: 0 },
      low: { total: 0, breached: 0 },
    };

    // batch lookup submissions
    for (const t of filtered) {
      const sub = await ctx.db.get(t.submissionId);
      const p = sub?.priority ?? "normal";
      if (!byPriority[p]) byPriority[p] = { total: 0, breached: 0 };
      byPriority[p].total++;
      if (t.resolutionBreached) byPriority[p].breached++;
    }

    return {
      total,
      responseCompliant,
      resolutionCompliant,
      responseBreached,
      resolutionBreached,
      responseCompliancePct: total === 0 ? 100 : Math.round((responseCompliant / total) * 100),
      resolutionCompliancePct: total === 0 ? 100 : Math.round((resolutionCompliant / total) * 100),
      avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
      overdueCount,
      atRiskCount,
      byPriority,
    };
  },
});

/** List overdue submissions with SLA info. */
export const listOverdue = query({
  args: { tenantId: v.id("tenants"), numItems: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{
    _id: Id<"slaTracking">;
    submissionId: Id<"submissions">;
    referenceNumber: string;
    formName: string;
    priority: string;
    resolutionDeadline: string;
    overdueHours: number;
    assigneeName?: string;
    status: string;
  }[]> => {
    await requireStaff(ctx, args.tenantId);
    const now = new Date().toISOString();

    const all = await ctx.db
      .query("slaTracking")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const overdue = all.filter((t) => !t.resolvedAt && t.resolutionDeadline < now);
    overdue.sort((a, b) => a.resolutionDeadline.localeCompare(b.resolutionDeadline));

    const limit = args.numItems ?? 50;
    return Promise.all(
      overdue.slice(0, limit).map(async (t) => {
        const sub = await ctx.db.get(t.submissionId);
        const form = sub ? await ctx.db.get(sub.formId) : null;
        let assigneeName: string | undefined;
        if (sub?.assignedTo) {
          const u = await ctx.db.get(sub.assignedTo);
          assigneeName = u?.name;
        }
        const overdueHours =
          Math.round(
            ((Date.now() - new Date(t.resolutionDeadline).getTime()) / 3_600_000) * 10,
          ) / 10;
        return {
          _id: t._id,
          submissionId: t.submissionId,
          referenceNumber: sub?.referenceNumber ?? "",
          formName: form?.name ?? "Unknown",
          priority: sub?.priority ?? "normal",
          resolutionDeadline: t.resolutionDeadline,
          overdueHours,
          assigneeName,
          status: sub?.status ?? "unknown",
        };
      }),
    );
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Create or update an SLA policy. */
export const upsertPolicy = mutation({
  args: {
    policyId: v.optional(v.id("slaPolicies")),
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    isDefault: v.boolean(),
    responseTargetHours: v.number(),
    resolutionTargetHours: v.number(),
    priorityOverrides: v.optional(v.string()),
    escalationThresholdPct: v.number(),
    escalationNotifyUserIds: v.array(v.id("users")),
  },
  handler: async (ctx, args): Promise<Id<"slaPolicies">> => {
    const user = await requireStaff(ctx, args.tenantId);
    const now = new Date().toISOString();

    // If setting as default, clear other defaults
    if (args.isDefault) {
      const existing = await ctx.db
        .query("slaPolicies")
        .withIndex("by_tenant_and_default", (q) =>
          q.eq("tenantId", args.tenantId).eq("isDefault", true),
        )
        .collect();
      for (const p of existing) {
        if (p._id !== args.policyId) {
          await ctx.db.patch(p._id, { isDefault: false, updatedAt: now });
        }
      }
    }

    const { policyId, ...rest } = args;
    if (policyId) {
      await ctx.db.patch(policyId, { ...rest, updatedAt: now });
      return policyId;
    }
    return ctx.db.insert("slaPolicies", {
      ...rest,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Delete an SLA policy. */
export const deletePolicy = mutation({
  args: { policyId: v.id("slaPolicies") },
  handler: async (ctx, args): Promise<void> => {
    const policy = await ctx.db.get(args.policyId);
    if (!policy) throw new ConvexError({ message: "Policy not found", code: "NOT_FOUND" });
    await requireStaff(ctx, policy.tenantId);
    await ctx.db.delete(args.policyId);
  },
});

/**
 * Attach an SLA tracking record to a submission.
 * Called from submissions.submit or manually by staff.
 */
export const attachSla = mutation({
  args: {
    submissionId: v.id("submissions"),
    policyId: v.optional(v.id("slaPolicies")),
  },
  handler: async (ctx, args): Promise<Id<"slaTracking"> | null> => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) throw new ConvexError({ message: "Submission not found", code: "NOT_FOUND" });

    // Find policy
    let policy: Doc<"slaPolicies"> | null = null;
    if (args.policyId) {
      policy = await ctx.db.get(args.policyId);
    } else {
      policy = await ctx.db
        .query("slaPolicies")
        .withIndex("by_tenant_and_default", (q) =>
          q.eq("tenantId", sub.tenantId).eq("isDefault", true),
        )
        .first();
    }

    if (!policy) return null; // No SLA configured

    const priority = (sub.priority ?? "normal") as Priority;
    const { responseDeadline, resolutionDeadline } = getDeadlines(policy, priority, sub.submittedAt);
    const now = new Date().toISOString();

    const trackingId = await ctx.db.insert("slaTracking", {
      submissionId: sub._id,
      tenantId: sub.tenantId,
      policyId: policy._id,
      responseDeadline,
      resolutionDeadline,
      responseBreached: false,
      resolutionBreached: false,
      escalationSent: false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(sub._id, {
      slaTrackingId: trackingId,
      slaResolutionDeadline: resolutionDeadline,
      slaBreached: false,
    });

    return trackingId;
  },
});

/** Mark SLA as responded (first review action). */
export const markResponded = mutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args): Promise<void> => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub || !sub.slaTrackingId) return;
    const now = new Date().toISOString();
    const tracking = await ctx.db.get(sub.slaTrackingId);
    if (!tracking || tracking.respondedAt) return;
    const responseBreached = now > tracking.responseDeadline;
    await ctx.db.patch(sub.slaTrackingId, {
      respondedAt: now,
      responseBreached,
      updatedAt: now,
    });
  },
});

/** Mark SLA as resolved. */
export const markResolved = mutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args): Promise<void> => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub || !sub.slaTrackingId) return;
    const now = new Date().toISOString();
    const tracking = await ctx.db.get(sub.slaTrackingId);
    if (!tracking || tracking.resolvedAt) return;
    const resolutionBreached = now > tracking.resolutionDeadline;
    await ctx.db.patch(sub.slaTrackingId, {
      resolvedAt: now,
      resolutionBreached,
      updatedAt: now,
    });
    await ctx.db.patch(sub._id, { slaBreached: resolutionBreached });
  },
});

// ─── Internal (cron) ─────────────────────────────────────────────────────────

/** Called by cron every 15 minutes — detects breaches and marks them. */
export const checkBreaches = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ breached: number; escalated: number }> => {
    const now = new Date().toISOString();

    // Find unresolved tracking records past their resolution deadline
    const allTracking = await ctx.db
      .query("slaTracking")
      .order("asc")
      .take(500);

    let breached = 0;
    let escalated = 0;

    for (const t of allTracking) {
      if (t.resolvedAt) continue; // Already resolved

      const updates: Partial<{
        resolutionBreached: boolean;
        responseBreached: boolean;
        escalationSent: boolean;
        updatedAt: string;
      }> = {};
      let changed = false;

      // Check response breach
      if (!t.responseBreached && !t.respondedAt && now > t.responseDeadline) {
        updates.responseBreached = true;
        changed = true;
      }

      // Check resolution breach
      if (!t.resolutionBreached && now > t.resolutionDeadline) {
        updates.resolutionBreached = true;
        breached++;
        changed = true;

        // Mirror on submission
        await ctx.db.patch(t.submissionId, { slaBreached: true });

        // Escalation check
        if (!t.escalationSent) {
          const policy = await ctx.db.get(t.policyId);
          if (policy && policy.escalationThresholdPct > 0) {
            updates.escalationSent = true;
            escalated++;
            // In a real system, trigger email/notification here
          }
        }
      } else if (!t.resolutionBreached && !t.escalationSent) {
        // At-risk check: send escalation when X% of window elapsed
        const policy = await ctx.db.get(t.policyId);
        if (policy && policy.escalationThresholdPct > 0) {
          const created = new Date(t.createdAt).getTime();
          const deadline = new Date(t.resolutionDeadline).getTime();
          const nowMs = Date.now();
          const pctElapsed = ((nowMs - created) / (deadline - created)) * 100;
          if (pctElapsed >= policy.escalationThresholdPct) {
            updates.escalationSent = true;
            escalated++;
            changed = true;
          }
        }
      }

      if (changed) {
        updates.updatedAt = now;
        await ctx.db.patch(t._id, updates);
      }
    }

    return { breached, escalated };
  },
});
