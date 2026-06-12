/**
 * tasks.ts — Staff task queue: review, claim, assign, bulk ops, comments.
 */
import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel.d.ts";

// Remove the duplicate import below
// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireStaff(
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

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Paginated staff task queue — supports filter/sort. */
export const listTasks = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.optional(v.string()),
    formId: v.optional(v.id("forms")),
    assignedTo: v.optional(v.union(v.id("users"), v.literal("me"), v.literal("unassigned"))),
    priority: v.optional(v.string()),
    cursor: v.optional(v.union(v.string(), v.null())),
    numItems: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    items: {
      _id: Id<"submissions">;
      referenceNumber: string;
      formId: Id<"forms">;
      formName: string;
      status: string;
      priority: string;
      assignedTo?: Id<"users">;
      assigneeName?: string;
      contactName?: string;
      contactEmail?: string;
      submittedAt: string;
      updatedAt: string;
      claimedAt?: string;
    }[];
    isDone: boolean;
    continueCursor: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    if (user.role !== "super_admin") {
      const membership = await ctx.db
        .query("tenantMemberships")
        .withIndex("by_tenant_and_user", (q) =>
          q.eq("tenantId", args.tenantId).eq("userId", user._id),
        )
        .unique();
      if (!membership) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    }

    const pageSize = args.numItems ?? 50;

    // Resolve assignee filter
    let assigneeId: Id<"users"> | "unassigned" | undefined;
    if (args.assignedTo === "me") {
      assigneeId = user._id;
    } else if (args.assignedTo === "unassigned") {
      assigneeId = "unassigned";
    } else if (args.assignedTo) {
      assigneeId = args.assignedTo as Id<"users">;
    }

    // Query with appropriate index
    let baseQuery;
    if (assigneeId && assigneeId !== "unassigned") {
      baseQuery = ctx.db
        .query("submissions")
        .withIndex("by_tenant_and_assignee", (q) =>
          q.eq("tenantId", args.tenantId).eq("assignedTo", assigneeId as Id<"users">),
        );
    } else if (args.status) {
      baseQuery = ctx.db
        .query("submissions")
        .withIndex("by_tenant_and_status", (q) =>
          q.eq("tenantId", args.tenantId).eq("status", args.status! as "submitted" | "under_review" | "approved" | "rejected" | "returned"),
        );
    } else {
      baseQuery = ctx.db
        .query("submissions")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId));
    }

    const result = await baseQuery
      .order("desc")
      .paginate({ numItems: pageSize, cursor: args.cursor ?? null });

    // Post-filter
    let items = result.page;
    if (args.formId) items = items.filter((s) => s.formId === args.formId);
    if (args.priority) items = items.filter((s) => (s.priority ?? "normal") === args.priority);
    if (args.status && !args.status.includes("assigned")) {
      items = items.filter((s) => s.status === args.status);
    }
    if (assigneeId === "unassigned") {
      items = items.filter((s) => !s.assignedTo);
    }

    // Enrich
    const enriched = await Promise.all(
      items.map(async (s) => {
        const form = await ctx.db.get(s.formId);
        let assigneeName: string | undefined;
        if (s.assignedTo) {
          const assignee = await ctx.db.get(s.assignedTo);
          assigneeName = assignee?.name;
        }
        return {
          _id: s._id,
          referenceNumber: s.referenceNumber,
          formId: s.formId,
          formName: form?.name ?? "Unknown",
          status: s.status,
          priority: s.priority ?? "normal",
          assignedTo: s.assignedTo,
          assigneeName,
          contactName: s.contactName,
          contactEmail: s.contactEmail,
          submittedAt: s.submittedAt,
          updatedAt: s.updatedAt,
          claimedAt: s.claimedAt,
        };
      }),
    );

    return {
      items: enriched,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/** Get full detail of a single task/submission for staff. */
export const getTaskDetail = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args): Promise<{
    _id: Id<"submissions">;
    referenceNumber: string;
    formId: Id<"forms">;
    formName: string;
    tenantId: Id<"tenants">;
    status: string;
    priority: string;
    data: string;
    assignedTo?: Id<"users">;
    assigneeName?: string;
    contactName?: string;
    contactEmail?: string;
    notes?: string;
    reviewNote?: string;
    submittedAt: string;
    updatedAt: string;
    resolvedAt?: string;
    resolvedBy?: Id<"users">;
    resolvedByName?: string;
    formVersion: number;
  } | null> => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) return null;
    await requireStaff(ctx, sub.tenantId);

    const form = await ctx.db.get(sub.formId);
    let assigneeName: string | undefined;
    if (sub.assignedTo) {
      const assignee = await ctx.db.get(sub.assignedTo);
      assigneeName = assignee?.name;
    }
    let resolvedByName: string | undefined;
    if (sub.resolvedBy) {
      const resolver = await ctx.db.get(sub.resolvedBy);
      resolvedByName = resolver?.name;
    }

    return {
      _id: sub._id,
      referenceNumber: sub.referenceNumber,
      formId: sub.formId,
      formName: form?.name ?? "Unknown",
      tenantId: sub.tenantId,
      status: sub.status,
      priority: sub.priority ?? "normal",
      data: sub.data,
      assignedTo: sub.assignedTo,
      assigneeName,
      contactName: sub.contactName,
      contactEmail: sub.contactEmail,
      notes: sub.notes,
      reviewNote: sub.reviewNote,
      submittedAt: sub.submittedAt,
      updatedAt: sub.updatedAt,
      resolvedAt: sub.resolvedAt,
      resolvedBy: sub.resolvedBy,
      resolvedByName,
      formVersion: sub.formVersion,
    };
  },
});

