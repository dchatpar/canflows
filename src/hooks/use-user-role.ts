import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

export type Role = "super_admin" | "org_admin" | "form_designer" | "reviewer" | "public";
export type UserRole = Role;

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  org_admin: "Org Admin",
  form_designer: "Form Designer",
  reviewer: "Reviewer",
  public: "Public",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Full platform access, manage all tenants and users",
  org_admin: "Manage their tenant, users, forms and workflows",
  form_designer: "Create and edit forms and workflows",
  reviewer: "Review and process submissions",
  public: "Submit forms only (no admin access)",
};

export const ROLE_BADGE_COLORS: Record<Role, string> = {
  super_admin: "bg-red-100 text-red-800 border-red-200",
  org_admin: "bg-orange-100 text-orange-800 border-orange-200",
  form_designer: "bg-blue-100 text-blue-800 border-blue-200",
  reviewer: "bg-green-100 text-green-800 border-green-200",
  public: "bg-gray-100 text-gray-800 border-gray-200",
};

/**
 * Returns the current user's platform-level role.
 * Returns undefined while loading, null if not authenticated.
 */
export function useUserRole(): Role | null | undefined {
  const user = useQuery(api.users.getCurrentUser, {});
  if (user === undefined) return undefined;
  if (user === null) return null;
  return (user.role as Role | undefined) ?? "public";
}
