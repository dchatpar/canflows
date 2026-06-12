import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Runs every minute to check for scheduled workflows that are due to execute.
crons.interval(
  "check-scheduled-workflows",
  { minutes: 1 },
  internal.scheduler.checkAndRunScheduledWorkflows
);

// Runs every 15 minutes to detect SLA breaches and trigger escalations.
crons.interval(
  "sla-breach-check",
  { minutes: 15 },
  internal.sla.checkBreaches
);

export default crons;
