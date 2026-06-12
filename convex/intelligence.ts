"use node";
/**
 * AI Process Intelligence — bottleneck detection, trend analysis, sentiment,
 * predictive SLA breach alerts, next-best-action suggestions.
 * Uses Hercules AI Gateway (openai/gpt-5-mini).
 */
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal, api } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://ai-gateway.hercules.app/v1",
  apiKey: process.env.HERCULES_API_KEY,
});

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireIdentity(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not signed in" });
  return identity;
}

// ─── Bottleneck & Trend Analysis ─────────────────────────────────────────────

export const analyzeBottlenecks = action({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<{
    bottlenecks: Array<{ stage: string; avgHours: number; count: number; severity: "low" | "medium" | "high" }>;
    summary: string;
    recommendations: string[];
  }> => {
    await requireIdentity(ctx);

    // Gather data from DB
    const submissions = await ctx.runQuery(api.analytics.submissionStatusBreakdown, { tenantId: args.tenantId });
    const processingTime = await ctx.runQuery(api.analytics.processingTimeMetrics, { tenantId: args.tenantId });
    const slaMetrics = await ctx.runQuery(api.analytics.slaComplianceMetrics, { tenantId: args.tenantId });
    const topForms = await ctx.runQuery(api.analytics.topForms, { tenantId: args.tenantId, limit: 5 });

    const prompt = `You are a process intelligence analyst for a government forms and workflow automation platform called CanFlow.ai.

Analyze the following submission pipeline data and identify bottlenecks:

Submission Status Breakdown: ${JSON.stringify(submissions)}
Processing Time (hours): avg=${processingTime.avgHours}h, median=${processingTime.medianHours}h, p90=${processingTime.p90Hours}h
SLA Compliance: response=${slaMetrics.responseRate}%, resolution=${slaMetrics.resolutionRate}%, breached=${slaMetrics.breachedCount}
Top Forms: ${JSON.stringify(topForms.map(f => ({ form: f.formName, submissions: f.count, approvalRate: f.approvalRate })))}

Return a JSON object with exactly this structure:
{
  "bottlenecks": [
    { "stage": "stage name", "avgHours": number, "count": number, "severity": "low|medium|high" }
  ],
  "summary": "2-3 sentence plain-English summary of the main bottlenecks",
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2", "actionable recommendation 3"]
}

Be specific and actionable. Base severity on: high = avgHours > 48 or count > 50, medium = avgHours > 24 or count > 20, low = otherwise.`;

    try {
      const response = await openai.chat.completions.create({
        model: "openai/gpt-5-mini",
        reasoning_effort: "minimal",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(text) as {
        bottlenecks: Array<{ stage: string; avgHours: number; count: number; severity: "low" | "medium" | "high" }>;
        summary: string;
        recommendations: string[];
      };
      return parsed;
    } catch {
      // Return data-driven fallback without AI
      const underReview = submissions.find(s => s.status === "under_review");
      return {
        bottlenecks: [
          {
            stage: "Under Review",
            avgHours: processingTime.avgHours,
            count: underReview?.count ?? 0,
            severity: processingTime.avgHours > 48 ? "high" : processingTime.avgHours > 24 ? "medium" : "low",
          },
        ],
        summary: `Average processing time is ${processingTime.avgHours}h with ${slaMetrics.resolutionRate}% SLA compliance. ${slaMetrics.breachedCount} submissions have breached SLA.`,
        recommendations: [
          "Review assignments to balance reviewer workload",
          "Set up SLA alerts for submissions approaching deadlines",
          "Consider adding automated routing rules for common submission types",
        ],
      };
    }
  },
});

// ─── Sentiment Analysis ───────────────────────────────────────────────────────

export const analyzeSentiment = action({
  args: {
    tenantId: v.id("tenants"),
    texts: v.array(v.object({
      id: v.string(),
      label: v.string(),
      text: v.string(),
    })),
  },
  handler: async (ctx, args): Promise<{
    results: Array<{
      id: string;
      label: string;
      sentiment: "positive" | "neutral" | "negative";
      score: number;
      keyThemes: string[];
      summary: string;
    }>;
    overallSentiment: "positive" | "neutral" | "negative";
    overallScore: number;
    topThemes: string[];
  }> => {
    await requireIdentity(ctx);

    if (args.texts.length === 0) {
      return { results: [], overallSentiment: "neutral", overallScore: 50, topThemes: [] };
    }

    const prompt = `You are a sentiment analysis engine for a government forms platform.

Analyze the sentiment of each of these texts from submission review notes and comments:

${args.texts.map((t, i) => `[${i}] ${t.label}: "${t.text}"`).join("\n")}

Return a JSON object with exactly this structure:
{
  "results": [
    {
      "id": "original id string",
      "label": "original label",
      "sentiment": "positive|neutral|negative",
      "score": 0-100,
      "keyThemes": ["theme1", "theme2"],
      "summary": "one sentence"
    }
  ],
  "overallSentiment": "positive|neutral|negative",
  "overallScore": 0-100,
  "topThemes": ["theme1", "theme2", "theme3"]
}

Score: 0=very negative, 50=neutral, 100=very positive.`;

    try {
      const response = await openai.chat.completions.create({
        model: "openai/gpt-5-mini",
        reasoning_effort: "minimal",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content ?? "{}";
      return JSON.parse(text) as {
        results: Array<{
          id: string;
          label: string;
          sentiment: "positive" | "neutral" | "negative";
          score: number;
          keyThemes: string[];
          summary: string;
        }>;
        overallSentiment: "positive" | "neutral" | "negative";
        overallScore: number;
        topThemes: string[];
      };
    } catch {
      return {
        results: args.texts.map(t => ({
          id: t.id,
          label: t.label,
          sentiment: "neutral" as const,
          score: 50,
          keyThemes: [],
          summary: "Unable to analyze",
        })),
        overallSentiment: "neutral" as const,
        overallScore: 50,
        topThemes: [],
      };
    }
  },
});

// ─── Predictive SLA Breach Detection ─────────────────────────────────────────

export const predictSlaBreaches = action({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<{
    atRisk: Array<{
      referenceNumber: string;
      submissionId: string;
      formName: string;
      hoursOpen: number;
      priority: string;
      riskLevel: "high" | "medium" | "low";
      riskReason: string;
      suggestedAction: string;
    }>;
    summary: string;
    totalAtRisk: number;
  }> => {
    await requireIdentity(ctx);

    // Get open submissions with SLA data
    const submissions = await ctx.runQuery(internal.intelligenceInternal.getOpenSubmissionsForPrediction, {
      tenantId: args.tenantId,
    });

    if (submissions.length === 0) {
      return { atRisk: [], summary: "No open submissions to analyze.", totalAtRisk: 0 };
    }

    const prompt = `You are a predictive analytics engine for a government forms platform.

Analyze these open submissions and predict which ones are at risk of SLA breach:

${JSON.stringify(submissions.slice(0, 20))}

For each submission, assess risk based on:
- hoursOpen relative to typical resolution time (assume 48h target)
- priority level (urgent=12h, high=24h, normal=48h, low=72h)
- slaBreached flag

Return JSON:
{
  "atRisk": [
    {
      "referenceNumber": "...",
      "submissionId": "...",
      "formName": "...",
      "hoursOpen": number,
      "priority": "...",
      "riskLevel": "high|medium|low",
      "riskReason": "brief reason",
      "suggestedAction": "specific action for reviewer"
    }
  ],
  "summary": "1-2 sentence summary",
  "totalAtRisk": number
}

Only include submissions that are actually at risk (not all of them). Sort by riskLevel descending.`;

    try {
      const response = await openai.chat.completions.create({
        model: "openai/gpt-5-mini",
        reasoning_effort: "minimal",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content ?? "{}";
      return JSON.parse(text) as {
        atRisk: Array<{
          referenceNumber: string;
          submissionId: string;
          formName: string;
          hoursOpen: number;
          priority: string;
          riskLevel: "high" | "medium" | "low";
          riskReason: string;
          suggestedAction: string;
        }>;
        summary: string;
        totalAtRisk: number;
      };
    } catch {
      // Fallback: rule-based detection
      const now = Date.now();
      const atRisk = submissions
        .filter(s => {
          const hoursOpen = (now - new Date(s.submittedAt).getTime()) / 3600000;
          const limit = s.priority === "urgent" ? 12 : s.priority === "high" ? 24 : 48;
          return hoursOpen > limit * 0.8;
        })
        .slice(0, 10)
        .map(s => {
          const hoursOpen = Math.round((now - new Date(s.submittedAt).getTime()) / 3600000);
          const limit = s.priority === "urgent" ? 12 : s.priority === "high" ? 24 : 48;
          return {
            referenceNumber: s.referenceNumber,
            submissionId: s._id,
            formName: s.formName,
            hoursOpen,
            priority: s.priority ?? "normal",
            riskLevel: hoursOpen > limit ? "high" as const : "medium" as const,
            riskReason: `Open for ${hoursOpen}h against ${limit}h target`,
            suggestedAction: "Assign to available reviewer and escalate if needed",
          };
        });

      return {
        atRisk,
        summary: `${atRisk.length} submissions are at risk of SLA breach based on time elapsed.`,
        totalAtRisk: atRisk.length,
      };
    }
  },
});

// ─── Next-Best-Action for Reviewers ──────────────────────────────────────────

export const suggestNextAction = action({
  args: {
    submissionId: v.id("submissions"),
    referenceNumber: v.string(),
    formName: v.string(),
    status: v.string(),
    priority: v.optional(v.string()),
    hoursOpen: v.number(),
    reviewNotes: v.optional(v.string()),
    assignedReviewerName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    primaryAction: string;
    primaryActionLabel: string;
    rationale: string;
    additionalSuggestions: string[];
    riskAssessment: string;
    estimatedResolutionTime: string;
  }> => {
    await requireIdentity(ctx);

    const prompt = `You are an AI assistant helping a government reviewer process a submission.

Submission details:
- Reference: ${args.referenceNumber}
- Form: ${args.formName}
- Status: ${args.status}
- Priority: ${args.priority ?? "normal"}
- Hours open: ${args.hoursOpen}h
- Review notes: ${args.reviewNotes ?? "None"}
- Assigned reviewer: ${args.assignedReviewerName ?? "Unassigned"}

Suggest the next best action for this reviewer. Return JSON:
{
  "primaryAction": "approve|reject|return|request_info|escalate|assign|review",
  "primaryActionLabel": "human-readable label",
  "rationale": "why this is the recommended action (2-3 sentences)",
  "additionalSuggestions": ["suggestion 1", "suggestion 2"],
  "riskAssessment": "brief risk assessment",
  "estimatedResolutionTime": "e.g. 2-4 hours, 1-2 days"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "openai/gpt-5-mini",
        reasoning_effort: "minimal",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content ?? "{}";
      return JSON.parse(text) as {
        primaryAction: string;
        primaryActionLabel: string;
        rationale: string;
        additionalSuggestions: string[];
        riskAssessment: string;
        estimatedResolutionTime: string;
      };
    } catch {
      return {
        primaryAction: "review",
        primaryActionLabel: "Review submission",
        rationale: "Review the submission details and make a determination based on the information provided.",
        additionalSuggestions: ["Check all required fields are complete", "Verify supporting documents if any"],
        riskAssessment: "Standard risk — no special flags detected",
        estimatedResolutionTime: "1-2 hours",
      };
    }
  },
});

// ─── Process Conformance Check ────────────────────────────────────────────────

export const checkProcessConformance = action({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args): Promise<{
    score: number;
    grade: "A" | "B" | "C" | "D" | "F";
    findings: Array<{ type: "violation" | "deviation" | "good_practice"; description: string; impact: string }>;
    summary: string;
  }> => {
    await requireIdentity(ctx);

    const sla = await ctx.runQuery(api.analytics.slaComplianceMetrics, { tenantId: args.tenantId });
    const workload = await ctx.runQuery(api.analytics.reviewerWorkload, { tenantId: args.tenantId });
    const kpis = await ctx.runQuery(api.analytics.summaryKpis, { tenantId: args.tenantId });

    const prompt = `You are a process conformance analyst for a government digital forms platform.

Analyze these process metrics and check for conformance issues:

KPIs: ${JSON.stringify(kpis)}
SLA: response=${sla.responseRate}%, resolution=${sla.resolutionRate}%, breached=${sla.breachedCount}
Reviewer workload: ${JSON.stringify(workload.map(r => ({ name: r.name, assigned: r.assigned, pending: r.pending, resolved: r.resolved })))}

Return a JSON conformance report:
{
  "score": 0-100,
  "grade": "A|B|C|D|F",
  "findings": [
    { "type": "violation|deviation|good_practice", "description": "...", "impact": "..." }
  ],
  "summary": "2-3 sentence executive summary"
}

Grade scale: A=90-100, B=75-89, C=60-74, D=40-59, F=0-39.
Violations = serious issues, deviations = minor, good_practice = compliant areas.`;

    try {
      const response = await openai.chat.completions.create({
        model: "openai/gpt-5-mini",
        reasoning_effort: "minimal",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content ?? "{}";
      return JSON.parse(text) as {
        score: number;
        grade: "A" | "B" | "C" | "D" | "F";
        findings: Array<{ type: "violation" | "deviation" | "good_practice"; description: string; impact: string }>;
        summary: string;
      };
    } catch {
      const score = Math.round((sla.resolutionRate * 0.6) + (kpis.openSubmissions < 10 ? 40 : 20));
      const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
      return {
        score,
        grade: grade as "A" | "B" | "C" | "D" | "F",
        findings: [
          {
            type: sla.resolutionRate >= 90 ? "good_practice" : "deviation",
            description: `SLA resolution compliance is ${sla.resolutionRate}%`,
            impact: "Affects citizen service delivery timelines",
          },
        ],
        summary: `Process conformance score is ${score}/100. ${sla.breachedCount} SLA breaches detected.`,
      };
    }
  },
});
