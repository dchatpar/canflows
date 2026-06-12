import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const ROLE = v.union(
  v.literal("super_admin"),
  v.literal("org_admin"),
  v.literal("form_designer"),
  v.literal("reviewer"),
  v.literal("public"),
);

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    // Optional to allow existing docs without role to pass schema validation.
    // Default applied in queries/mutations.
    role: v.optional(v.union(
      v.literal("super_admin"),
      v.literal("org_admin"),
      v.literal("form_designer"),
      v.literal("reviewer"),
      v.literal("public"),
    )),
  })
    .index("by_token", ["tokenIdentifier"]),

  workflows: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    userId: v.id("users"),
    createdAt: v.string(),
    updatedAt: v.string(),
    tags: v.optional(v.array(v.string())),
    errorWorkflowId: v.optional(v.id("workflows")),
    timezone: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  nodes: defineTable({
    workflowId: v.id("workflows"),
    type: v.string(),
    nodeType: v.string(),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
    configuration: v.optional(v.any()),
    label: v.optional(v.string()),
    outputHandles: v.optional(v.array(v.string())),
    disabled: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  }).index("by_workflow", ["workflowId"]),

  connections: defineTable({
    workflowId: v.id("workflows"),
    sourceNodeId: v.id("nodes"),
    targetNodeId: v.id("nodes"),
    sourcePort: v.optional(v.string()),
    targetPort: v.optional(v.string()),
  }).index("by_workflow", ["workflowId"]),

  executions: defineTable({
    workflowId: v.id("workflows"),
    status: v.union(
      v.literal("running"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    startedAt: v.string(),
    finishedAt: v.optional(v.string()),
    error: v.optional(v.string()),
    data: v.optional(v.any()),
    triggerType: v.optional(v.string()),
    triggerData: v.optional(v.any()),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_status", ["status"]),

  executionLogs: defineTable({
    executionId: v.id("executions"),
    nodeId: v.id("nodes"),
    timestamp: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  }).index("by_execution", ["executionId"]),

  credentials: defineTable({
    userId: v.id("users"),
    name: v.string(),
    type: v.string(),
    encryptedData: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_user", ["userId"]),

  webhookEvents: defineTable({
    workflowId: v.id("workflows"),
    nodeId: v.id("nodes"),
    method: v.string(),
    headers: v.any(),
    body: v.optional(v.string()),
    queryParams: v.optional(v.string()),
    receivedAt: v.string(),
    processed: v.boolean(),
    executionId: v.optional(v.id("executions")),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_node", ["nodeId"])
    .index("by_node_unprocessed", ["nodeId", "processed"]),

  workflowVariables: defineTable({
    workflowId: v.id("workflows"),
    key: v.string(),
    value: v.string(),
    description: v.optional(v.string()),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_workflow_and_key", ["workflowId", "key"]),

  // ─── Multi-tenancy ────────────────────────────────────────────────────────

  tenants: defineTable({
    name: v.string(),
    /** URL-safe slug, e.g. "health-canada" */
    slug: v.string(),
    description: v.optional(v.string()),
    /** Hex colour for per-tenant accent, e.g. "#c00" */
    primaryColor: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    createdBy: v.id("users"),
  })
    .index("by_slug", ["slug"])
    .index("by_creator", ["createdBy"]),

  tenantMemberships: defineTable({
    tenantId: v.id("tenants"),
    userId: v.id("users"),
    /** Role scoped to this tenant */
    role: v.union(
      v.literal("org_admin"),
      v.literal("form_designer"),
      v.literal("reviewer"),
      v.literal("public"),
    ),
    invitedAt: v.string(),
    invitedBy: v.id("users"),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_user", ["userId"])
    .index("by_tenant_and_user", ["tenantId", "userId"]),

  // ─── Forms ───────────────────────────────────────────────────────────────

  forms: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
    /** Current published version number */
    publishedVersion: v.optional(v.number()),
    /** Current draft version number */
    draftVersion: v.number(),
    createdBy: v.id("users"),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_and_status", ["tenantId", "status"]),

  formVersions: defineTable({
    formId: v.id("forms"),
    version: v.number(),
    /** Full form schema as JSON string */
    schema: v.string(),
    createdBy: v.id("users"),
    createdAt: v.string(),
    label: v.optional(v.string()),
  })
    .index("by_form", ["formId"])
    .index("by_form_and_version", ["formId", "version"]),

  // ─── Submissions ──────────────────────────────────────────────────────────

  submissions: defineTable({
    formId: v.id("forms"),
    tenantId: v.id("tenants"),
    formVersion: v.number(),
    /** Human-readable reference, e.g. CF-2026-A1B2C3 */
    referenceNumber: v.string(),
    /** JSON string: Record<fieldId, unknown> */
    data: v.string(),
    status: v.union(
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("returned"),
    ),
    /** Null for anonymous submissions */
    submittedBy: v.optional(v.id("users")),
    contactEmail: v.optional(v.string()),
    contactName: v.optional(v.string()),
    submittedAt: v.string(),
    updatedAt: v.string(),
    /** Internal staff notes */
    notes: v.optional(v.string()),
    /** Task queue fields */
    assignedTo: v.optional(v.id("users")),
    claimedAt: v.optional(v.string()),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("urgent"),
    )),
    resolvedAt: v.optional(v.string()),
    resolvedBy: v.optional(v.id("users")),
    /** Reason for rejection / return / info request */
    reviewNote: v.optional(v.string()),
    /** SLA tracking reference */
    slaTrackingId: v.optional(v.id("slaTracking")),
    /** Quick-access resolution deadline (ISO string) for index-free sorting */
    slaResolutionDeadline: v.optional(v.string()),
    /** Whether resolution SLA has been breached */
    slaBreached: v.optional(v.boolean()),
  })
    .index("by_form", ["formId"])
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_and_status", ["tenantId", "status"])
    .index("by_tenant_and_assignee", ["tenantId", "assignedTo"])
    .index("by_submitted_by", ["submittedBy"])
    .index("by_reference", ["referenceNumber"]),

  submissionComments: defineTable({
    submissionId: v.id("submissions"),
    tenantId: v.id("tenants"),
    authorId: v.id("users"),
    body: v.string(),
    /** Internal = only staff see it; external = submitter-visible */
    visibility: v.union(v.literal("internal"), v.literal("external")),
    createdAt: v.string(),
    editedAt: v.optional(v.string()),
  })
    .index("by_submission", ["submissionId"])
    .index("by_tenant", ["tenantId"]),

  // ─── Form-Workflow Integration ───────────────────────────────────────────

  /** Links a published form to a workflow that auto-triggers on submission. */
  formWorkflowLinks: defineTable({
    formId: v.id("forms"),
    tenantId: v.id("tenants"),
    workflowId: v.id("workflows"),
    /** Human-readable label for this link */
    label: v.optional(v.string()),
    /** Whether this link is active */
    isActive: v.boolean(),
    /**
     * JSON string mapping form field IDs to workflow variable keys.
     * e.g. {"field_123": "applicant_name", "field_456": "amount"}
     */
    fieldMapping: v.optional(v.string()),
    /**
     * Trigger condition: "always" | "on_status" | expression string.
     * "always" — trigger on every submission
     * "on_status:submitted" — trigger only when submission has given status
     */
    triggerCondition: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_form", ["formId"])
    .index("by_tenant", ["tenantId"])
    .index("by_workflow", ["workflowId"]),

  /** Tracks each time a form submission triggered a workflow execution. */
  formWorkflowRuns: defineTable({
    linkId: v.id("formWorkflowLinks"),
    submissionId: v.id("submissions"),
    executionId: v.id("executions"),
    tenantId: v.id("tenants"),
    status: v.union(
      v.literal("triggered"),
      v.literal("running"),
      v.literal("success"),
      v.literal("failed"),
    ),
    triggeredAt: v.string(),
    completedAt: v.optional(v.string()),
    error: v.optional(v.string()),
  })
    .index("by_submission", ["submissionId"])
    .index("by_link", ["linkId"])
    .index("by_execution", ["executionId"])
    .index("by_tenant", ["tenantId"]),

  // ─── SLA ─────────────────────────────────────────────────────────────────

  /** SLA policy — one per tenant (can be extended to per-form later). */
  slaPolicies: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    isDefault: v.boolean(),
    /** Hours from submission → first response target */
    responseTargetHours: v.number(),
    /** Hours from submission → resolution target */
    resolutionTargetHours: v.number(),
    /** Override targets per priority (JSON string: Record<priority, {response, resolution}>) */
    priorityOverrides: v.optional(v.string()),
    /** Escalate (notify) when SLA is X% breached. 0 = disabled. */
    escalationThresholdPct: v.number(),
    /** User IDs to notify on escalation */
    escalationNotifyUserIds: v.array(v.id("users")),
    createdBy: v.id("users"),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_and_default", ["tenantId", "isDefault"]),

  /** Per-submission SLA tracking record (created on submission). */
  slaTracking: defineTable({
    submissionId: v.id("submissions"),
    tenantId: v.id("tenants"),
    policyId: v.id("slaPolicies"),
    /** ISO deadline for first response */
    responseDeadline: v.string(),
    /** ISO deadline for resolution */
    resolutionDeadline: v.string(),
    /** When first response action was taken */
    respondedAt: v.optional(v.string()),
    /** When submission was resolved (approved/rejected) */
    resolvedAt: v.optional(v.string()),
    /** Whether response SLA was breached */
    responseBreached: v.boolean(),
    /** Whether resolution SLA was breached */
    resolutionBreached: v.boolean(),
    /** Whether escalation notification was already sent */
    escalationSent: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_submission", ["submissionId"])
    .index("by_tenant", ["tenantId"])
    .index("by_resolution_deadline", ["resolutionDeadline"])
    .index("by_tenant_and_breached", ["tenantId", "resolutionBreached"]),

  // ─── API Keys ────────────────────────────────────────────────────────────

  apiKeys: defineTable({
    tenantId: v.id("tenants"),
    createdBy: v.id("users"),
    name: v.string(),
    /** Bcrypt hash of the raw key — never store the raw key */
    keyHash: v.string(),
    /** Last 4 chars of the raw key for display */
    keySuffix: v.string(),
    /** Scopes granted to this key */
    scopes: v.array(v.string()),
    /** Optional expiry ISO string */
    expiresAt: v.optional(v.string()),
    /** Whether revoked */
    isRevoked: v.boolean(),
    lastUsedAt: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_key_hash", ["keyHash"]),

  // ─── Integrations (connectors) ────────────────────────────────────────────

  integrations: defineTable({
    tenantId: v.id("tenants"),
    createdBy: v.id("users"),
    /** e.g. "slack", "teams", "sendgrid", "smtp", "google_workspace", "microsoft365", "zapier", "make" */
    type: v.string(),
    name: v.string(),
    isEnabled: v.boolean(),
    /** JSON string of connector-specific config (tokens stored separately in credentials) */
    config: v.string(),
    /** Optional webhook URL for outbound push */
    webhookUrl: v.optional(v.string()),
    /** Events that trigger this integration */
    triggerEvents: v.array(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_and_type", ["tenantId", "type"]),

  // ─── Document Templates & Generation ─────────────────────────────────────

  /** A reusable document template that can be populated from form data */
  docTemplates: defineTable({
    tenantId: v.id("tenants"),
    createdBy: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    /** "pdf" only for now, "docx" in future */
    format: v.union(v.literal("pdf"), v.literal("docx")),
    /** JSON string: array of template sections/blocks */
    content: v.string(),
    /** JSON string: merge field definitions [{key, label, source}] */
    mergeFields: v.string(),
    /** Forms this template can be used with (empty = any form) */
    linkedFormIds: v.array(v.id("forms")),
    isActive: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_and_active", ["tenantId", "isActive"]),

  /** Generated document records (one per submission per template) */
  generatedDocuments: defineTable({
    tenantId: v.id("tenants"),
    submissionId: v.id("submissions"),
    templateId: v.id("docTemplates"),
    /** Human-readable filename */
    filename: v.string(),
    /** "pdf" | "docx" */
    format: v.string(),
    /** Convex storage ID for the file */
    storageId: v.optional(v.string()),
    /** base64 data URI for small PDFs stored inline */
    dataUri: v.optional(v.string()),
    generatedBy: v.id("users"),
    generatedAt: v.string(),
    /** version tag, e.g. "v1", "v2" */
    version: v.string(),
  })
    .index("by_submission", ["submissionId"])
    .index("by_tenant", ["tenantId"])
    .index("by_template", ["templateId"]),

  // ─── eSignature ──────────────────────────────────────────────────────────

  /** A signing request for a document or submission */
  signatureRequests: defineTable({
    tenantId: v.id("tenants"),
    createdBy: v.id("users"),
    /** Title shown to signers */
    title: v.string(),
    /** Optional message to signers */
    message: v.optional(v.string()),
    /** Submission that generated this request, if any */
    submissionId: v.optional(v.id("submissions")),
    /** Document that needs signing, if any */
    generatedDocumentId: v.optional(v.id("generatedDocuments")),
    /** Overall status of the request */
    status: v.union(
      v.literal("draft"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("expired"),
    ),
    /** ISO expiry date/time */
    expiresAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_submission", ["submissionId"])
    .index("by_tenant_and_status", ["tenantId", "status"]),

  /** Individual signer record within a signing request */
  signers: defineTable({
    requestId: v.id("signatureRequests"),
    tenantId: v.id("tenants"),
    /** Display name */
    name: v.string(),
    email: v.string(),
    /** Signing order (1-based) */
    order: v.number(),
    /** Role label e.g. "Applicant", "Manager", "Witness" */
    role: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("invited"),
      v.literal("viewed"),
      v.literal("signed"),
      v.literal("declined"),
    ),
    /** Secure token for the signing link */
    accessToken: v.string(),
    invitedAt: v.optional(v.string()),
    viewedAt: v.optional(v.string()),
    signedAt: v.optional(v.string()),
    declinedAt: v.optional(v.string()),
    declineReason: v.optional(v.string()),
    /** IP address recorded at signing */
    ipAddress: v.optional(v.string()),
    /** User agent at signing */
    userAgent: v.optional(v.string()),
    /** Base64 data URI of the drawn/typed signature */
    signatureData: v.optional(v.string()),
  })
    .index("by_request", ["requestId"])
    .index("by_token", ["accessToken"])
    .index("by_tenant", ["tenantId"]),

  /** Audit trail events for a signing request */
  signatureAuditLog: defineTable({
    requestId: v.id("signatureRequests"),
    tenantId: v.id("tenants"),
    signerId: v.optional(v.id("signers")),
    event: v.string(),
    description: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.string(),
  })
    .index("by_request", ["requestId"])
    .index("by_tenant", ["tenantId"]),

  submissionDrafts: defineTable({
    formId: v.id("forms"),
    /** Browser-generated UUID stored in localStorage for anonymous drafts */
    draftKey: v.string(),
    /** JSON string: partial field values */
    data: v.string(),
    currentPage: v.number(),
    submittedBy: v.optional(v.id("users")),
    updatedAt: v.string(),
  })
    .index("by_draft_key", ["draftKey"])
    .index("by_form_and_key", ["formId", "draftKey"])
    .index("by_submitted_by", ["submittedBy"]),

  // ─── Security & Compliance ────────────────────────────────────────────────

  /** Immutable security audit log — never updated or deleted. */
  securityAuditLogs: defineTable({
    tenantId: v.optional(v.id("tenants")),
    /** User who performed the action (null for system/anonymous) */
    actorId: v.optional(v.id("users")),
    actorEmail: v.optional(v.string()),
    actorName: v.optional(v.string()),
    /** Category: auth | data | admin | api | compliance */
    category: v.string(),
    /** Machine-readable action, e.g. "user.login", "submission.view" */
    action: v.string(),
    /** Human-readable description */
    description: v.string(),
    /** Target resource type */
    resourceType: v.optional(v.string()),
    /** Target resource ID */
    resourceId: v.optional(v.string()),
    /** HTTP status / outcome */
    outcome: v.union(v.literal("success"), v.literal("failure"), v.literal("warning")),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    /** Additional JSON metadata */
    metadata: v.optional(v.string()),
    timestamp: v.string(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_actor", ["actorId"])
    .index("by_category", ["category"])
    .index("by_timestamp", ["timestamp"]),

  /** Per-tenant security policy configuration. */
  securityPolicies: defineTable({
    tenantId: v.id("tenants"),
    /** Require MFA for all users */
    mfaRequired: v.boolean(),
    /** Session timeout in minutes (0 = never) */
    sessionTimeoutMinutes: v.number(),
    /** Allowed IP ranges (CIDR, JSON array of strings). Empty = no restriction. */
    ipAllowlist: v.array(v.string()),
    /** Minimum password length (0 = platform default) */
    minPasswordLength: v.number(),
    /** Data retention in days (0 = retain indefinitely) */
    dataRetentionDays: v.number(),
    /** Auto-purge submissions older than retention policy */
    autoPurgeEnabled: v.boolean(),
    /** Next scheduled purge ISO date */
    nextPurgeAt: v.optional(v.string()),
    /** Compliance frameworks acknowledged */
    frameworks: v.array(v.string()),
    /** SSO configuration — JSON string with provider details */
    ssoConfig: v.optional(v.string()),
    /** Whether SSO is enabled */
    ssoEnabled: v.boolean(),
    /** SSO provider type */
    ssoProvider: v.optional(v.union(
      v.literal("azure_ad"),
      v.literal("okta"),
      v.literal("google_workspace"),
      v.literal("saml2"),
      v.literal("oidc"),
    )),
    updatedAt: v.string(),
    updatedBy: v.id("users"),
  })
    .index("by_tenant", ["tenantId"]),

  /** GDPR / PIPEDA right-to-erasure requests. */
  dataErasureRequests: defineTable({
    tenantId: v.id("tenants"),
    /** Email of the data subject requesting erasure */
    subjectEmail: v.string(),
    subjectName: v.optional(v.string()),
    /** Reason for the request */
    reason: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_review"),
      v.literal("completed"),
      v.literal("rejected"),
    ),
    requestedAt: v.string(),
    /** ISO date when erasure was completed */
    completedAt: v.optional(v.string()),
    /** User who processed the request */
    processedBy: v.optional(v.id("users")),
    processedNote: v.optional(v.string()),
    /** Which records were erased (JSON summary) */
    erasureSummary: v.optional(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_and_status", ["tenantId", "status"])
    .index("by_subject_email", ["subjectEmail"]),
});
