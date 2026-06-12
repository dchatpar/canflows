/**
 * forms.ts — Form CRUD, versioning, and status management.
 */
import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { getCurrentUserOrThrow, requireDesignerOrAbove } from "./authHelpers";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function requireTenantAccess(
  ctx: Parameters<typeof getCurrentUserOrThrow>[0],
  tenantId: Id<"tenants">,
  minRole: "viewer" | "designer" | "admin" = "viewer",
) {
  const user = await getCurrentUserOrThrow(ctx);
  if (user.role === "super_admin") return user;

  const membership = await ctx.db
    .query("tenantMemberships")
    .withIndex("by_tenant_and_user", (q) =>
      q.eq("tenantId", tenantId).eq("userId", user._id),
    )
    .unique();

  if (!membership) {
    throw new ConvexError({ message: "Not a member of this tenant", code: "FORBIDDEN" });
  }

  const roleRank: Record<string, number> = {
    org_admin: 4, form_designer: 3, reviewer: 2, public: 1,
  };
  const required = minRole === "admin" ? 4 : minRole === "designer" ? 3 : 1;
  if ((roleRank[membership.role] ?? 0) < required) {
    throw new ConvexError({ message: "Insufficient permissions", code: "FORBIDDEN" });
  }
  return user;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export const listByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<{
    _id: Id<"forms">;
    name: string;
    description?: string;
    status: string;
    draftVersion: number;
    publishedVersion?: number;
    createdAt: string;
    updatedAt: string;
    createdBy: Id<"users">;
  }[]> => {
    await requireTenantAccess(ctx, args.tenantId);
    return ctx.db
      .query("forms")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) return null;
    await requireTenantAccess(ctx, form.tenantId);
    return form;
  },
});

export const getDraftSchema = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args): Promise<string | null> => {
    const form = await ctx.db.get(args.formId);
    if (!form) return null;
    await requireTenantAccess(ctx, form.tenantId, "designer");
    const version = await ctx.db
      .query("formVersions")
      .withIndex("by_form_and_version", (q) =>
        q.eq("formId", args.formId).eq("version", form.draftVersion),
      )
      .unique();
    return version?.schema ?? null;
  },
});

export const getVersionHistory = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args): Promise<{
    _id: Id<"formVersions">;
    version: number;
    createdAt: string;
    label?: string;
    createdByName?: string;
  }[]> => {
    const form = await ctx.db.get(args.formId);
    if (!form) return [];
    await requireTenantAccess(ctx, form.tenantId, "designer");
    const versions = await ctx.db
      .query("formVersions")
      .withIndex("by_form", (q) => q.eq("formId", args.formId))
      .order("desc")
      .collect();
    return Promise.all(
      versions.map(async (v) => {
        const creator = await ctx.db.get(v.createdBy);
        return { ...v, createdByName: creator?.name };
      }),
    );
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    initialSchema: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"forms">> => {
    const user = await requireTenantAccess(ctx, args.tenantId, "designer");
    const now = new Date().toISOString();

    const formId = await ctx.db.insert("forms", {
      tenantId: args.tenantId,
      name: args.name,
      description: args.description,
      status: "draft",
      draftVersion: 1,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("formVersions", {
      formId,
      version: 1,
      schema: args.initialSchema ?? JSON.stringify({ pages: [{ id: crypto.randomUUID(), title: "Page 1", fields: [] }], settings: {} }),
      createdBy: user._id,
      createdAt: now,
      label: "Initial draft",
    });

    return formId;
  },
});

export const updateMeta = mutation({
  args: {
    formId: v.id("forms"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError({ message: "Form not found", code: "NOT_FOUND" });
    await requireTenantAccess(ctx, form.tenantId, "designer");
    const patch: Record<string, string> = { updatedAt: new Date().toISOString() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    await ctx.db.patch(args.formId, patch);
  },
});

/** Save current draft schema and bump draftVersion. */
export const saveDraft = mutation({
  args: {
    formId: v.id("forms"),
    schema: v.string(),
    versionLabel: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<number> => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError({ message: "Form not found", code: "NOT_FOUND" });
    const user = await requireTenantAccess(ctx, form.tenantId, "designer");

    const newVersion = form.draftVersion + 1;
    const now = new Date().toISOString();

    await ctx.db.insert("formVersions", {
      formId: args.formId,
      version: newVersion,
      schema: args.schema,
      createdBy: user._id,
      createdAt: now,
      label: args.versionLabel,
    });

    await ctx.db.patch(args.formId, {
      draftVersion: newVersion,
      updatedAt: now,
    });

    return newVersion;
  },
});

/** Overwrite existing draft (auto-save without version bump). */
export const autoSave = mutation({
  args: {
    formId: v.id("forms"),
    schema: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError({ message: "Form not found", code: "NOT_FOUND" });
    await requireTenantAccess(ctx, form.tenantId, "designer");

    // Update the current draft version's schema in-place
    const existing = await ctx.db
      .query("formVersions")
      .withIndex("by_form_and_version", (q) =>
        q.eq("formId", args.formId).eq("version", form.draftVersion),
      )
      .unique();

    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, { schema: args.schema });
    }
    await ctx.db.patch(args.formId, { updatedAt: now });
  },
});

/** Publish the current draft version. */
export const publish = mutation({
  args: { formId: v.id("forms") },
  handler: async (ctx, args): Promise<void> => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError({ message: "Form not found", code: "NOT_FOUND" });
    await requireTenantAccess(ctx, form.tenantId, "designer");

    await ctx.db.patch(args.formId, {
      status: "published",
      publishedVersion: form.draftVersion,
      updatedAt: new Date().toISOString(),
    });
  },
});

