/**
 * Compliance queries — aggregate data for the Compliance Dashboard.
 */
import { query } from "../_generated/server";

/**
 * Returns a summary of audit log activity for the last 30 days.
 * Used by the Compliance Dashboard score cards.
 */
export const getAuditSummary = query({
  args: {},
  handler: async (ctx): Promise<{ count30d: number; lastEventAt: string | null }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { count30d: 0, lastEventAt: null };

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Count audit logs in the last 30 days using the by_timestamp index
    const logs = await ctx.db
      .query("securityAuditLogs")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", cutoff))
      .order("desc")
      .take(8192);

    const lastEventAt = logs.length > 0 ? (logs[0].timestamp ?? null) : null;

    return { count30d: logs.length, lastEventAt };
  },
});
