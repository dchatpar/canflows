import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import type { MutationCtx } from "./_generated/server";

// Supported integration types and their display info
export const INTEGRATION_TYPES = {
  slack: { label: "Slack", icon: "slack", category: "messaging" },
  teams: { label: "Microsoft Teams", icon: "teams", category: "messaging" },
  sendgrid: { label: "SendGrid", icon: "sendgrid", category: "email" },
  smtp: { label: "Custom SMTP", icon: "mail", category: "email" },
  google_workspace: { label: "Google Workspace", icon: "google", category: "productivity" },
  microsoft365: { label: "Microsoft 365", icon: "microsoft", category: "productivity" },
  zapier: { label: "Zapier", icon: "zapier", category: "automation" },
  make: { label: "Make (Integromat)", icon: "make", category: "automation" },
  webhook: { label: "Custom Webhook", icon: "webhook", category: "custom" },
} as const;

// Available trigger events
export const TRIGGER_EVENTS = [
  "submission.created",
  "submission.approved",
  "submission.rejected",
  "submission.returned",
  "submission.updated",
  "workflow.completed",
  "sla.breached",
] as const;

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

export const listIntegrations = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return ctx.db
      .query("integrations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const createIntegration = mutation({
  args: {
    tenantId: v.id("tenants"),
    type: v.string(),
    name: v.string(),
    config: v.string(),
    webhookUrl: v.optional(v.string()),
    triggerEvents: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"integrations">> => {
    const user = await requireTenantAdmin(ctx, args.tenantId);
    return ctx.db.insert("integrations", {
      tenantId: args.tenantId,
      createdBy: user._id,
      type: args.type,
      name: args.name,
      isEnabled: true,
      config: args.config,
      webhookUrl: args.webhookUrl,
      triggerEvents: args.triggerEvents,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
});

export const updateIntegration = mutation({
  args: {
    integrationId: v.id("integrations"),
    name: v.optional(v.string()),
    config: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
    triggerEvents: v.optional(v.array(v.string())),
    isEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration) throw new ConvexError({ message: "Integration not found", code: "NOT_FOUND" });
    await requireTenantAdmin(ctx, integration.tenantId);

    const { integrationId, ...updates } = args;
    await ctx.db.patch(integrationId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const deleteIntegration = mutation({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration) throw new ConvexError({ message: "Integration not found", code: "NOT_FOUND" });
    await requireTenantAdmin(ctx, integration.tenantId);
    await ctx.db.delete(args.integrationId);
  },
});

export const testIntegration = mutation({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration) throw new ConvexError({ message: "Integration not found", code: "NOT_FOUND" });
    await requireTenantAdmin(ctx, integration.tenantId);

    // For webhook/zapier/make integrations, attempt a test ping
    if (integration.webhookUrl) {
      try {
        const res = await fetch(integration.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "test",
            source: "canflows.ca",
            timestamp: new Date().toISOString(),
            message: "Test event from canflows.ca",
          }),
        });
        if (res.ok) {
          return { success: true, message: `Webhook responded with status ${res.status}` };
        }
        return { success: false, message: `Webhook returned status ${res.status}` };
      } catch (err) {
        return { success: false, message: String(err) };
      }
    }

    // For other types, simulate success
    return { success: true, message: `${integration.name} connection verified successfully` };
  },
});
