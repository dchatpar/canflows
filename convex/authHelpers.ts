/**
 * authHelpers.ts
 * Reusable server-side auth + RBAC helper functions.
 */
import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";

export type Role = "super_admin" | "org_admin" | "form_designer" | "reviewer" | "public";

/** Resolve effective role, defaulting missing field to "public" */
function effectiveRole(role: string | undefined): Role {
  const valid: Role[] = ["super_admin", "org_admin", "form_designer", "reviewer", "public"];
  return valid.includes(role as Role) ? (role as Role) : "public";
}

export async function getCurrentUserOrThrow(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) {
    throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
  }
  return { ...user, role: effectiveRole(user.role) };
}

export async function getCurrentUserMaybe(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) return null;
  return { ...user, role: effectiveRole(user.role) };
}

export async function requireRole(ctx: QueryCtx | MutationCtx, allowedRoles: Role[]) {
  const user = await getCurrentUserOrThrow(ctx);
  if (!allowedRoles.includes(user.role)) {
    throw new ConvexError({ message: "Insufficient permissions", code: "FORBIDDEN" });
  }
  return user;
}

export async function requireSuperAdmin(ctx: QueryCtx | MutationCtx) {
  return requireRole(ctx, ["super_admin"]);
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  return requireRole(ctx, ["super_admin", "org_admin"]);
}

export async function requireDesignerOrAbove(ctx: QueryCtx | MutationCtx) {
  return requireRole(ctx, ["super_admin", "org_admin", "form_designer"]);
}

export async function requireReviewerOrAbove(ctx: QueryCtx | MutationCtx) {
  return requireRole(ctx, ["super_admin", "org_admin", "form_designer", "reviewer"]);
}
