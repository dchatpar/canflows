/**
 * submissions.ts — Public form submission logic, draft save/resume,
 * and submission history queries.
 */
import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

// ─── Reference number generator ───────────────────────────────────────────────

function generateRefNumber(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CF-${year}-${suffix}`;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Get published schema for a form — public, no auth required. */
export const getPublishedForm = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args): Promise<{
    formId: Id<"forms">;
    name: string;
    description?: string;
    schema: string;
    tenantName: string;
    tenantSlug: string;
  } | null> => {
    const form = await ctx.db.get(args.formId);
    if (!form || form.status !== "published" || form.publishedVersion === undefined) {
      return null;
    }
    const version = await ctx.db
      .query("formVersions")
      .withIndex("by_form_and_version", (q) =>
        q.eq("formId", args.formId).eq("version", form.publishedVersion!),
      )
      .unique();
    if (!version) return null;

    const tenant = await ctx.db.get(form.tenantId);
    return {
      formId: form._id,
      name: form.name,
      description: form.description,
      schema: version.schema,
      tenantName: tenant?.name ?? "",
      tenantSlug: tenant?.slug ?? "",
    };
  },
});

/** Look up a submission by reference number — public. */
export const getByReference = query({
  args: { referenceNumber: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("submissions")
      .withIndex("by_reference", (q) => q.eq("referenceNumber", args.referenceNumber))
      .unique();
    if (!sub) return null;
    const form = await ctx.db.get(sub.formId);
    return {
      ...sub,
      formName: form?.name ?? "Unknown Form",
    };
  },
});

/** List submissions by the authenticated user. */
export const listMySubmissions = query({
  args: {},
  handler: async (ctx): Promise<{
    _id: Id<"submissions">;
    formId: Id<"forms">;
    formName: string;
    referenceNumber: string;
    status: string;
    submittedAt: string;
    updatedAt: string;
  }[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    const subs = await ctx.db
      .query("submissions")
      .withIndex("by_submitted_by", (q) => q.eq("submittedBy", user._id))
      .order("desc")
      .take(100);

    return Promise.all(
      subs.map(async (s) => {
        const form = await ctx.db.get(s.formId);
        return {
          _id: s._id,
          formId: s.formId,
          formName: form?.name ?? "Unknown Form",
          referenceNumber: s.referenceNumber,
          status: s.status,
          submittedAt: s.submittedAt,
          updatedAt: s.updatedAt,
        };
      }),
    );
  },
});

/** Get a single submission detail (submitter or staff). */
export const getSubmissionDetail = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) return null;
    const form = await ctx.db.get(sub.formId);
    // Allow if owner or tenant member
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const isOwner = sub.submittedBy === user._id;
    const membership = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant_and_user", (q) =>
        q.eq("tenantId", sub.tenantId).eq("userId", user._id),
      )
      .unique();
    const isMember = !!membership || user.role === "super_admin";

    if (!isOwner && !isMember) return null;

    return { ...sub, formName: form?.name ?? "Unknown" };
  },
});

/** Get draft for resume. */
export const getDraft = query({
  args: { formId: v.id("forms"), draftKey: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("submissionDrafts")
      .withIndex("by_form_and_key", (q) =>
        q.eq("formId", args.formId).eq("draftKey", args.draftKey),
      )
      .unique();
  },
});

/** List submissions for a tenant (staff view). */
export const listByTenant = query({
  args: {
    tenantId: v.id("tenants"),
    formId: v.optional(v.id("forms")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    _id: Id<"submissions">;
    formId: Id<"forms">;
    formName: string;
    referenceNumber: string;
    status: string;
    contactName?: string;
    contactEmail?: string;
    submittedAt: string;
    updatedAt: string;
  }[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    if (user.role !== "super_admin") {
      const membership = await ctx.db
        .query("tenantMemberships")
        .withIndex("by_tenant_and_user", (q) =>
          q.eq("tenantId", args.tenantId).eq("userId", user._id),
        )
        .unique();
      if (!membership) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    }

    let subs = await ctx.db
      .query("submissions")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(200);

    if (args.formId) subs = subs.filter((s) => s.formId === args.formId);
    if (args.status) subs = subs.filter((s) => s.status === args.status);

    return Promise.all(
      subs.map(async (s) => {
        const form = await ctx.db.get(s.formId);
        return {
          _id: s._id,
          formId: s.formId,
          formName: form?.name ?? "Unknown",
          referenceNumber: s.referenceNumber,
          status: s.status,
          contactName: s.contactName,
          contactEmail: s.contactEmail,
          submittedAt: s.submittedAt,
          updatedAt: s.updatedAt,
        };
      }),
    );
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Submit a form (public — auth optional). */
export const submit = mutation({
  args: {
    formId: v.id("forms"),
    data: v.string(),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    draftKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ referenceNumber: string; submissionId: Id<"submissions"> }> => {
    const form = await ctx.db.get(args.formId);
    if (!form || form.status !== "published" || form.publishedVersion === undefined) {
      throw new ConvexError({ message: "Form is not accepting submissions", code: "BAD_REQUEST" });
    }

    // Optional auth
    const identity = await ctx.auth.getUserIdentity();
    let userId: Id<"users"> | undefined;
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
      userId = user?._id;
    }

    const now = new Date().toISOString();
    const refNumber = generateRefNumber();

    const submissionId = await ctx.db.insert("submissions", {
      formId: args.formId,
      tenantId: form.tenantId,
      formVersion: form.publishedVersion,
      referenceNumber: refNumber,
      data: args.data,
      status: "submitted",
      submittedBy: userId,
      contactName: args.contactName,
      contactEmail: args.contactEmail,
      submittedAt: now,
      updatedAt: now,
    });

    // Clean up draft if provided
    if (args.draftKey) {
      const draft = await ctx.db
        .query("submissionDrafts")
        .withIndex("by_form_and_key", (q) =>
          q.eq("formId", args.formId).eq("draftKey", args.draftKey!),
        )
        .unique();
      if (draft) await ctx.db.delete(draft._id);
    }

    return { referenceNumber: refNumber, submissionId };
  },
});

/** Trigger linked workflows after a submission is created.
 *  Called client-side immediately after submit(), passing the returned submissionId.
 */
export const triggerLinkedWorkflows = mutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args): Promise<void> => {
    await ctx.scheduler.runAfter(0, internal.formIntegrations.triggerWorkflowsForSubmission, {
      submissionId: args.submissionId,
    });
  },
});

/** Save/update a draft (public — auth optional). */
export const saveDraft = mutation({
  args: {
    formId: v.id("forms"),
    draftKey: v.string(),
    data: v.string(),
    currentPage: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const now = new Date().toISOString();
    const identity = await ctx.auth.getUserIdentity();
    let userId: Id<"users"> | undefined;
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
      userId = user?._id;
    }

    const existing = await ctx.db
      .query("submissionDrafts")
      .withIndex("by_form_and_key", (q) =>
        q.eq("formId", args.formId).eq("draftKey", args.draftKey),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        data: args.data,
        currentPage: args.currentPage,
        updatedAt: now,
        ...(userId ? { submittedBy: userId } : {}),
      });
    } else {
      await ctx.db.insert("submissionDrafts", {
        formId: args.formId,
        draftKey: args.draftKey,
        data: args.data,
        currentPage: args.currentPage,
        submittedBy: userId,
        updatedAt: now,
      });
    }
  },
});
