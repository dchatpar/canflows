/**
 * tenants.ts — Multi-tenancy CRUD and membership management.
 * Super Admin can manage all tenants.
 * Org Admin can manage their own tenant.
 */
import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import {
  getCurrentUserOrThrow,
  requireSuperAdmin,
  requireAdmin,
} from "./authHelpers";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/** List all tenants (Super Admin only). */
export const listAll = query({
  args: {},
  handler: async (ctx): Promise<{
    _id: Id<"tenants">;
    name: string;
    slug: string;
    description?: string;
    primaryColor?: string;
    logoUrl?: string;
    createdAt: string;
    memberCount: number;
  }[]> => {
    await requireSuperAdmin(ctx);
    const tenants = await ctx.db.query("tenants").collect();
    return Promise.all(
      tenants.map(async (t) => {
        const members = await ctx.db
          .query("tenantMemberships")
          .withIndex("by_tenant", (q) => q.eq("tenantId", t._id))
          .collect();
        return { ...t, memberCount: members.length };
      }),
    );
  },
});

/** List tenants the current user belongs to. */
export const listMine = query({
  args: {},
  handler: async (ctx): Promise<{
    _id: Id<"tenants">;
    name: string;
    slug: string;
    description?: string;
    primaryColor?: string;
    logoUrl?: string;
    role: string;
  }[]> => {
    const user = await getCurrentUserOrThrow(ctx);
    // Super admin sees all
    if (user.role === "super_admin") {
      const tenants = await ctx.db.query("tenants").collect();
      return tenants.map((t) => ({ ...t, role: "super_admin" }));
    }
    const memberships = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return Promise.all(
      memberships.map(async (m) => {
        const tenant = await ctx.db.get(m.tenantId);
        if (!tenant) return null;
        return { ...tenant, role: m.role };
      }),
    ).then((r) => r.filter((x): x is NonNullable<typeof x> => x !== null));
  },
});

/** Get one tenant by slug (any authenticated user who is a member, or super admin). */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args): Promise<{
    _id: Id<"tenants">;
    name: string;
    slug: string;
    description?: string;
    primaryColor?: string;
    logoUrl?: string;
    createdAt: string;
    updatedAt: string;
    role: string;
    members: {
      _id: Id<"tenantMemberships">;
      userId: Id<"users">;
      name?: string;
      email?: string;
      role: string;
      invitedAt: string;
    }[];
  } | null> => {
    const user = await getCurrentUserOrThrow(ctx);
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!tenant) return null;

    // Check access
    let effectiveRole = user.role;
    if (user.role !== "super_admin") {
      const membership = await ctx.db
        .query("tenantMemberships")
        .withIndex("by_tenant_and_user", (q) =>
          q.eq("tenantId", tenant._id).eq("userId", user._id),
        )
        .unique();
      if (!membership) throw new ConvexError({ message: "Not a member of this tenant", code: "FORBIDDEN" });
      effectiveRole = membership.role;
    }

    const memberships = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
      .collect();

    const members = await Promise.all(
      memberships.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return {
          _id: m._id,
          userId: m.userId,
          name: u?.name,
          email: u?.email,
          role: m.role,
          invitedAt: m.invitedAt,
        };
      }),
    );

    return { ...tenant, role: effectiveRole, members };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Create a new tenant (Super Admin only). */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"tenants">> => {
    const user = await requireSuperAdmin(ctx);
    const slug = (args.slug ?? toSlug(args.name));
    if (!slug) throw new ConvexError({ message: "Invalid tenant name/slug", code: "BAD_REQUEST" });

    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) throw new ConvexError({ message: `Slug "${slug}" is already taken`, code: "CONFLICT" });

    const now = new Date().toISOString();
    const tenantId = await ctx.db.insert("tenants", {
      name: args.name,
      slug,
      description: args.description,
      primaryColor: args.primaryColor,
      logoUrl: args.logoUrl,
      createdAt: now,
      updatedAt: now,
      createdBy: user._id,
    });

    // Creator automatically gets org_admin membership
    await ctx.db.insert("tenantMemberships", {
      tenantId,
      userId: user._id,
      role: "org_admin",
      invitedAt: now,
      invitedBy: user._id,
    });

    return tenantId;
  },
});

