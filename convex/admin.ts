import { query } from "./_generated/server";
import { requireAdmin } from "./authHelpers";

export const getAllUsersActivity = query({
  args: {},
  handler: async (ctx): Promise<{
    users: {
      _id: string;
      name?: string;
      email?: string;
      role: string;
      joinedAt: number;
      workflowCount: number;
      activeWorkflowCount: number;
      totalExecutions: number;
      successfulExecutions: number;
      failedExecutions: number;
      lastActiveAt: string | null;
    }[];
    totals: {
      users: number;
      workflows: number;
      executions: number;
    };
  }> => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    const workflows = await ctx.db.query("workflows").collect();
    const executions = await ctx.db.query("executions").collect();

    const usersActivity = users.map((user) => {
      const userWorkflows = workflows.filter((w) => w.userId === user._id);
      const activeWorkflows = userWorkflows.filter((w) => w.isActive);
      const workflowIds = new Set(userWorkflows.map((w) => w._id));

      const userExecutions = executions.filter((e) => workflowIds.has(e.workflowId));
      const successful = userExecutions.filter((e) => e.status === "success").length;
      const failed = userExecutions.filter((e) => e.status === "failed").length;

      const executionTimes = userExecutions.map((e) => e.startedAt);
      const workflowTimes = userWorkflows.map((w) => w.updatedAt);
      const allTimes = [...executionTimes, ...workflowTimes].sort().reverse();
      const lastActiveAt = allTimes[0] ?? null;

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role ?? "public",
        joinedAt: user._creationTime,
        workflowCount: userWorkflows.length,
        activeWorkflowCount: activeWorkflows.length,
        totalExecutions: userExecutions.length,
        successfulExecutions: successful,
        failedExecutions: failed,
        lastActiveAt,
      };
    });

    usersActivity.sort((a, b) => {
      const aTime = a.lastActiveAt ?? new Date(a.joinedAt).toISOString();
      const bTime = b.lastActiveAt ?? new Date(b.joinedAt).toISOString();
      return bTime.localeCompare(aTime);
    });

    return {
      users: usersActivity,
      totals: {
        users: users.length,
        workflows: workflows.length,
        executions: executions.length,
      },
    };
  },
});
