import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow, requireAdmin, requireSuperAdmin } from "./authHelpers";
import { ROLE } from "./schema";
import type { Doc } from "./_generated/dataModel.js";

export type UserRole = "super_admin" | "org_admin" | "form_designer" | "reviewer" | "public";

type StoredUser = Doc<"users">;

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "User not logged in" });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (user !== null) {
      await ctx.db.patch(user._id, {
        name: identity.name ?? user.name,
        email: identity.email ?? user.email,
      });
      return user._id;
    }
    // New user — check if this is the very first user (auto-promote to super_admin)
    const firstUser = await ctx.db.query("users").take(1);
    const role: UserRole = firstUser.length === 0 ? "super_admin" : "public";
    return await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
      role,
    });
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx): Promise<(StoredUser & { role: UserRole }) | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;
    return { ...user, role: (user.role ?? "public") as UserRole };
  },
});

/** Admin: list all users with their roles */
export const listUsers = query({
  args: {},
  handler: async (ctx): Promise<(StoredUser & { role: UserRole })[]> => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({ ...u, role: (u.role ?? "public") as UserRole }));
  },
});

/** Admin: update a user's role */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: ROLE,
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    // Prevent self-demotion from super_admin
    if (actor._id === args.userId && actor.role === "super_admin" && args.role !== "super_admin") {
      throw new ConvexError({ message: "Cannot remove your own Super Admin role", code: "FORBIDDEN" });
    }
    // Only super_admin can grant super_admin
    if (args.role === "super_admin") {
      await requireSuperAdmin(ctx);
    }
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

/** Admin: delete a user */
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    if (actor._id === args.userId) {
      throw new ConvexError({ message: "Cannot delete yourself", code: "FORBIDDEN" });
    }
    await ctx.db.delete(args.userId);
  },
});
