import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

// ---------------------------------------------------------------------------
// Helper: parse workflowId and nodeId from path /webhook/:workflowId/:nodeId
// ---------------------------------------------------------------------------

function parseWebhookPath(url: string): { workflowId: string; nodeId: string } | null {
  const pathname = new URL(url).pathname;
  // Strip leading /webhook/ prefix and split
  const segments = pathname.replace(/^\/webhook\//, "").split("/").filter(Boolean);
  if (segments.length < 2) return null;
  return { workflowId: segments[0], nodeId: segments[1] };
}

// ---------------------------------------------------------------------------
// GET /webhook/:workflowId/:nodeId — webhook info
// ---------------------------------------------------------------------------

export const webhookInfoHandler = httpAction(async (_ctx, request) => {
  const parsed = parseWebhookPath(request.url);

  if (!parsed) {
    return new Response(
      JSON.stringify({ error: "Invalid webhook URL: expected /webhook/:workflowId/:nodeId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { workflowId, nodeId } = parsed;

  return new Response(
    JSON.stringify({
      status: "ready",
      message: "Webhook is ready to receive events",
      workflowId,
      nodeId,
      acceptedMethods: ["POST"],
      url: request.url,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
});

// ---------------------------------------------------------------------------
// POST /webhook/:workflowId/:nodeId — receive webhook event
// ---------------------------------------------------------------------------

export const webhookHandler = httpAction(async (ctx, request) => {
  const parsed = parseWebhookPath(request.url);

  if (!parsed) {
    return new Response(
      JSON.stringify({ error: "Invalid webhook URL: expected /webhook/:workflowId/:nodeId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { workflowId, nodeId } = parsed;

  // Extract request details
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const body = await request.text();
  const queryParams = new URL(request.url).searchParams.toString();

  try {
    // Store the incoming webhook event
    await ctx.runMutation(internal.webhooksInternal.createEvent, {
      workflowId: workflowId as Id<"workflows">,
      nodeId: nodeId as Id<"nodes">,
      method: request.method,
      headers,
      body: body.length > 0 ? body : undefined,
      queryParams: queryParams.length > 0 ? queryParams : undefined,
    });

    // Trigger the workflow execution with webhook data as trigger payload
    await ctx.runAction(internal.executeInternal.executeWorkflowInternal, {
      workflowId: workflowId as Id<"workflows">,
      triggerNodeId: nodeId as Id<"nodes">,
      triggerType: "webhook",
      triggerData: {
        body,
        headers,
        queryParams,
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Webhook received" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[webhook] Error processing webhook:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

// ---------------------------------------------------------------------------
// OPTIONS /webhook/:workflowId/:nodeId — CORS preflight
// ---------------------------------------------------------------------------

export const webhookOptionsHandler = httpAction(async (_ctx, _request) => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    },
  });
});
