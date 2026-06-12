import { httpRouter } from "convex/server";
import {
  webhookHandler,
  webhookInfoHandler,
  webhookOptionsHandler,
} from "./webhooks";
import { restListForms, restListSubmissions, restOpenApiSpec } from "./restApi";

const http = httpRouter();

// Dynamic webhook routes
http.route({ pathPrefix: "/webhook/", method: "POST", handler: webhookHandler });
http.route({ pathPrefix: "/webhook/", method: "GET", handler: webhookInfoHandler });
http.route({ pathPrefix: "/webhook/", method: "OPTIONS", handler: webhookOptionsHandler });

// REST API v1
http.route({ path: "/api/v1/forms", method: "GET", handler: restListForms });
http.route({ path: "/api/v1/forms", method: "OPTIONS", handler: restListForms });
http.route({ path: "/api/v1/submissions", method: "GET", handler: restListSubmissions });
http.route({ path: "/api/v1/submissions", method: "OPTIONS", handler: restListSubmissions });
http.route({ path: "/api/v1/openapi.json", method: "GET", handler: restOpenApiSpec });

export default http;
