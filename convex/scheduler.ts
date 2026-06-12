import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

// ---------------------------------------------------------------------------
// Interval parsing helpers
// ---------------------------------------------------------------------------

// Parses interval strings like "1m", "5m", "1h", "1d" into milliseconds.
function parseIntervalMs(interval: string): number | null {
  const match = /^(\d+)(m|h|d)$/.exec(interval.trim());
  if (!match) return null;
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case "m": return value * 60 * 1_000;
    case "h": return value * 60 * 60 * 1_000;
    case "d": return value * 24 * 60 * 60 * 1_000;
    default:  return null;
  }
}

// Determines whether a schedule trigger should fire right now, based on:
//   - `interval`: human-readable interval string ("1m", "5m", "1h", "1d")
//   - `cron`: a cron expression (basic support: only minute/hour fields checked)
//   - `lastRunAt`: ISO timestamp of the last execution, or null if never run
//
// Returns true when the trigger is due to fire.
function shouldTriggerNow(
  interval: string | undefined,
  _cron: string | undefined,
  lastRunAt: string | null
): boolean {
  if (!interval && !_cron) return false;

  const now = Date.now();

  if (interval) {
    const intervalMs = parseIntervalMs(interval);
    if (intervalMs === null) return false;

    // Fire if never run, or if enough time has elapsed since last run
    if (!lastRunAt) return true;
    const lastRun = new Date(lastRunAt).getTime();
    return now - lastRun >= intervalMs;
  }

  // Basic cron support: return false for now (full cron parsing requires a library).
  // TODO: integrate a cron-parser library for full cron expression support.
  return false;
}

// ---------------------------------------------------------------------------
// checkAndRunScheduledWorkflows — called every minute by crons.ts
// ---------------------------------------------------------------------------

type ScheduleNodeShape = {
  _id: Id<"nodes">;
  nodeType: string;
  configuration?: Record<string, unknown>;
};

type WorkflowShape = {
  _id: Id<"workflows">;
  isActive: boolean;
  lastScheduledRunAt?: string;
};

export const checkAndRunScheduledWorkflows = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    // Fetch all active workflows
    const activeWorkflows = (await ctx.runQuery(
      internal.workflowsInternal.listActive,
      {}
    )) as WorkflowShape[];

    for (const workflow of activeWorkflows) {
      // Fetch schedule trigger nodes for this workflow
      const nodes = (await ctx.runQuery(internal.nodesInternal.listInternal, {
        workflowId: workflow._id,
      })) as ScheduleNodeShape[];

      const scheduleTriggers = nodes.filter((n) => n.nodeType === "schedule");

      for (const trigger of scheduleTriggers) {
        const config = trigger.configuration;
        if (!config) continue;

        const interval = typeof config.interval === "string" ? config.interval : undefined;
        const cron = typeof config.cron === "string" ? config.cron : undefined;
        const lastRunAt = typeof config.lastRunAt === "string" ? config.lastRunAt : null;

        if (shouldTriggerNow(interval, cron, lastRunAt)) {
          console.log(
            `[scheduler] Triggering workflow ${workflow._id} via schedule node ${trigger._id}`
          );
          await ctx.runAction(internal.executeInternal.executeWorkflowInternal, {
            workflowId: workflow._id,
            triggerNodeId: trigger._id,
            triggerType: "schedule",
            triggerData: { scheduledAt: new Date().toISOString() },
          });
        }
      }
    }
  },
});
