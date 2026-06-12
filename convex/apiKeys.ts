import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// Available API scopes
export const API_SCOPES = [
  "forms:read",
  "forms:write",
  "submissions:read",
  "submissions:write",
  "workflows:read",
  "workflows:trigger",
  "tenants:read",
] as const;

// Generate a secure random API key: cf_live_<32 alphanumeric chars>
function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "cf_live_";
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

// Simple deterministic hash for API key lookup
function hashKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash ^ key.length).toString(16).padStart(8, "0") + key.slice(8, 24);
}

async function requireTenantAdmin(ctx: MutationCtx, tenantId: Id<"tenants">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

  const membership = await ctx.db
    .query("tenantMemberships")
    .withIndex("by_tenant_and_user", (q) =>
      q.eq("tenantId", tenantId).eq("userId", user._id)
    )
    .unique();

  const role = membership?.role ?? user.role ?? "public";
  const isAdmin = user.role === "super_admin" || role === "org_admin";
  if (!isAdmin) throw new ConvexError({ message: "Admin access required", code: "FORBIDDEN" });

  return user;
}

async function canViewKeys(ctx: QueryCtx, tenantId: Id<"tenants">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) return false;

  const membership = await ctx.db
    .query("tenantMemberships")
    .withIndex("by_tenant_and_user", (q) =>
      q.eq("tenantId", tenantId).eq("userId", user._id)
    )
    .unique();

  const role = membership?.role ?? user.role ?? "public";
  return user.role === "super_admin" || role === "org_admin";
}

export const listApiKeys = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const allowed = await canViewKeys(ctx, args.tenantId);
    if (!allowed) return [];

    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Never return the hash
    return keys.map(({ keyHash: _keyHash, ...rest }) => rest);
  },
});

export const createApiKey = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    scopes: v.array(v.string()),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ keyId: Id<"apiKeys">; rawKey: string }> => {
    const user = await requireTenantAdmin(ctx, args.tenantId);
    const rawKey = generateApiKey();
    const keyHash = hashKey(rawKey);

    const keyId = await ctx.db.insert("apiKeys", {
      tenantId: args.tenantId,
      createdBy: user._id,
      name: args.name,
      keyHash,
      keySuffix: rawKey.slice(-4),
      scopes: args.scopes,
      expiresAt: args.expiresAt,
      isRevoked: false,
      createdAt: new Date().toISOString(),
    });

    return { keyId, rawKey };
  },
});

export const revokeApiKey = mutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key) throw new ConvexError({ message: "Key not found", code: "NOT_FOUND" });
    await requireTenantAdmin(ctx, key.tenantId);
    await ctx.db.patch(args.keyId, { isRevoked: true });
  },
});

export const deleteApiKey = mutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key) throw new ConvexError({ message: "Key not found", code: "NOT_FOUND" });
    await requireTenantAdmin(ctx, key.tenantId);
    await ctx.db.delete(args.keyId);
  },
});

// Export hash function for use in internal validators
export { hashKey };