/** List comments for a submission (staff sees all; public sees external only). */
export const listComments = query({
  args: {
    submissionId: v.id("submissions"),
    includeInternal: v.boolean(),
  },
  handler: async (ctx, args): Promise<{
    _id: Id<"submissionComments">;
    body: string;
    visibility: string;
    authorId: Id<"users">;
    authorName: string;
    createdAt: string;
    editedAt?: string;
  }[]> => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) return [];

    let comments = await ctx.db
      .query("submissionComments")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .order("asc")
      .collect();

    if (!args.includeInternal) {
      comments = comments.filter((c) => c.visibility === "external");
    }

    return Promise.all(
      comments.map(async (c) => {
        const author = await ctx.db.get(c.authorId);
        return {
          _id: c._id,
          body: c.body,
          visibility: c.visibility,
          authorId: c.authorId,
          authorName: author?.name ?? "Staff",
          createdAt: c.createdAt,
          editedAt: c.editedAt,
        };
      }),
    );
  },
});

/** List tenant members (for assignment picker). */
export const listStaffMembers = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<{ _id: Id<"users">; name: string; role: string }[]> => {
    await requireStaff(ctx, args.tenantId);
    const memberships = await ctx.db
      .query("tenantMemberships")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return { _id: m.userId, name: user?.name ?? "Unknown", role: m.role };
      }),
    );
  },
});

/** Stats for the task queue header. */
export const taskStats = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<{
    submitted: number;
    under_review: number;
    approved: number;
    rejected: number;
    returned: number;
    unassigned: number;
    myTasks: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const all = await ctx.db
      .query("submissions")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return {
      submitted: all.filter((s) => s.status === "submitted").length,
      under_review: all.filter((s) => s.status === "under_review").length,
      approved: all.filter((s) => s.status === "approved").length,
      rejected: all.filter((s) => s.status === "rejected").length,
      returned: all.filter((s) => s.status === "returned").length,
      unassigned: all.filter((s) => !s.assignedTo && s.status !== "approved" && s.status !== "rejected").length,
      myTasks: all.filter((s) => s.assignedTo === user._id).length,
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Claim a task (assign to self). */
export const claimTask = mutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args): Promise<void> => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) throw new ConvexError({ message: "Submission not found", code: "NOT_FOUND" });
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const now = new Date().toISOString();
    await ctx.db.patch(args.submissionId, {
      assignedTo: user._id,
      claimedAt: now,
      updatedAt: now,
      status: sub.status === "submitted" ? "under_review" : sub.status,
    });
  },
});

/** Assign a task to a specific staff member. */
export const assignTask = mutation({
  args: {
    submissionId: v.id("submissions"),
    assigneeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<void> => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) throw new ConvexError({ message: "Submission not found", code: "NOT_FOUND" });
    await requireStaff(ctx, sub.tenantId);
    const now = new Date().toISOString();
    await ctx.db.patch(args.submissionId, {
      assignedTo: args.assigneeId,
      claimedAt: args.assigneeId ? now : undefined,
      updatedAt: now,
    });
  },
});

