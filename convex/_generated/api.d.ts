/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminConsole from "../adminConsole.js";
import type * as aiWorkflowBuilder from "../aiWorkflowBuilder.js";
import type * as aiWorkflowBuilderInternal from "../aiWorkflowBuilderInternal.js";
import type * as analytics from "../analytics.js";
import type * as apiKeys from "../apiKeys.js";
import type * as apiKeysInternal from "../apiKeysInternal.js";
import type * as authHelpers from "../authHelpers.js";
import type * as connections from "../connections.js";
import type * as connectionsInternal from "../connectionsInternal.js";
import type * as credentials from "../credentials.js";
import type * as crons from "../crons.js";
import type * as documentGeneration from "../documentGeneration.js";
import type * as documentGenerationAction from "../documentGenerationAction.js";
import type * as esignature from "../esignature.js";
import type * as execute from "../execute.js";
import type * as executeInternal from "../executeInternal.js";
import type * as executionLogsInternal from "../executionLogsInternal.js";
import type * as executions from "../executions.js";
import type * as executionsInternal from "../executionsInternal.js";
import type * as expressionResolver from "../expressionResolver.js";
import type * as formAi from "../formAi.js";
import type * as formIntegrations from "../formIntegrations.js";
import type * as forms from "../forms.js";
import type * as http from "../http.js";
import type * as integrations from "../integrations.js";
import type * as intelligence from "../intelligence.js";
import type * as intelligenceInternal from "../intelligenceInternal.js";
import type * as nodes from "../nodes.js";
import type * as nodesInternal from "../nodesInternal.js";
import type * as restApi from "../restApi.js";
import type * as scheduler from "../scheduler.js";
import type * as security_auditLogs from "../security/auditLogs.js";
import type * as security_compliance from "../security/compliance.js";
import type * as security_erasure from "../security/erasure.js";
import type * as security_policies from "../security/policies.js";
import type * as sla from "../sla.js";
import type * as submissions from "../submissions.js";
import type * as tasks from "../tasks.js";
import type * as tenants from "../tenants.js";
import type * as users from "../users.js";
import type * as webhooks from "../webhooks.js";
import type * as webhooksInternal from "../webhooksInternal.js";
import type * as workflowVariables from "../workflowVariables.js";
import type * as workflows from "../workflows.js";
import type * as workflowsInternal from "../workflowsInternal.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminConsole: typeof adminConsole;
  aiWorkflowBuilder: typeof aiWorkflowBuilder;
  aiWorkflowBuilderInternal: typeof aiWorkflowBuilderInternal;
  analytics: typeof analytics;
  apiKeys: typeof apiKeys;
  apiKeysInternal: typeof apiKeysInternal;
  authHelpers: typeof authHelpers;
  connections: typeof connections;
  connectionsInternal: typeof connectionsInternal;
  credentials: typeof credentials;
  crons: typeof crons;
  documentGeneration: typeof documentGeneration;
  documentGenerationAction: typeof documentGenerationAction;
  esignature: typeof esignature;
  execute: typeof execute;
  executeInternal: typeof executeInternal;
  executionLogsInternal: typeof executionLogsInternal;
  executions: typeof executions;
  executionsInternal: typeof executionsInternal;
  expressionResolver: typeof expressionResolver;
  formAi: typeof formAi;
  formIntegrations: typeof formIntegrations;
  forms: typeof forms;
  http: typeof http;
  integrations: typeof integrations;
  intelligence: typeof intelligence;
  intelligenceInternal: typeof intelligenceInternal;
  nodes: typeof nodes;
  nodesInternal: typeof nodesInternal;
  restApi: typeof restApi;
  scheduler: typeof scheduler;
  "security/auditLogs": typeof security_auditLogs;
  "security/compliance": typeof security_compliance;
  "security/erasure": typeof security_erasure;
  "security/policies": typeof security_policies;
  sla: typeof sla;
  submissions: typeof submissions;
  tasks: typeof tasks;
  tenants: typeof tenants;
  users: typeof users;
  webhooks: typeof webhooks;
  webhooksInternal: typeof webhooksInternal;
  workflowVariables: typeof workflowVariables;
  workflows: typeof workflows;
  workflowsInternal: typeof workflowsInternal;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
