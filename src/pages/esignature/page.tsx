/**
 * eSignature management page — create, track, and manage signing requests.
 */
import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useTenant } from "@/contexts/tenant-context.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format } from "date-fns";
import {
  PenLine, Plus, Send, X, CheckCircle2, Clock, AlertTriangle,
  Eye, Trash2, Users, ClipboardList, ShieldCheck, Copy, RefreshCw,
  ChevronDown, ChevronUp, FileSignature,
} from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import type { Id } from "@/convex/_generated/dataModel.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type SignerInput = { name: string; email: string; role: string; order: number };

type SignatureRequest = {
  _id: Id<"signatureRequests">;
  title: string;
  message?: string;
  status: "draft" | "in_progress" | "completed" | "cancelled" | "expired";
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
};

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SignatureRequest["status"] }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Draft", variant: "secondary" },
    in_progress: { label: "In Progress", variant: "default" },
    completed: { label: "Completed", variant: "outline" },
    cancelled: { label: "Cancelled", variant: "destructive" },
    expired: { label: "Expired", variant: "destructive" },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "secondary" };
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── Signer row in list ───────────────────────────────────────────────────────

function SignerStatusIcon({ status }: { status: string }) {
  if (status === "signed") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === "declined") return <X className="h-4 w-4 text-red-500" />;
  if (status === "viewed") return <Eye className="h-4 w-4 text-blue-500" />;
  if (status === "invited") return <Send className="h-4 w-4 text-yellow-500" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

// ─── Request detail drawer ────────────────────────────────────────────────────