/** Set priority on a task. */
export const setPriority = mutation({
  args: {
    submissionId: v.id("submissions"),
    priority: v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("urgent"),
    ),
  },
  handler: async (ctx, args): Promise<void> => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    await requireStaff(ctx, sub.tenantId);
    await ctx.db.patch(args.submissionId, {
      priority: args.priority,
      updatedAt: new Date().toISOString(),
    });
  },
});

/** Review action: approve / reject / return / request-more-info. */
export const reviewTask = mutation({
  args: {
    submissionId: v.id("submissions"),
    action: v.union(
      v.literal("approve"),
      v.literal("reject"),
      v.literal("return"),
      v.literal("request_info"),
    ),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) throw new ConvexError({ message: "Submission not found", code: "NOT_FOUND" });
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const statusMap = {
      approve: "approved",
      reject: "rejected",
      return: "returned",
      request_info: "returned",
    } as const;

    const now = new Date().toISOString();
    const isResolved = args.action === "approve" || args.action === "reject";

    await ctx.db.patch(args.submissionId, {
      status: statusMap[args.action],
      reviewNote: args.reviewNote,
      resolvedAt: isResolved ? now : undefined,
      resolvedBy: isResolved ? user._id : undefined,
      updatedAt: now,
    });

    // Add auto comment if note provided
    if (args.reviewNote) {
      await ctx.db.insert("submissionComments", {
        submissionId: args.submissionId,
        tenantId: sub.tenantId,
        authorId: user._id,
        body: args.reviewNote,
        visibility: "external",
        createdAt: now,
      });
    }
  },
});

/** Update internal notes. */
export const updateNotes = mutation({
  args: {
    submissionId: v.id("submissions"),
    notes: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    await requireStaff(ctx, sub.tenantId);
    await ctx.db.patch(args.submissionId, {
      notes: args.notes,
      updatedAt: new Date().toISOString(),
    });
  },
});

/** Add a comment (internal or external). */
export const addComment = mutation({
  args: {
    submissionId: v.id("submissions"),
    body: v.string(),
    visibility: v.union(v.literal("internal"), v.literal("external")),
  },
  handler: async (ctx, args): Promise<Id<"submissionComments">> => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    return ctx.db.insert("submissionComments", {
      submissionId: args.submissionId,
      tenantId: sub.tenantId,
      authorId: user._id,
      body: args.body,
      visibility: args.visibility,
      createdAt: new Date().toISOString(),
    });
  },
});

/** Edit a comment. */
export const editComment = mutation({
  args: {
    commentId: v.id("submissionComments"),
    body: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new ConvexError({ message: "Comment not found", code: "NOT_FOUND" });
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || user._id !== comment.authorId) {
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    }
    await ctx.db.patch(args.commentId, {
      body: args.body,
      editedAt: new Date().toISOString(),
    });
  },
});

/** Bulk operation: assign / set-priority / approve / reject for multiple submissions. */
export const bulkUpdate = mutation({
  args: {
    submissionIds: v.array(v.id("submissions")),
    action: v.union(
      v.literal("assign_me"),
      v.literal("approve"),
      v.literal("reject"),
      v.literal("set_priority"),
    ),
    assigneeId: v.optional(v.id("users")),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("urgent"),
    )),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ updated: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const now = new Date().toISOString();
    let updated = 0;

    for (const id of args.submissionIds) {
      const sub = await ctx.db.get(id);
      if (!sub) continue;

      if (args.action === "assign_me") {
        await ctx.db.patch(id, {
          assignedTo: user._id,
          claimedAt: now,
          status: sub.status === "submitted" ? "under_review" : sub.status,
          updatedAt: now,
        });
      } else if (args.action === "approve") {
        await ctx.db.patch(id, {
          status: "approved",
          reviewNote: args.reviewNote,
          resolvedAt: now,
          resolvedBy: user._id,
          updatedAt: now,
        });
      } else if (args.action === "reject") {
        await ctx.db.patch(id, {
          status: "rejected",
          reviewNote: args.reviewNote,
          resolvedAt: now,
          resolvedBy: user._id,
          updatedAt: now,
        });
      } else if (args.action === "set_priority" && args.priority) {
        await ctx.db.patch(id, { priority: args.priority, updatedAt: now });
      }
      updated++;
    }

    return { updated };
  },
});