/** Update tenant details (Super Admin or Org Admin of that tenant). */
export const update = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await getCurrentUserOrThrow(ctx);
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new ConvexError({ message: "Tenant not found", code: "NOT_FOUND" });

    if (user.role !== "super_admin") {
      await requireAdmin(ctx);
      const membership = await ctx.db
        .query("tenantMemberships")
        .withIndex("by_tenant_and_user", (q) =>
          q.eq("tenantId", args.tenantId).eq("userId", user._id),
        )
        .unique();
      if (!membership || membership.role !== "org_admin") {
        throw new ConvexError({ message: "Not an admin of this tenant", code: "FORBIDDEN" });
      }
    }

    const patch: Record<string, string | undefined> = { updatedAt: new Date().toISOString() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    if (args.primaryColor !== undefined) patch.primaryColor = args.primaryColor;
    if (args.logoUrl !== undefined) patch.logoUrl = args.logoUrl;
    await ctx.db.patch(args.tenantId, patch);
  },
});

/** Delete tenant and all memberships (Super Admin only). */
export const remove = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<void> => {
    await requireSuperAdmin(ctx);
    const memberships = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    for (const m of memberships) {
      await ctx.db.delete(m._id);
    }
    await ctx.db.delete(args.tenantId);
  },
});

// ─── Membership mutations ─────────────────────────────────────────────────────

/** Add or update a user's membership in a tenant (Super Admin or tenant Org Admin). */
export const upsertMembership = mutation({
  args: {
    tenantId: v.id("tenants"),
    userId: v.id("users"),
    role: v.union(
      v.literal("org_admin"),
      v.literal("form_designer"),
      v.literal("reviewer"),
      v.literal("public"),
    ),
  },
  handler: async (ctx, args): Promise<void> => {
    const actor = await getCurrentUserOrThrow(ctx);
    if (actor.role !== "super_admin") {
      const actorMembership = await ctx.db
        .query("tenantMemberships")
        .withIndex("by_tenant_and_user", (q) =>
          q.eq("tenantId", args.tenantId).eq("userId", actor._id),
        )
        .unique();
      if (!actorMembership || actorMembership.role !== "org_admin") {
        throw new ConvexError({ message: "Not an admin of this tenant", code: "FORBIDDEN" });
      }
    }

    const existing = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant_and_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.userId),
      )
      .unique();

    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role });
    } else {
      await ctx.db.insert("tenantMemberships", {
        tenantId: args.tenantId,
        userId: args.userId,
        role: args.role,
        invitedAt: now,
        invitedBy: actor._id,
      });
    }
  },
});

/** Remove a user from a tenant. */
export const removeMembership = mutation({
  args: {
    tenantId: v.id("tenants"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<void> => {
    const actor = await getCurrentUserOrThrow(ctx);
    if (actor.role !== "super_admin") {
      const actorMembership = await ctx.db
        .query("tenantMemberships")
        .withIndex("by_tenant_and_user", (q) =>
          q.eq("tenantId", args.tenantId).eq("userId", actor._id),
        )
        .unique();
      if (!actorMembership || actorMembership.role !== "org_admin") {
        throw new ConvexError({ message: "Not an admin of this tenant", code: "FORBIDDEN" });
      }
    }

    const membership = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant_and_user", (q) =>
        q.eq("tenantId", args.tenantId).eq("userId", args.userId),
      )
      .unique();
    if (!membership) throw new ConvexError({ message: "Membership not found", code: "NOT_FOUND" });
    await ctx.db.delete(membership._id);
  },
});
