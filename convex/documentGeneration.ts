import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function requireTenantMember(ctx: QueryCtx | MutationCtx, tenantId: Id<"tenants">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

  if (user.role === "super_admin") return user;

  const membership = await ctx.db
    .query("tenantMemberships")
    .withIndex("by_tenant_and_user", (q) =>
      q.eq("tenantId", tenantId).eq("userId", user._id)
    )
    .unique();
  if (!membership) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });

  return user;
}

// ── Template CRUD ─────────────────────────────────────────────────────────────

export const listTemplates = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMember(ctx, args.tenantId);
    return ctx.db
      .query("docTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const createTemplate = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    format: v.union(v.literal("pdf"), v.literal("docx")),
    content: v.string(),
    mergeFields: v.string(),
    linkedFormIds: v.array(v.id("forms")),
  },
  handler: async (ctx, args): Promise<Id<"docTemplates">> => {
    const user = await requireTenantMember(ctx, args.tenantId);
    return ctx.db.insert("docTemplates", {
      tenantId: args.tenantId,
      createdBy: user._id,
      name: args.name,
      description: args.description,
      format: args.format,
      content: args.content,
      mergeFields: args.mergeFields,
      linkedFormIds: args.linkedFormIds,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
});

export const updateTemplate = mutation({
  args: {
    templateId: v.id("docTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
    mergeFields: v.optional(v.string()),
    linkedFormIds: v.optional(v.array(v.id("forms"))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new ConvexError({ message: "Template not found", code: "NOT_FOUND" });
    await requireTenantMember(ctx, template.tenantId);
    const { templateId, ...updates } = args;
    await ctx.db.patch(templateId, { ...updates, updatedAt: new Date().toISOString() });
  },
});

export const deleteTemplate = mutation({
  args: { templateId: v.id("docTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new ConvexError({ message: "Template not found", code: "NOT_FOUND" });
    await requireTenantMember(ctx, template.tenantId);
    await ctx.db.delete(args.templateId);
  },
});

// ── Generated document queries ────────────────────────────────────────────────

export const listGeneratedDocs = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) return [];
    await requireTenantMember(ctx, sub.tenantId);

    const docs = await ctx.db
      .query("generatedDocuments")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .order("desc")
      .take(50);

    return Promise.all(
      docs.map(async (d) => {
        const template = await ctx.db.get(d.templateId);
        return { ...d, templateName: template?.name ?? "Unknown" };
      })
    );
  },
});

export const listGeneratedDocsByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantMember(ctx, args.tenantId);
    const docs = await ctx.db
      .query("generatedDocuments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(100);

    return Promise.all(
      docs.map(async (d) => {
        const [template, submission] = await Promise.all([
          ctx.db.get(d.templateId),
          ctx.db.get(d.submissionId),
        ]);
        return {
          ...d,
          dataUri: undefined, // don't return inline data in list view
          templateName: template?.name ?? "Unknown",
          referenceNumber: submission?.referenceNumber ?? "—",
        };
      })
    );
  },
});

// ── Internal helpers used by the Node action ──────────────────────────────────

export const getSubmissionForPdf = internalQuery({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) return null;
    const form = await ctx.db.get(sub.formId);
    const tenant = await ctx.db.get(sub.tenantId);
    return {
      ...sub,
      formName: form?.name ?? "Unknown",
      tenantName: tenant?.name ?? "Unknown",
      createdById: sub.submittedBy ?? sub.resolvedBy ?? sub.assignedTo,
    };
  },
});

export const getTemplateForPdf = internalQuery({
  args: { templateId: v.id("docTemplates") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.templateId);
  },
});

export const listActiveTemplatesForForm = internalQuery({
  args: { tenantId: v.id("tenants"), formId: v.id("forms") },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("docTemplates")
      .withIndex("by_tenant_and_active", (q) =>
        q.eq("tenantId", args.tenantId).eq("isActive", true)
      )
      .collect();

    // Return templates linked to this form or with no form restriction
    return templates.filter(
      (t) => t.linkedFormIds.length === 0 || t.linkedFormIds.includes(args.formId)
    );
  },
});

export const recordGeneratedDoc = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    submissionId: v.id("submissions"),
    templateId: v.id("docTemplates"),
    filename: v.string(),
    format: v.string(),
    dataUri: v.string(),
    generatorTokenIdentifier: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"generatedDocuments">> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.generatorTokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    // Count existing versions for this submission+template to set version tag
    const existing = await ctx.db
      .query("generatedDocuments")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .collect();
    const versionNum = existing.filter((d) => d.templateId === args.templateId).length + 1;

    return ctx.db.insert("generatedDocuments", {
      tenantId: args.tenantId,
      submissionId: args.submissionId,
      templateId: args.templateId,
      filename: args.filename,
      format: args.format,
      dataUri: args.dataUri,
      generatedBy: user._id,
      generatedAt: new Date().toISOString(),
      version: `v${versionNum}`,
    });
  },
});

export const recordGeneratedDocSystem = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    submissionId: v.id("submissions"),
    templateId: v.id("docTemplates"),
    filename: v.string(),
    format: v.string(),
    dataUri: v.string(),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<Id<"generatedDocuments">> => {
    // Find a system/fallback user in the tenant
    let userId: Id<"users"> | undefined = args.createdBy;
    if (!userId) {
      const members = await ctx.db
        .query("tenantMemberships")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .first();
      userId = members?.userId;
    }
    if (!userId) throw new ConvexError({ message: "No user found for tenant", code: "NOT_FOUND" });

    const existing = await ctx.db
      .query("generatedDocuments")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .collect();
    const versionNum = existing.filter((d) => d.templateId === args.templateId).length + 1;

    return ctx.db.insert("generatedDocuments", {
      tenantId: args.tenantId,
      submissionId: args.submissionId,
      templateId: args.templateId,
      filename: args.filename,
      format: args.format,
      dataUri: args.dataUri,
      generatedBy: userId,
      generatedAt: new Date().toISOString(),
      version: `v${versionNum}`,
    });
  },
});
