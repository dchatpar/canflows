/**
 * Security Audit Logs — immutable log ingestion, queries, and export.
 */
import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";

// ─── Internal helper ──────────────────────────────────────────────────────────

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

// ─── Internal write (used by other modules) ───────────────────────────────────

export const writeLog = internalMutation({
  args: {
    tenantId: v.optional(v.id("tenants")),
    actorId: v.optional(v.id("users")),
    actorEmail: v.optional(v.string()),
    actorName: v.optional(v.string()),
    category: v.string(),
    action: v.string(),
    description: v.string(),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    outcome: v.union(v.literal("success"), v.literal("failure"), v.literal("warning")),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("securityAuditLogs", {
      ...args,
      timestamp: new Date().toISOString(),
    });
  },
});

// ─── Public write (from authenticated client) ────────────────────────────────

export const logEvent = mutation({
  args: {
    tenantId: v.optional(v.id("tenants")),
    category: v.string(),
    action: v.string(),
    description: v.string(),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    outcome: v.union(v.literal("success"), v.literal("failure"), v.literal("warning")),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const user = identity
      ? await ctx.db
          .query("users")
          .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
          .unique()
      : null;

    await ctx.db.insert("securityAuditLogs", {
      ...args,
      actorId: user?._id,
      actorEmail: user?.email ?? identity?.email,
      actorName: user?.name ?? identity?.name,
      timestamp: new Date().toISOString(),
    });
  },
});

// ─── Queries ──────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    tenantId: v.optional(v.id("tenants")),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<{
    _id: string;
    tenantId?: string;
    actorId?: string;
    actorEmail?: string;
    actorName?: string;
    category: string;
    action: string;
    description: string;
    resourceType?: string;
    resourceId?: string;
    outcome: "success" | "failure" | "warning";
    ipAddress?: string;
    userAgent?: string;
    metadata?: string;
    timestamp: string;
    _creationTime: number;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });

    const limit = args.limit ?? 100;

    if (args.tenantId) {
      const rows = await ctx.db
        .query("securityAuditLogs")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .order("desc")
        .take(limit);
      if (args.category) return rows.filter((r) => r.category === args.category);
      return rows;
    }

    // Super admin — show all
    const rows = await ctx.db
      .query("securityAuditLogs")
      .order("desc")
      .take(limit);
    if (args.category) return rows.filter((r) => r.category === args.category);
    return rows;
  },
});
