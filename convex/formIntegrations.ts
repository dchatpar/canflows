/**
 * formIntegrations.ts — Link forms to workflows, auto-trigger on submission,
 * field variable mapping, and run history.
 */
import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel.d.ts";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireTenantStaff(
  ctx: QueryCtx | MutationCtx,
  tenantId: Id<"tenants">,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
  if (user.role === "super_admin") return user;
  const membership = await ctx.db
    .query("tenantMemberships")
    .withIndex("by_tenant_and_user", (q) =>
      q.eq("tenantId", tenantId).eq("userId", user._id),
    )
    .unique();
  if (!membership) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
  return user;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** List all workflow links for a form. */
export const listLinks = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args): Promise<Array<Doc<"formWorkflowLinks"> & {
    workflowName: string;
    runCount: number;
  }>> => {
    const form = await ctx.db.get(args.formId);
    if (!form) return [];
    await requireTenantStaff(ctx, form.tenantId);

    const links = await ctx.db
      .query("formWorkflowLinks")
      .withIndex("by_form", (q) => q.eq("formId", args.formId))
      .collect();

    return Promise.all(
      links.map(async (link) => {
        const workflow = await ctx.db.get(link.workflowId);
        const runs = await ctx.db
          .query("formWorkflowRuns")
          .withIndex("by_link", (q) => q.eq("linkId", link._id))
          .collect();
        return {
          ...link,
          workflowName: workflow?.name ?? "Unknown workflow",
          runCount: runs.length,
        };
      }),
    );
  },
});

/** Get run history for a submission. */
export const listRunsForSubmission = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"formWorkflowRuns">;
    linkId: Id<"formWorkflowLinks">;
    executionId: Id<"executions">;
    workflowName: string;
    workflowId: Id<"workflows">;
    status: string;
    triggeredAt: string;
    completedAt?: string;
    error?: string;
  }>> => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) return [];
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const runs = await ctx.db
      .query("formWorkflowRuns")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .order("desc")
      .take(50);

    return Promise.all(
      runs.map(async (r) => {
        const link = await ctx.db.get(r.linkId);
        const workflow = link ? await ctx.db.get(link.workflowId) : null;
        return {
          _id: r._id,
          linkId: r.linkId,
          executionId: r.executionId,
          workflowName: workflow?.name ?? "Unknown",
          workflowId: link?.workflowId ?? r.linkId as unknown as Id<"workflows">,
          status: r.status,
          triggeredAt: r.triggeredAt,
          completedAt: r.completedAt,
          error: r.error,
        };
      }),
    );
  },
});

/** Recent runs for a form (all submissions). */
export const listRunsForForm = query({
  args: { formId: v.id("forms"), numItems: v.optional(v.number()) },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"formWorkflowRuns">;
    executionId: Id<"executions">;
    workflowName: string;
    workflowId: Id<"workflows">;
    submissionRef: string;
    status: string;
    triggeredAt: string;
    completedAt?: string;
    error?: string;
  }>> => {
    const form = await ctx.db.get(args.formId);
    if (!form) return [];
    await requireTenantStaff(ctx, form.tenantId);

    const links = await ctx.db
      .query("formWorkflowLinks")
      .withIndex("by_form", (q) => q.eq("formId", args.formId))
      .collect();

    const enriched: {
      linkId: Id<"formWorkflowLinks">;
      workflowId: Id<"workflows">;
      workflowName: string;
      submissionRef: string;
      triggeredAt: string;
      completedAt?: string;
      error?: string;
      _id: Id<"formWorkflowRuns">;
      executionId: Id<"executions">;
      status: string;
      tenantId: Id<"tenants">;
    }[] = [];
    for (const link of links) {
      const workflow = await ctx.db.get(link.workflowId);
      const runs = await ctx.db
        .query("formWorkflowRuns")
        .withIndex("by_link", (q) => q.eq("linkId", link._id))
        .order("desc")
        .take(args.numItems ?? 20);
      for (const r of runs) {
        const sub = await ctx.db.get(r.submissionId);
        enriched.push({
          ...r,
          workflowName: workflow?.name ?? "Unknown",
          workflowId: link.workflowId,
          submissionRef: sub?.referenceNumber ?? "—",
        });
      }
    }

    enriched.sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt));
    return enriched.slice(0, args.numItems ?? 50).map((r) => ({
      _id: r._id,
      executionId: r.executionId,
      workflowName: r.workflowName,
      workflowId: r.workflowId,
      submissionRef: r.submissionRef,
      status: r.status,
      triggeredAt: r.triggeredAt,
      completedAt: r.completedAt,
      error: r.error,
    }));
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Create or update a form→workflow link. */
export const upsertLink = mutation({
  args: {
    linkId: v.optional(v.id("formWorkflowLinks")),
    formId: v.id("forms"),
    workflowId: v.id("workflows"),
    label: v.optional(v.string()),
    isActive: v.boolean(),
    fieldMapping: v.optional(v.string()),
    triggerCondition: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"formWorkflowLinks">> => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError({ message: "Form not found", code: "NOT_FOUND" });
    const user = await requireTenantStaff(ctx, form.tenantId);
    const now = new Date().toISOString();

    const { linkId, ...rest } = args;
    if (linkId) {
      await ctx.db.patch(linkId, { ...rest, updatedAt: now });
      return linkId;
    }
    return ctx.db.insert("formWorkflowLinks", {
      ...rest,
      tenantId: form.tenantId,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Toggle a link active/inactive. */
export const toggleLink = mutation({
  args: { linkId: v.id("formWorkflowLinks"), isActive: v.boolean() },
  handler: async (ctx, args): Promise<void> => {
    const link = await ctx.db.get(args.linkId);
    if (!link) throw new ConvexError({ message: "Link not found", code: "NOT_FOUND" });
    await requireTenantStaff(ctx, link.tenantId);
    await ctx.db.patch(args.linkId, { isActive: args.isActive, updatedAt: new Date().toISOString() });
  },
});

/** Delete a link. */
export const deleteLink = mutation({
  args: { linkId: v.id("formWorkflowLinks") },
  handler: async (ctx, args): Promise<void> => {
    const link = await ctx.db.get(args.linkId);
    if (!link) throw new ConvexError({ message: "Link not found", code: "NOT_FOUND" });
    await requireTenantStaff(ctx, link.tenantId);
    await ctx.db.delete(args.linkId);
  },
});

// ─── Internal: called from submissions.submit ─────────────────────────────────

/**
 * Internal mutation: record a run entry and return the list of active links
 * for a given form submission so the action can trigger executions.
 */
export const getActiveLinksForForm = internalMutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args): Promise<Array<{
    linkId: Id<"formWorkflowLinks">;
    workflowId: Id<"workflows">;
    fieldMapping?: string;
    triggerCondition?: string;
    formData: string;
    referenceNumber: string;
  }>> => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) return [];

    const links = await ctx.db
      .query("formWorkflowLinks")
      .withIndex("by_form", (q) => q.eq("formId", sub.formId))
      .collect();

    return links
      .filter((l) => l.isActive)
      .map((l) => ({
        linkId: l._id,
        workflowId: l.workflowId,
        fieldMapping: l.fieldMapping,
        triggerCondition: l.triggerCondition ?? "always",
        formData: sub.data,
        referenceNumber: sub.referenceNumber,
      }));
  },
});

