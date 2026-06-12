import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated } from "convex/react";
import { useTenant } from "@/contexts/tenant-context.tsx";
import { useLanguage } from "@/contexts/language-context.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import {
  Key, Plus, Trash2, Eye, EyeOff, Copy, Zap, Globe, Mail, Webhook,
  CheckCircle, XCircle, RefreshCw, ExternalLink, BookOpen, Code2
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const API_SCOPES = [
  { id: "forms:read", label: "Forms — Read", description: "List and view published forms" },
  { id: "forms:write", label: "Forms — Write", description: "Create and modify forms" },
  { id: "submissions:read", label: "Submissions — Read", description: "Read submission data" },
  { id: "submissions:write", label: "Submissions — Write", description: "Create submissions via API" },
  { id: "workflows:read", label: "Workflows — Read", description: "Read workflow definitions" },
  { id: "workflows:trigger", label: "Workflows — Trigger", description: "Trigger workflow executions" },
];

const INTEGRATION_TYPES = [
  { type: "slack", label: "Slack", category: "Messaging", icon: "💬", description: "Send notifications to Slack channels" },
  { type: "teams", label: "Microsoft Teams", category: "Messaging", icon: "💼", description: "Send notifications to Teams channels" },
  { type: "sendgrid", label: "SendGrid", category: "Email", icon: "📧", description: "Send transactional emails via SendGrid" },
  { type: "smtp", label: "Custom SMTP", category: "Email", icon: "✉️", description: "Use your own SMTP server" },
  { type: "google_workspace", label: "Google Workspace", category: "Productivity", icon: "🔵", description: "Sync with Google Sheets, Drive, etc." },
  { type: "microsoft365", label: "Microsoft 365", category: "Productivity", icon: "🟦", description: "Sync with SharePoint, OneDrive, etc." },
  { type: "zapier", label: "Zapier", category: "Automation", icon: "⚡", description: "Connect to 5000+ apps via Zapier" },
  { type: "make", label: "Make (Integromat)", category: "Automation", icon: "🔄", description: "Build complex automation scenarios" },
  { type: "webhook", label: "Custom Webhook", category: "Custom", icon: "🔗", description: "Send HTTP webhooks to any URL" },
];

const TRIGGER_EVENTS = [
  { id: "submission.created", label: "Submission Created" },
  { id: "submission.approved", label: "Submission Approved" },
  { id: "submission.rejected", label: "Submission Rejected" },
  { id: "submission.returned", label: "Submission Returned" },
  { id: "sla.breached", label: "SLA Breached" },
];

type ApiKeyDoc = {
  _id: Id<"apiKeys">;
  name: string;
  keySuffix: string;
  scopes: string[];
  isRevoked: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
};

type IntegrationDoc = {
  _id: Id<"integrations">;
  type: string;
  name: string;
  isEnabled: boolean;
  config: string;
  webhookUrl?: string;
  triggerEvents: string[];
  createdAt: string;
};

