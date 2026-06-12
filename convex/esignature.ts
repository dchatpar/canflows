/**
 * eSignature backend — CRUD for signing requests, signers, and audit log.
 */
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not signed in" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User record not found" });
  return user;
}

/** Generate a URL-safe random token (32 hex chars) */
function generateToken(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function addAudit(
  ctx: MutationCtx,
  requestId: Id<"signatureRequests">,
  tenantId: Id<"tenants">,
  event: string,
  description: string,
  signerId?: Id<"signers">,
  ipAddress?: string,
) {
  await ctx.db.insert("signatureAuditLog", {
    requestId,
    tenantId,
    signerId,
    event,
    description,
    ipAddress,
    timestamp: new Date().toISOString(),
  });
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const listRequests = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("expired"),
    )),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const q = ctx.db
      .query("signatureRequests")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId));
    const results = await q.order("desc").take(100);
    if (args.status) return results.filter((r) => r.status === args.status);
    return results;
  },
});

export const getRequest = query({
  args: { requestId: v.id("signatureRequests") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db.get(args.requestId);
  },
});

export const getSigners = query({
  args: { requestId: v.id("signatureRequests") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db
      .query("signers")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .collect();
  },
});

export const getAuditLog = query({
  args: { requestId: v.id("signatureRequests") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db
      .query("signatureAuditLog")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .order("asc")
      .collect();
  },
});

/** Public query — anyone with a valid token can retrieve signer + request */
export const getSignerByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const signer = await ctx.db
      .query("signers")
      .withIndex("by_token", (q) => q.eq("accessToken", args.token))
      .unique();
    if (!signer) return null;
    const request = await ctx.db.get(signer.requestId);
    return { signer, request };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const createRequest = mutation({
  args: {
    tenantId: v.id("tenants"),
    title: v.string(),
    message: v.optional(v.string()),
    submissionId: v.optional(v.id("submissions")),
    generatedDocumentId: v.optional(v.id("generatedDocuments")),
    expiresAt: v.optional(v.string()),
    signers: v.array(v.object({
      name: v.string(),
      email: v.string(),
      order: v.number(),
      role: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = new Date().toISOString();

    const requestId = await ctx.db.insert("signatureRequests", {
      tenantId: args.tenantId,
      createdBy: user._id,
      title: args.title,
      message: args.message,
      submissionId: args.submissionId,
      generatedDocumentId: args.generatedDocumentId,
      status: "draft",
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    // Create signer records
    for (const s of args.signers) {
      await ctx.db.insert("signers", {
        requestId,
        tenantId: args.tenantId,
        name: s.name,
        email: s.email,
        order: s.order,
        role: s.role,
        status: "pending",
        accessToken: generateToken(),
      });
    }

    await addAudit(ctx, requestId, args.tenantId, "created", `Signing request created: "${args.title}"`);
    return requestId;
  },
});

export const sendRequest = mutation({
  args: { requestId: v.id("signatureRequests") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError({ code: "NOT_FOUND", message: "Request not found" });

    const now = new Date().toISOString();
    await ctx.db.patch(args.requestId, { status: "in_progress", updatedAt: now });

    // Mark all signers as "invited"
    const signers = await ctx.db
      .query("signers")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .collect();
    for (const s of signers) {
      await ctx.db.patch(s._id, { status: "invited", invitedAt: now });
    }

    await addAudit(ctx, args.requestId, req.tenantId, "sent", `Signing invitations sent by ${user.name ?? user.email ?? "user"}`);
    return true;
  },
});

export const cancelRequest = mutation({
  args: { requestId: v.id("signatureRequests") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError({ code: "NOT_FOUND", message: "Request not found" });
    await ctx.db.patch(args.requestId, { status: "cancelled", updatedAt: new Date().toISOString() });
    await addAudit(ctx, args.requestId, req.tenantId, "cancelled", `Request cancelled by ${user.name ?? user.email ?? "user"}`);
  },
});

export const deleteRequest = mutation({
  args: { requestId: v.id("signatureRequests") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError({ code: "NOT_FOUND", message: "Request not found" });
    // Delete signers and audit log entries
    const signers = await ctx.db
      .query("signers")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .collect();
    for (const s of signers) await ctx.db.delete(s._id);
    const logs = await ctx.db
      .query("signatureAuditLog")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .collect();
    for (const l of logs) await ctx.db.delete(l._id);
    await ctx.db.delete(args.requestId);
  },
});

/** Called by the public signing portal when a signer views the document */
export const markSignerViewed = mutation({
  args: { token: v.string(), ipAddress: v.optional(v.string()), userAgent: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const signer = await ctx.db
      .query("signers")
      .withIndex("by_token", (q) => q.eq("accessToken", args.token))
      .unique();
    if (!signer) throw new ConvexError({ code: "NOT_FOUND", message: "Invalid token" });
    if (signer.status === "pending" || signer.status === "invited") {
      await ctx.db.patch(signer._id, { status: "viewed", viewedAt: new Date().toISOString(), ipAddress: args.ipAddress, userAgent: args.userAgent });
      const req = await ctx.db.get(signer.requestId);
      if (req) {
        await addAudit(ctx, signer.requestId, req.tenantId, "viewed", `${signer.name} viewed the document`, signer._id, args.ipAddress);
      }
    }
    return true;
  },
});

/** Called when a signer submits their signature */
export const submitSignature = mutation({
  args: {
    token: v.string(),
    signatureData: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const signer = await ctx.db
      .query("signers")
      .withIndex("by_token", (q) => q.eq("accessToken", args.token))
      .unique();
    if (!signer) throw new ConvexError({ code: "NOT_FOUND", message: "Invalid token" });

    const now = new Date().toISOString();
    await ctx.db.patch(signer._id, {
      status: "signed",
      signedAt: now,
      signatureData: args.signatureData,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });

    const req = await ctx.db.get(signer.requestId);
    if (req) {
      await addAudit(ctx, signer.requestId, req.tenantId, "signed", `${signer.name} signed the document`, signer._id, args.ipAddress);

      // Check if all signers have signed — if so, mark request completed
      const allSigners = await ctx.db
        .query("signers")
        .withIndex("by_request", (q) => q.eq("requestId", signer.requestId))
        .collect();
      const allSigned = allSigners.every((s) => s._id === signer._id ? true : s.status === "signed");
      if (allSigned) {
        await ctx.db.patch(signer.requestId, { status: "completed", updatedAt: now });
        await addAudit(ctx, signer.requestId, req.tenantId, "completed", "All parties have signed. Request completed.");
      }
    }
    return true;
  },
});

/** Called when a signer declines to sign */
export const declineSignature = mutation({
  args: {
    token: v.string(),
    reason: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const signer = await ctx.db
      .query("signers")
      .withIndex("by_token", (q) => q.eq("accessToken", args.token))
      .unique();
    if (!signer) throw new ConvexError({ code: "NOT_FOUND", message: "Invalid token" });

    await ctx.db.patch(signer._id, {
      status: "declined",
      declinedAt: new Date().toISOString(),
      declineReason: args.reason,
      ipAddress: args.ipAddress,
    });

    const req = await ctx.db.get(signer.requestId);
    if (req) {
      await addAudit(ctx, signer.requestId, req.tenantId, "declined", `${signer.name} declined to sign${args.reason ? ": " + args.reason : ""}`, signer._id, args.ipAddress);
      // Cancel the request if any signer declines
      await ctx.db.patch(signer.requestId, { status: "cancelled", updatedAt: new Date().toISOString() });
    }
    return true;
  },
});