/** Record a new workflow run initiated from a form submission. */
export const recordRun = internalMutation({
  args: {
    linkId: v.id("formWorkflowLinks"),
    submissionId: v.id("submissions"),
    executionId: v.id("executions"),
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args): Promise<Id<"formWorkflowRuns">> => {
    return ctx.db.insert("formWorkflowRuns", {
      linkId: args.linkId,
      submissionId: args.submissionId,
      executionId: args.executionId,
      tenantId: args.tenantId,
      status: "triggered",
      triggeredAt: new Date().toISOString(),
    });
  },
});

/** Update a run record status after execution completes/fails. */
export const updateRunStatus = internalMutation({
  args: {
    runId: v.id("formWorkflowRuns"),
    status: v.union(
      v.literal("triggered"),
      v.literal("running"),
      v.literal("success"),
      v.literal("failed"),
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.runId, {
      status: args.status,
      completedAt: new Date().toISOString(),
      error: args.error,
    });
  },
});

// ─── Internal Action: trigger workflows for a submission ─────────────────────

/**
 * Called after a new submission is created. Resolves active links, injects
 * field-mapped variables as triggerData, and fires executeWorkflow for each.
 */
export const triggerWorkflowsForSubmission = internalAction({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args): Promise<void> => {
    const links = await ctx.runMutation(
      internal.formIntegrations.getActiveLinksForForm,
      { submissionId: args.submissionId },
    );

    for (const link of links) {
      // Build triggerData: start from full form data, then apply field mapping
      let triggerData: Record<string, unknown> = {
        referenceNumber: link.referenceNumber,
        submissionId: args.submissionId,
      };

      try {
        const rawData = JSON.parse(link.formData) as Record<string, unknown>;

        if (link.fieldMapping) {
          const mapping = JSON.parse(link.fieldMapping) as Record<string, string>;
          for (const [fieldId, varKey] of Object.entries(mapping)) {
            triggerData[varKey] = rawData[fieldId];
          }
        } else {
          // No mapping — pass all form fields through directly
          triggerData = { ...rawData, ...triggerData };
        }
      } catch {
        // Bad JSON — pass minimal data
      }

      // Check triggerCondition
      const condition = link.triggerCondition ?? "always";
      if (condition !== "always") {
        // For now, "always" is the only supported value; skip others
        continue;
      }

      try {
        // Fire the workflow — it creates and returns the execution record
        const executionId = await ctx.runAction(internal.executeInternal.executeWorkflowInternal, {
          workflowId: link.workflowId,
          triggerType: "form_submission",
          triggerData,
        });

        // Get the submission's tenantId
        const sub = await ctx.runMutation(internal.formIntegrations.getSubmissionTenant, {
          submissionId: args.submissionId,
        });

        // Record the run
        const runId = await ctx.runMutation(
          internal.formIntegrations.recordRun,
          {
            linkId: link.linkId,
            submissionId: args.submissionId,
            executionId,
            tenantId: sub.tenantId,
          },
        );

        await ctx.runMutation(internal.formIntegrations.updateRunStatus, {
          runId,
          status: "success",
        });
      } catch (e) {
        console.error("[formIntegrations] Failed to trigger workflow:", e);
      }
    }
  },
});

/** Internal query to get a submission's tenantId. */
export const getSubmissionTenant = internalMutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args): Promise<{ tenantId: Id<"tenants"> }> => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) throw new ConvexError({ message: "Submission not found", code: "NOT_FOUND" });
    return { tenantId: sub.tenantId };
  },
});