/** Unpublish (revert to draft). */
export const unpublish = mutation({
  args: { formId: v.id("forms") },
  handler: async (ctx, args): Promise<void> => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError({ message: "Form not found", code: "NOT_FOUND" });
    await requireTenantAccess(ctx, form.tenantId, "designer");

    await ctx.db.patch(args.formId, {
      status: "draft",
      updatedAt: new Date().toISOString(),
    });
  },
});

export const archive = mutation({
  args: { formId: v.id("forms") },
  handler: async (ctx, args): Promise<void> => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError({ message: "Form not found", code: "NOT_FOUND" });
    await requireTenantAccess(ctx, form.tenantId, "designer");
    await ctx.db.patch(args.formId, { status: "archived", updatedAt: new Date().toISOString() });
  },
});

export const remove = mutation({
  args: { formId: v.id("forms") },
  handler: async (ctx, args): Promise<void> => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError({ message: "Form not found", code: "NOT_FOUND" });
    const user = await requireTenantAccess(ctx, form.tenantId, "admin");
    // Only org admins/super admins can delete
    if (user.role !== "super_admin") {
      await requireDesignerOrAbove(ctx);
    }
    // Delete all versions
    const versions = await ctx.db
      .query("formVersions")
      .withIndex("by_form", (q) => q.eq("formId", args.formId))
      .collect();
    for (const v of versions) {
      await ctx.db.delete(v._id);
    }
    await ctx.db.delete(args.formId);
  },
});

export const restoreVersion = mutation({
  args: {
    formId: v.id("forms"),
    versionId: v.id("formVersions"),
  },
  handler: async (ctx, args): Promise<void> => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError({ message: "Form not found", code: "NOT_FOUND" });
    const user = await requireTenantAccess(ctx, form.tenantId, "designer");

    const oldVersion = await ctx.db.get(args.versionId);
    if (!oldVersion) throw new ConvexError({ message: "Version not found", code: "NOT_FOUND" });

    const newVersion = form.draftVersion + 1;
    const now = new Date().toISOString();

    await ctx.db.insert("formVersions", {
      formId: args.formId,
      version: newVersion,
      schema: oldVersion.schema,
      createdBy: user._id,
      createdAt: now,
      label: `Restored from v${oldVersion.version}`,
    });

    await ctx.db.patch(args.formId, {
      draftVersion: newVersion,
      updatedAt: now,
    });
  },
});
