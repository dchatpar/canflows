import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

// Simple hash matching the one in apiKeys.ts
function hashKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash ^ key.length).toString(16).padStart(8, "0") + key.slice(8, 24);
}

export const validateKey = internalQuery({
  args: { rawKey: v.string(), requiredScope: v.string() },
  handler: async (ctx, args): Promise<{ valid: boolean; tenantId?: Id<"tenants">; error?: string }> => {
    if (!args.rawKey.startsWith("cf_live_")) {
      return { valid: false, error: "Invalid API key format" };
    }

    const keyHash = hashKey(args.rawKey);
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", keyHash))
      .unique();

    if (!apiKey) return { valid: false, error: "Invalid API key" };
    if (apiKey.isRevoked) return { valid: false, error: "API key has been revoked" };
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return { valid: false, error: "API key has expired" };
    }
    if (!apiKey.scopes.includes(args.requiredScope)) {
      return { valid: false, error: `API key does not have required scope: ${args.requiredScope}` };
    }

    return { valid: true, tenantId: apiKey.tenantId };
  },
});

export const listPublishedForms = internalQuery({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("forms")
      .withIndex("by_tenant_and_status", (q) =>
        q.eq("tenantId", args.tenantId).eq("status", "published")
      )
      .take(100);
  },
});

export const listSubmissionsForApi = internalQuery({
  args: {
    tenantId: v.id("tenants"),
    formId: v.optional(v.union(v.id("forms"), v.null())),
    status: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    let submissions;
    if (args.formId) {
      submissions = await ctx.db
        .query("submissions")
        .withIndex("by_form", (q) => q.eq("formId", args.formId as Id<"forms">))
        .take(100);
    } else {
      submissions = await ctx.db
        .query("submissions")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .take(100);
    }

    if (args.status) {
      submissions = submissions.filter((s) => s.status === args.status);
    }

    // Parse data field and sanitize for API response
    return submissions.map((s) => ({
      _id: s._id,
      formId: s.formId,
      tenantId: s.tenantId,
      referenceNumber: s.referenceNumber,
      status: s.status,
      contactName: s.contactName,
      contactEmail: s.contactEmail,
      submittedAt: s.submittedAt,
      updatedAt: s.updatedAt,
      data: (() => {
        try { return JSON.parse(s.data); } catch { return {}; }
      })(),
    }));
  },
});