function ApiKeysTab({ tenantId }: { tenantId: Id<"tenants"> }) {
  const apiKeys = useQuery(api.apiKeys.listApiKeys, { tenantId }) as ApiKeyDoc[] | undefined;
  const createKey = useMutation(api.apiKeys.createApiKey);
  const revokeKey = useMutation(api.apiKeys.revokeApiKey);
  const deleteKey = useMutation(api.apiKeys.deleteApiKey);

  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["forms:read", "submissions:read"]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newKeyName.trim()) { toast.error("Key name is required"); return; }
    if (selectedScopes.length === 0) { toast.error("Select at least one scope"); return; }
    setCreating(true);
    try {
      const result = await createKey({ tenantId, name: newKeyName.trim(), scopes: selectedScopes });
      setCreatedKey(result.rawKey);
      setNewKeyName("");
      setSelectedScopes(["forms:read", "submissions:read"]);
    } catch {
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground">Authenticate external requests with long-lived API keys</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Key
        </Button>
      </div>

      {apiKeys === undefined ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : apiKeys.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <Key className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No API keys yet</p>
            <p className="text-sm text-muted-foreground">Create your first API key to start integrating with CanFlow.ai</p>
            <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-2" />Create Key</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <Card key={key._id}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-md">
                    <Key className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      {key.isRevoked && <Badge variant="destructive" className="text-xs">Revoked</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <code className="text-xs text-muted-foreground">cf_live_...{key.keySuffix}</code>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{key.scopes.length} scope{key.scopes.length !== 1 ? "s" : ""}</span>
                      {key.lastUsedAt && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {key.scopes.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs py-0">{s}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!key.isRevoked && (
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => revokeKey({ keyId: key._id }).then(() => toast.success("Key revoked")).catch(() => toast.error("Failed to revoke"))}
                    >
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => deleteKey({ keyId: key._id }).then(() => toast.success("Key deleted")).catch(() => toast.error("Failed to delete"))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Key Dialog */}
      <Dialog open={showCreate && !createdKey} onOpenChange={(o) => { if (!o) { setShowCreate(false); setCreatedKey(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Key Name</Label>
              <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. Zapier Integration" />
            </div>
            <div className="space-y-2">
              <Label>Permissions (Scopes)</Label>
              <div className="space-y-2 border rounded-md p-3">
                {API_SCOPES.map((scope) => (
                  <div key={scope.id} className="flex items-start gap-3">
                    <Checkbox
                      id={scope.id}
                      checked={selectedScopes.includes(scope.id)}
                      onCheckedChange={(checked) =>
                        setSelectedScopes(checked
                          ? [...selectedScopes, scope.id]
                          : selectedScopes.filter((s) => s !== scope.id)
                        )
                      }
                    />
                    <div>
                      <label htmlFor={scope.id} className="text-sm font-medium cursor-pointer">{scope.label}</label>
                      <p className="text-xs text-muted-foreground">{scope.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Created Key */}
      <Dialog open={!!createdKey} onOpenChange={() => { setCreatedKey(null); setShowCreate(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" /> API Key Created
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Copy your API key now. You won't be able to see it again after closing this dialog.
            </p>
            <div className="flex items-center gap-2 bg-muted rounded-md p-3">
              <code className="flex-1 text-sm break-all font-mono">
                {showKey ? createdKey : createdKey?.replace(/./g, "•")}
              </code>
              <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleCopy(createdKey ?? "")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setCreatedKey(null); setShowCreate(false); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IntegrationsTab({ tenantId }: { tenantId: Id<"tenants"> }) {
  const integrations = useQuery(api.integrations.listIntegrations, { tenantId }) as IntegrationDoc[] | undefined;
  const createIntegration = useMutation(api.integrations.createIntegration);
  const updateIntegration = useMutation(api.integrations.updateIntegration);
  const deleteIntegration = useMutation(api.integrations.deleteIntegration);
  const testIntegration = useMutation(api.integrations.testIntegration);

  const [showAdd, setShowAdd] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", webhookUrl: "", events: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!selectedType || !form.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      await createIntegration({
        tenantId,
        type: selectedType,
        name: form.name,
        config: "{}",
        webhookUrl: form.webhookUrl || undefined,
        triggerEvents: form.events,
      });
      toast.success("Integration added");
      setShowAdd(false);
      setSelectedType(null);
      setForm({ name: "", webhookUrl: "", events: [] });
    } catch {
      toast.error("Failed to add integration");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (integrationId: Id<"integrations">) => {
    setTesting(integrationId);
    try {
      const result = await testIntegration({ integrationId });
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch {
      toast.error("Test failed");
    } finally {
      setTesting(null);
    }
  };

  const categoryGroups = INTEGRATION_TYPES.reduce<Record<string, typeof INTEGRATION_TYPES>>((acc, t) => {
    (acc[t.category] = acc[t.category] ?? []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Connectors & Integrations</h2>
          <p className="text-sm text-muted-foreground">Connect CanFlow.ai to your existing tools</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Integration
        </Button>
      </div>

      {integrations === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : integrations.length === 0 ? (
        <div className="space-y-6">
          <Card className="border-dashed">
            <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
              <Zap className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No integrations yet</p>
              <p className="text-sm text-muted-foreground">Connect Slack, SendGrid, Zapier, and more</p>
              <Button onClick={() => setShowAdd(true)} size="sm"><Plus className="h-4 w-4 mr-2" />Add Integration</Button>
            </CardContent>
          </Card>
          {/* Integration catalog preview */}
          {Object.entries(categoryGroups).map(([category, types]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{category}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {types.map((t) => (
                  <Card key={t.type} className="opacity-50 cursor-not-allowed">
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                      <span className="text-2xl">{t.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {integrations.map((integration) => {
            const meta = INTEGRATION_TYPES.find((t) => t.type === integration.type);
            return (
              <Card key={integration._id}>
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta?.icon ?? "🔗"}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{integration.name}</span>
                        <Badge variant={integration.isEnabled ? "default" : "secondary"} className="text-xs">
                          {integration.isEnabled ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{meta?.label ?? integration.type}</p>
                      {integration.webhookUrl && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">{integration.webhookUrl}</p>
                      )}
                      {integration.triggerEvents.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {integration.triggerEvents.map((e) => (
                            <Badge key={e} variant="outline" className="text-xs py-0">{e}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={integration.isEnabled}
                      onCheckedChange={(v) => updateIntegration({ integrationId: integration._id, isEnabled: v })}
                    />
                    <Button
                      variant="outline" size="sm"
                      onClick={() => handleTest(integration._id)}
                      disabled={testing === integration._id}
                    >
                      {testing === integration._id ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Test"}
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => deleteIntegration({ integrationId: integration._id }).then(() => toast.success("Deleted"))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Integration Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Integration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!selectedType ? (
              <div className="space-y-4">
                {Object.entries(categoryGroups).map(([category, types]) => (
                  <div key={category}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{category}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {types.map((t) => (
                        <button
                          key={t.type}
                          onClick={() => setSelectedType(t.type)}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary hover:bg-accent text-left transition-colors cursor-pointer"
                        >
                          <span className="text-2xl">{t.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{t.label}</p>
                            <p className="text-xs text-muted-foreground leading-tight">{t.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <button onClick={() => setSelectedType(null)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer">
                  ← Back to integrations
                </button>
                <div className="space-y-2">
                  <Label>Integration Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={`e.g. My ${INTEGRATION_TYPES.find((t) => t.type === selectedType)?.label}`} />
                </div>
                {(selectedType === "webhook" || selectedType === "zapier" || selectedType === "make" || selectedType === "slack" || selectedType === "teams") && (
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} placeholder="https://hooks.example.com/..." />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Trigger Events</Label>
                  <div className="space-y-2 border rounded-md p-3">
                    {TRIGGER_EVENTS.map((event) => (
                      <div key={event.id} className="flex items-center gap-3">
                        <Checkbox
                          id={event.id}
                          checked={form.events.includes(event.id)}
                          onCheckedChange={(checked) =>
                            setForm({
                              ...form,
                              events: checked
                                ? [...form.events, event.id]
                                : form.events.filter((e) => e !== event.id),
                            })
                          }
                        />
                        <label htmlFor={event.id} className="text-sm cursor-pointer">{event.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          {selectedType && (
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Integration
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApiDocsTab() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const examples = [
    {
      id: "list-forms",
      title: "List Published Forms",
      method: "GET",
      endpoint: "/api/v1/forms?tenantId=<tenantId>",
      code: `curl -X GET "https://<your-deployment>.convex.site/api/v1/forms?tenantId=<tenantId>" \\
  -H "Authorization: Bearer cf_live_your_api_key"`,
    },
    {
      id: "list-submissions",
      title: "List Submissions",
      method: "GET",
      endpoint: "/api/v1/submissions?tenantId=<tenantId>&status=submitted",
      code: `curl -X GET "https://<your-deployment>.convex.site/api/v1/submissions?tenantId=<tenantId>&status=submitted" \\
  -H "Authorization: Bearer cf_live_your_api_key"`,
    },
    {
      id: "openapi",
      title: "OpenAPI Specification",
      method: "GET",
      endpoint: "/api/v1/openapi.json",
      code: `curl -X GET "https://<your-deployment>.convex.site/api/v1/openapi.json"`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Documentation</h2>
          <p className="text-sm text-muted-foreground">REST API reference with code examples</p>
        </div>
        <Button variant="outline" onClick={() => window.open("#", "_blank")}>
          <ExternalLink className="h-4 w-4 mr-2" /> Full OpenAPI Spec
        </Button>
      </div>

      {/* Auth section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" /> Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            All API requests must include your API key using either method:
          </p>
          <div className="space-y-2">
            <p className="text-xs font-mono text-muted-foreground">Authorization: Bearer cf_live_your_api_key</p>
            <p className="text-xs font-mono text-muted-foreground">X-Api-Key: cf_live_your_api_key</p>
          </div>
        </CardContent>
      </Card>

      {/* Base URL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> Base URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 bg-muted rounded-md p-3">
            <code className="text-sm flex-1 text-muted-foreground">https://&lt;your-deployment&gt;.convex.site/api/v1</code>
            <Badge variant="secondary" className="text-xs">V1</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Find your deployment URL in More → Backend → HTTP Actions URL
          </p>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Code2 className="h-4 w-4" /> Endpoints</h3>
        {examples.map((ex) => (
          <Card key={ex.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge variant={ex.method === "GET" ? "secondary" : "default"} className="text-xs font-mono">{ex.method}</Badge>
                <code className="text-sm">{ex.endpoint}</code>
              </div>
              <CardTitle className="text-sm font-medium">{ex.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto text-muted-foreground">{ex.code}</pre>
                <Button
                  variant="ghost" size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => copyCode(ex.code, ex.id)}
                >
                  {copied === ex.id ? <CheckCircle className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Zapier/Make section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" /> Zapier & Make Compatibility
          </CardTitle>
          <CardDescription>
            CanFlow.ai webhooks are fully compatible with Zapier and Make (Integromat) via the Integrations tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Add a <strong>Webhook</strong> or <strong>Zapier</strong> integration in the Connectors tab</p>
          <p>2. Paste the Zapier/Make webhook URL provided by those platforms</p>
          <p>3. Select the events you want to receive (e.g. submission.created)</p>
          <p>4. CanFlow.ai will POST a JSON payload to your endpoint on every matching event</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ApiIntegrationsInner() {
  const { activeTenant: currentTenant } = useTenant();
  const { t } = useLanguage();

  if (!currentTenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <Globe className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Select a tenant to manage API keys and integrations</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.navApiIntegrations}</h1>
        <p className="text-muted-foreground">Connect external systems, manage API keys, and explore the REST API</p>
      </div>

      <Tabs defaultValue="api-keys">
        <TabsList>
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" /> Connectors
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> API Docs
          </TabsTrigger>
        </TabsList>
        <TabsContent value="api-keys" className="mt-6">
          <ApiKeysTab tenantId={currentTenant._id} />
        </TabsContent>
        <TabsContent value="integrations" className="mt-6">
          <IntegrationsTab tenantId={currentTenant._id} />
        </TabsContent>
        <TabsContent value="docs" className="mt-6">
          <ApiDocsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ApiIntegrationsPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex items-center justify-center h-full">
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <ApiIntegrationsInner />
      </Authenticated>
    </>
  );
}