function RequestDetail({ requestId, onClose }: { requestId: Id<"signatureRequests">; onClose: () => void }) {
  const request = useQuery(api.esignature.getRequest, { requestId });
  const signers = useQuery(api.esignature.getSigners, { requestId });
  const auditLog = useQuery(api.esignature.getAuditLog, { requestId });
  const sendRequest = useMutation(api.esignature.sendRequest);
  const cancelRequest = useMutation(api.esignature.cancelRequest);
  const [activeTab, setActiveTab] = useState("signers");

  if (!request || !signers || !auditLog) {
    return <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  const handleSend = async () => {
    try {
      await sendRequest({ requestId });
      toast.success("Signing invitations sent");
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to send";
      toast.error(msg);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelRequest({ requestId });
      toast.success("Request cancelled");
      onClose();
    } catch (e) {
      toast.error("Failed to cancel");
    }
  };

  const copySigningLink = (token: string) => {
    const url = `${window.location.origin}/sign/${token}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Signing link copied"));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between p-6 border-b">
        <div>
          <h2 className="text-lg font-semibold">{request.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={request.status} />
            <span className="text-xs text-muted-foreground">Created {format(new Date(request.createdAt), "MMM d, yyyy")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {request.status === "draft" && (
            <Button size="sm" onClick={handleSend} className="gap-1"><Send className="h-3.5 w-3.5" /> Send</Button>
          )}
          {(request.status === "draft" || request.status === "in_progress") && (
            <Button size="sm" variant="ghost" onClick={handleCancel}><X className="h-4 w-4" /></Button>
          )}
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {request.message && (
        <div className="px-6 py-3 bg-muted/50 text-sm text-muted-foreground italic border-b">
          "{request.message}"
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-6 mt-4 w-fit">
          <TabsTrigger value="signers"><Users className="h-3.5 w-3.5 mr-1" />Signers ({signers.length})</TabsTrigger>
          <TabsTrigger value="audit"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="signers" className="flex-1 overflow-auto px-6 pb-6">
          <div className="space-y-3 mt-4">
            {signers
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((s, i) => (
                <Card key={s._id} className="p-0">
                  <CardContent className="flex items-center gap-3 py-3 px-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{i + 1}</div>
                    <SignerStatusIcon status={s.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}{s.role ? ` · ${s.role}` : ""}</p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{s.status.replace("_", " ")}</Badge>
                    {(request.status === "in_progress" || request.status === "draft") && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Copy signing link" onClick={() => copySigningLink(s.accessToken)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {s.signedAt && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Signed {format(new Date(s.signedAt), "MMM d, h:mm a")}</span>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="flex-1 overflow-auto px-6 pb-6">
          <div className="space-y-3 mt-4">
            {auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit events yet.</p>
            ) : (
              <ol className="relative border-l border-border ml-3 space-y-4">
                {auditLog.map((log) => (
                  <li key={log._id} className="ml-4">
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-primary" />
                    <p className="text-sm font-medium">{log.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.timestamp), "MMM d, yyyy · h:mm:ss a")}
                      {log.ipAddress ? ` · IP: ${log.ipAddress}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Create request dialog ────────────────────────────────────────────────────

function CreateRequestDialog({
  open,
  onClose,
  tenantId,
}: {
  open: boolean;
  onClose: () => void;
  tenantId: Id<"tenants">;
}) {
  const createRequest = useMutation(api.esignature.createRequest);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [signers, setSigners] = useState<SignerInput[]>([
    { name: "", email: "", role: "Applicant", order: 1 },
  ]);
  const [loading, setLoading] = useState(false);

  const addSigner = () => {
    setSigners((prev) => [...prev, { name: "", email: "", role: "", order: prev.length + 1 }]);
  };

  const removeSigner = (i: number) => {
    setSigners((prev) => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const updateSigner = (i: number, field: keyof SignerInput, value: string | number) => {
    setSigners((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (signers.some((s) => !s.name.trim() || !s.email.trim())) {
      toast.error("All signers need a name and email");
      return;
    }
    setLoading(true);
    try {
      await createRequest({
        tenantId,
        title: title.trim(),
        message: message.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        signers,
      });
      toast.success("Signing request created");
      onClose();
      setTitle(""); setMessage(""); setExpiresAt(""); setSigners([{ name: "", email: "", role: "Applicant", order: 1 }]);
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to create";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PenLine className="h-5 w-5" /> New Signing Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="sr-title">Title *</Label>
            <Input id="sr-title" placeholder="e.g. Grant Application — Signature Required" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sr-message">Message to signers (optional)</Label>
            <Textarea id="sr-message" placeholder="Please review and sign the attached document…" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sr-expires">Expiry date (optional)</Label>
            <Input id="sr-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Signers</Label>
              <Button size="sm" variant="ghost" onClick={addSigner} className="gap-1 h-7">
                <Plus className="h-3.5 w-3.5" /> Add signer
              </Button>
            </div>
            {signers.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end p-3 border rounded-lg bg-muted/30">
                <div className="space-y-1">
                  <Label className="text-xs">Name *</Label>
                  <Input placeholder="John Smith" value={s.name} onChange={(e) => updateSigner(i, "name", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email *</Label>
                  <Input placeholder="john@example.com" type="email" value={s.email} onChange={(e) => updateSigner(i, "email", e.target.value)} />
                </div>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => removeSigner(i)} disabled={signers.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Role (optional)</Label>
                  <Input placeholder="e.g. Applicant, Manager, Witness" value={s.role} onChange={(e) => updateSigner(i, "role", e.target.value)} />
                </div>
                <div className="text-xs text-muted-foreground pt-4 text-center">#{s.order}</div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
            Create Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Request card ─────────────────────────────────────────────────────────────

function RequestCard({
  req,
  onSelect,
  onDelete,
}: {
  req: SignatureRequest;
  onSelect: (id: Id<"signatureRequests">) => void;
  onDelete: (id: Id<"signatureRequests">) => void;
}) {
  const signers = useQuery(api.esignature.getSigners, { requestId: req._id });
  const signedCount = signers?.filter((s) => s.status === "signed").length ?? 0;
  const totalCount = signers?.length ?? 0;

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSelect(req._id)}>
      <CardContent className="py-4 px-5 flex items-start gap-4">
        <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
          <FileSignature className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate">{req.title}</p>
            <StatusBadge status={req.status} />
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{format(new Date(req.createdAt), "MMM d, yyyy")}</span>
            {signers ? (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />{signedCount}/{totalCount} signed
              </span>
            ) : <Skeleton className="h-3 w-16" />}
            {req.expiresAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />Expires {format(new Date(req.expiresAt), "MMM d")}
              </span>
            )}
          </div>
          {req.status === "in_progress" && signers && totalCount > 0 && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden w-full max-w-xs">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(signedCount / totalCount) * 100}%` }} />
            </div>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); onDelete(req._id); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ requests }: { requests: SignatureRequest[] }) {
  const total = requests.length;
  const inProgress = requests.filter((r) => r.status === "in_progress").length;
  const completed = requests.filter((r) => r.status === "completed").length;
  const draft = requests.filter((r) => r.status === "draft").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: "Total", value: total, icon: ClipboardList, color: "text-primary" },
        { label: "In Progress", value: inProgress, icon: Clock, color: "text-yellow-600" },
        { label: "Completed", value: completed, icon: CheckCircle2, color: "text-green-600" },
        { label: "Drafts", value: draft, icon: PenLine, color: "text-muted-foreground" },
      ].map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <Icon className={`h-5 w-5 ${color}`} />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main inner page ──────────────────────────────────────────────────────────

function ESignatureInner() {
  const { activeTenant } = useTenant();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"signatureRequests"> | null>(null);
  const [filter, setFilter] = useState<"all" | "draft" | "in_progress" | "completed" | "cancelled">("all");
  const [search, setSearch] = useState("");
  const deleteRequest = useMutation(api.esignature.deleteRequest);

  const requests = useQuery(
    api.esignature.listRequests,
    activeTenant ? { tenantId: activeTenant._id } : "skip",
  );

  if (!activeTenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select a tenant to manage eSignatures.</p>
      </div>
    );
  }

  if (requests === undefined) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  const handleDelete = async (id: Id<"signatureRequests">) => {
    try {
      await deleteRequest({ requestId: id });
      toast.success("Request deleted");
      if (selectedId === id) setSelectedId(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filtered = requests.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col lg:flex-row h-full gap-0">
      {/* Left panel */}
      <div className={`flex-1 overflow-auto p-6 ${selectedId ? "hidden lg:block lg:max-w-[55%]" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PenLine className="h-6 w-6 text-primary" /> eSignature
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Collect legally-binding signatures from multiple parties</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Request
          </Button>
        </div>

        <StatsBar requests={requests} />

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="Search requests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-1 flex-wrap">
            {(["all", "draft", "in_progress", "completed", "cancelled"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "ghost"}
                onClick={() => setFilter(f)}
                className="text-xs capitalize"
              >
                {f === "in_progress" ? "In Progress" : f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><FileSignature /></EmptyMedia>
              <EmptyTitle>{search || filter !== "all" ? "No matching requests" : "No signing requests yet"}</EmptyTitle>
              <EmptyDescription>Create a signing request to collect electronic signatures from one or more parties.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {filter === "all" && !search && (
                <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
                  <Plus className="h-4 w-4" /> New Request
                </Button>
              )}
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <RequestCard
                key={r._id}
                req={r}
                onSelect={setSelectedId}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right panel — detail */}
      {selectedId && (
        <div className="lg:w-[45%] border-l bg-background overflow-auto flex flex-col">
          <RequestDetail requestId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      )}

      <CreateRequestDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        tenantId={activeTenant._id}
      />
    </div>
  );
}

export default function ESignaturePage() {
  return (
    <>
      <AuthLoading>
        <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex items-center justify-center h-64 flex-col gap-4">
          <p className="text-muted-foreground">Sign in to manage eSignatures</p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <ESignatureInner />
      </Authenticated>
    </>
  );
}
