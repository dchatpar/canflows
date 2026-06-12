import { v, ConvexError } from "convex/values";
import { query, mutation, action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

/** List credentials for the current user — never returns encryptedData */
export const list = query({
  args: {},
  handler: async (ctx): Promise<{ _id: Id<"credentials">; name: string; type: string; createdAt: string; updatedAt: string }[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    const rows = await ctx.db
      .query("credentials")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return rows.map(({ _id, name, type, createdAt, updatedAt }) => ({
      _id,
      name,
      type,
      createdAt,
      updatedAt,
    }));
  },
});

/** Create a new credential. `data` is serialized to JSON as encryptedData.
 *  NOTE: encryptedData stores the JSON-serialized credential fields.
 *  In a production system this should be encrypted with a KMS before storage. */
export const create = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const now = new Date().toISOString();
    const encryptedData = JSON.stringify(args.data);

    return await ctx.db.insert("credentials", {
      userId: user._id,
      name: args.name,
      type: args.type,
      encryptedData,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Update an existing credential. Only the owner may update. */
export const update = mutation({
  args: {
    credentialId: v.id("credentials"),
    name: v.optional(v.string()),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const credential = await ctx.db.get(args.credentialId);
    if (!credential) throw new ConvexError({ message: "Credential not found", code: "NOT_FOUND" });
    if (credential.userId !== user._id) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });

    const patch: Partial<{ name: string; encryptedData: string; updatedAt: string }> = {
      updatedAt: new Date().toISOString(),
    };
    if (args.name !== undefined) patch.name = args.name;
    if (args.data !== undefined) patch.encryptedData = JSON.stringify(args.data);

    await ctx.db.patch(args.credentialId, patch);
  },
});

/** Delete a credential. Only the owner may delete. */
export const remove = mutation({
  args: { credentialId: v.id("credentials") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const credential = await ctx.db.get(args.credentialId);
    if (!credential) throw new ConvexError({ message: "Credential not found", code: "NOT_FOUND" });
    if (credential.userId !== user._id) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });

    await ctx.db.delete(args.credentialId);
  },
});

// Internal query used by the test action to securely fetch encryptedData
export const getForOwner = internalQuery({
  args: {
    credentialId: v.id("credentials"),
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();
    if (!user) return null;
    const credential = await ctx.db.get(args.credentialId);
    if (!credential || credential.userId !== user._id) return null;
    return credential;
  },
});

/** Test a credential. For most types, validates required fields are present.
 *  For oauth2ClientCredentials, attempts a real token endpoint request. */
export const test = action({
  args: { credentialId: v.id("credentials") },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const credential = await ctx.runQuery(internal.credentials.getForOwner, {
      credentialId: args.credentialId,
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!credential) {
      return { success: false, message: "Credential not found or access denied" };
    }

    let data: Record<string, string>;
    try {
      data = JSON.parse(credential.encryptedData) as Record<string, string>;
    } catch {
      return { success: false, message: "Credential data is corrupted" };
    }

    switch (credential.type) {
      case "apiKey":
        if (!data.key || !data.value) return { success: false, message: "Missing key or value" };
        return { success: true, message: "API Key credential is valid" };
      case "bearerToken":
        if (!data.token) return { success: false, message: "Missing token" };
        return { success: true, message: "Bearer Token credential is valid" };
      case "basicAuth":
        if (!data.username || !data.password) return { success: false, message: "Missing username or password" };
        return { success: true, message: "Basic Auth credential is valid" };
      case "httpHeader":
        if (!data.headerName || !data.headerValue) return { success: false, message: "Missing header name or value" };
        return { success: true, message: "HTTP Header credential is valid" };
      case "oauth2ClientCredentials": {
        if (!data.tokenUrl || !data.clientId || !data.clientSecret) {
          return { success: false, message: "Missing tokenUrl, clientId, or clientSecret" };
        }
        try {
          const body = new URLSearchParams({
            grant_type: "client_credentials",
            client_id: data.clientId,
            client_secret: data.clientSecret,
            ...(data.scope ? { scope: data.scope } : {}),
          });
          const res = await fetch(data.tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
          });
          if (res.ok) return { success: true, message: "OAuth2 token request succeeded" };
          return { success: false, message: `Token endpoint returned ${res.status}` };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          return { success: false, message: `Request failed: ${msg}` };
        }
      }
      default:
        return { success: false, message: "Unknown credential type" };
    }
  },
});
