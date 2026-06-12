/**
 * Internal queries for AI Process Intelligence — V8 runtime, no "use node".
 */
import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const getOpenSubmissionsForPrediction = internalQuery({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_tenant_and_status", (q) =>
        q.eq("tenantId", args.tenantId).eq("status", "submitted")
      )
      .take(50);

    const underReview = await ctx.db
      .query("submissions")
      .withIndex("by_tenant_and_status", (q) =>
        q.eq("tenantId", args.tenantId).eq("status", "under_review")
      )
      .take(50);

    const all = [...submissions, ...underReview];

    const results = await Promise.all(
      all.map(async (s) => {
        const form = await ctx.db.get(s.formId);
        const hoursOpen = Math.round(
          (Date.now() - new Date(s.submittedAt).getTime()) / 3600000
        );
        return {
          _id: s._id,
          referenceNumber: s.referenceNumber,
          formName: form?.name ?? "Unknown",
          status: s.status,
          priority: s.priority ?? "normal",
          submittedAt: s.submittedAt,
          hoursOpen,
          slaBreached: s.slaBreached ?? false,
          assignedTo: s.assignedTo ?? null,
        };
      })
    );

    return results.sort((a, b) => b.hoursOpen - a.hoursOpen);
  },
});
