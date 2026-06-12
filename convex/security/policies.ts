/**
 * Security Policies — per-tenant security configuration.
 */
import { v, ConvexError } from "convex/values";
import { query, mutation } from "../_generated/server.js";

// ─── Queries ──────────────────────────────────────────────────────────────────

export const get = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });

    return ctx.db
      .query("securityPolicies")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .unique();
  },
});

// ─── Default policy factory ────────────────────────────────────────────────

const DEFAULT_POLICY = {
  mfaRequired: false,
  sessionTimeoutMinutes: 480,
  ipAllowlist: [] as string[],
  minPasswordLength: 12,
  dataRetentionDays: 2555, // 7 years (Canadian federal standard)
  autoPurgeEnabled: false,
  frameworks: ["pipeda", "protected_b"] as string[],
  ssoEnabled: false,
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const upsert = mutation({
  args: {
    tenantId: v.id("tenants"),
    mfaRequired: v.optional(v.boolean()),
    sessionTimeoutMinutes: v.optional(v.number()),
    ipAllowlist: v.optional(v.array(v.string())),
    minPasswordLength: v.optional(v.number()),
    dataRetentionDays: v.optional(v.number()),
    autoPurgeEnabled: v.optional(v.boolean()),
    frameworks: v.optional(v.array(v.string())),
    ssoEnabled: v.optional(v.boolean()),
    ssoProvider: v.optional(v.union(
      v.literal("azure_ad"),
      v.literal("okta"),
      v.literal("google_workspace"),
      v.literal("saml2"),
      v.literal("oidc"),
    )),
    ssoConfig: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const existing = await ctx.db
      .query("securityPolicies")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .unique();

    const now = new Date().toISOString();
    const { tenantId, ...updates } = args;

    if (existing) {
      await ctx.db.patch(existing._id, { ...updates, updatedAt: now, updatedBy: user._id });
      return existing._id;
    } else {
      return ctx.db.insert("securityPolicies", {
        tenantId,
        ...DEFAULT_POLICY,
        ...updates,
        updatedAt: now,
        updatedBy: user._id,
      });
    }
  },
});
