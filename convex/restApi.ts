import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

// CORS headers for REST API endpoints
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key",
};

function corsResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function errorResponse(message: string, status: number) {
  return corsResponse({ error: message, status }, status);
}

// GET /api/v1/forms — list published forms for tenant
export const restListForms = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") return optionsResponse();

  const authHeader = request.headers.get("Authorization") ?? request.headers.get("X-Api-Key");
  if (!authHeader) return errorResponse("Missing Authorization header or X-Api-Key", 401);
  const rawKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId");
  if (!tenantId) return errorResponse("tenantId query param required", 400);

  const auth = await ctx.runQuery(internal.apiKeysInternal.validateKey, {
    rawKey,
    requiredScope: "forms:read",
  });
  if (!auth.valid) return errorResponse(auth.error ?? "Unauthorized", 401);

  const forms = await ctx.runQuery(internal.apiKeysInternal.listPublishedForms, {
    tenantId: tenantId as Id<"tenants">,
  });

  return corsResponse({ data: forms, total: forms.length });
});

// GET /api/v1/submissions — list submissions for tenant
export const restListSubmissions = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") return optionsResponse();

  const authHeader = request.headers.get("Authorization") ?? request.headers.get("X-Api-Key");
  if (!authHeader) return errorResponse("Missing Authorization header or X-Api-Key", 401);
  const rawKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId");
  if (!tenantId) return errorResponse("tenantId query param required", 400);

  const auth = await ctx.runQuery(internal.apiKeysInternal.validateKey, {
    rawKey,
    requiredScope: "submissions:read",
  });
  if (!auth.valid) return errorResponse(auth.error ?? "Unauthorized", 401);

  const formId = url.searchParams.get("formId");
  const status = url.searchParams.get("status");

  const submissions = await ctx.runQuery(internal.apiKeysInternal.listSubmissionsForApi, {
    tenantId: tenantId as Id<"tenants">,
    formId: (formId ?? null) as Id<"forms"> | null,
    status: status ?? null,
  });

  return corsResponse({ data: submissions, total: submissions.length });
});

// GET /api/v1/openapi.json — OpenAPI specification
export const restOpenApiSpec = httpAction(async (_ctx, _request) => {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "canflows.ca REST API",
      version: "1.0.0",
      description: "REST API for canflows.ca — Government-grade forms, workflows, and submissions platform.",
      contact: { name: "canflows.ca Support", url: "https://canflows.ca" },
      license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    },
    servers: [{ url: "https://<your-deployment>.convex.site/api/v1", description: "Production" }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "cf_live_*" },
        apiKeyHeader: { type: "apiKey", in: "header", name: "X-Api-Key" },
      },
      schemas: {
        Form: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            status: { type: "string", enum: ["draft", "published", "archived"] },
            publishedVersion: { type: "number" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Submission: {
          type: "object",
          properties: {
            _id: { type: "string" },
            formId: { type: "string" },
            referenceNumber: { type: "string" },
            status: { type: "string", enum: ["submitted", "under_review", "approved", "rejected", "returned"] },
            contactName: { type: "string" },
            contactEmail: { type: "string" },
            submittedAt: { type: "string", format: "date-time" },
            data: { type: "object" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            status: { type: "number" },
          },
        },
      },
    },
    paths: {
      "/forms": {
        get: {
          summary: "List published forms",
          parameters: [{ name: "tenantId", in: "query", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Success" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/submissions": {
        get: {
          summary: "List submissions",
          parameters: [
            { name: "tenantId", in: "query", required: true, schema: { type: "string" } },
            { name: "formId", in: "query", required: false, schema: { type: "string" } },
            { name: "status", in: "query", required: false, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Success" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/openapi.json": {
        get: { summary: "OpenAPI specification", responses: { "200": { description: "OpenAPI spec" } } },
      },
    },
  };

  return new Response(JSON.stringify(spec, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
