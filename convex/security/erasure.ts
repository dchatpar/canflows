/**
 * Data Erasure Requests — GDPR / PIPEDA right-to-erasure management.
 */
import { v, ConvexError } from "convex/values";
import { query, mutation } from "../_generated/server.js";

// ─── Queries ──────────────────────────────────────────────────────────────────

export const list = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("in_review"),
      v.literal("completed"),
      v.literal("rejected"),
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });

    if (args.status) {
      return ctx.db
        .query("dataErasureRequests")
        .withIndex("by_tenant_and_status", (q) =>
          q.eq("tenantId", args.tenantId).eq("status", args.status!)
        )
        .order("desc")
        .take(100);
    }
    return ctx.db
      .query("dataErasureRequests")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(100);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    subjectEmail: v.string(),
    subjectName: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    return ctx.db.insert("dataErasureRequests", {
      ...args,
      status: "pending",
      requestedAt: new Date().toISOString(),
      createdBy: user._id,
    });
  },
});

export const updateStatus = mutation({
  args: {
    requestId: v.id("dataErasureRequests"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_review"),
      v.literal("completed"),
      v.literal("rejected"),
    ),
    processedNote: v.optional(v.string()),
    erasureSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const { requestId, ...updates } = args;
    const patch: Record<string, unknown> = { ...updates, processedBy: user._id };
    if (args.status === "completed") {
      patch.completedAt = new Date().toISOString();
    }
    await ctx.db.patch(requestId, patch);
  },
});
