/**
 * Forms list page — browse, create, and manage forms within the active tenant.
 * Route: /forms
 */
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/contexts/tenant-context.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format } from "date-fns";
import {
  Plus, FileText, MoreVertical, Pencil, Archive, Trash2, Globe, GlobeLock,
  Search, Building2, ClipboardList, Share2, Workflow,
} from "lucide-react";
import { createDefaultSchema } from "./_lib/form-schema.ts";

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800 border-yellow-200",
    published: "bg-green-100 text-green-800 border-green-200",
    archived: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls[status] ?? cls.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Create form dialog ───────────────────────────────────────────────────────
function CreateFormDialog({
  open,
  onClose,
  tenantId,
}: {
  open: boolean;
  onClose: () => void;
  tenantId: Id<"tenants">;
}) {
  const navigate = useNavigate();
  const createForm = useMutation(api.forms.create);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Form name is required"); return; }
    setSaving(true);
    try {
      const initialSchema = JSON.stringify(createDefaultSchema());
      const formId = await createForm({ tenantId, name: name.trim(), description: description || undefined, initialSchema });
      toast.success("Form created");
      onClose();
      navigate(`/forms/${formId}/edit`);
    } catch (err) {
      const msg = err instanceof ConvexError ? (err.data as { message: string }).message : "Failed to create form";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Form</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="form-name">Form Name</Label>
            <Input id="form-name" placeholder="e.g. Permit Application" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="form-desc">Description (optional)</Label>
            <Textarea id="form-desc" placeholder="Brief description…" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating…" : "Create & Edit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Form card ────────────────────────────────────────────────────────────────
type FormSummary = {
  _id: Id<"forms">;
  name: string;
  description?: string;
  status: string;
  draftVersion: number;
  publishedVersion?: number;
  createdAt: string;
  updatedAt: string;
};

function FormCard({ form, onEdit, onShare, onIntegrations, onArchive, onDelete }: {
  form: FormSummary;
  onEdit: () => void;
  onShare: () => void;
  onIntegrations: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const publishMut = useMutation(api.forms.publish);
  const unpublishMut = useMutation(api.forms.unpublish);

  const handlePublish = async () => {
    try {
      await publishMut({ formId: form._id });
      toast.success("Form published");
    } catch { toast.error("Failed to publish"); }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishMut({ formId: form._id });
      toast.success("Form unpublished");
    } catch { toast.error("Failed to unpublish"); }
  };

  return (
    <div className="group flex items-start gap-4 rounded-xl border border-border bg-background p-4 hover:border-primary/40 transition-all hover:shadow-sm">
      {/* Icon */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <FileText className="size-5 text-primary" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onEdit()}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{form.name}</span>
          <StatusBadge status={form.status} />
          <span className="text-[11px] text-muted-foreground">v{form.draftVersion}</span>
        </div>
        {form.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{form.description}</p>
        )}
        <p className="text-[11px] text-muted-foreground mt-1">
          Updated {format(new Date(form.updatedAt), "MMM d, yyyy")}
        </p>
      </div>

      {/* Quick share button */}
      <Button
        size="icon"
        variant="ghost"
        className="size-7 shrink-0 opacity-0 group-hover:opacity-100"
        onClick={(e) => { e.stopPropagation(); onShare(); }}
        title="Share / QR Code"
      >
        <Share2 className="size-3.5" />
      </Button>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="size-7 shrink-0 opacity-0 group-hover:opacity-100">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}><Pencil className="size-3.5 mr-2" />Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={onShare}><Share2 className="size-3.5 mr-2" />Share / QR Code</DropdownMenuItem>
          <DropdownMenuItem onClick={onIntegrations}><Workflow className="size-3.5 mr-2" />Workflow Integrations</DropdownMenuItem>
          {form.status === "published" ? (
            <DropdownMenuItem onClick={handleUnpublish}><GlobeLock className="size-3.5 mr-2" />Unpublish</DropdownMenuItem>
          ) : form.status === "draft" ? (
            <DropdownMenuItem onClick={handlePublish}><Globe className="size-3.5 mr-2" />Publish</DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          {form.status !== "archived" && (
            <DropdownMenuItem onClick={onArchive}><Archive className="size-3.5 mr-2" />Archive</DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="size-3.5 mr-2" />Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
function FormsPageInner() {
  const navigate = useNavigate();
  const { activeTenant } = useTenant();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");

  const forms = useQuery(
    api.forms.listByTenant,
    activeTenant ? { tenantId: activeTenant._id } : "skip",
  );

  const archiveForm = useMutation(api.forms.archive);
  const deleteForm = useMutation(api.forms.remove);

  const handleArchive = async (formId: Id<"forms">) => {
    try {
      await archiveForm({ formId });
      toast.success("Form archived");
    } catch { toast.error("Failed to archive form"); }
  };

  const handleDelete = async (formId: Id<"forms">, name: string) => {
    if (!confirm(`Delete "${name}" permanently? This cannot be undone.`)) return;
    try {
      await deleteForm({ formId });
      toast.success("Form deleted");
    } catch (err) {
      const msg = err instanceof ConvexError ? (err.data as { message: string }).message : "Failed to delete";
      toast.error(msg);
    }
  };

  const filtered = (forms ?? []).filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (!activeTenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <Building2 className="size-12 text-muted-foreground/40" />
        <p className="text-lg font-medium">No Organisation Selected</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Select or create an organisation in the Tenants section to manage forms.
        </p>
        <Button onClick={() => navigate("/tenants")}>Go to Tenants</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              Forms
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeTenant.name} · {forms?.length ?? 0} form{forms?.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/forms/templates")}>
              <ClipboardList className="size-4 mr-1.5" /> Templates
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4 mr-1" /> New Form
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-3 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search forms…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!forms ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          search ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No forms matching "{search}"
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><FileText /></EmptyMedia>
                <EmptyTitle>No forms yet</EmptyTitle>
                <EmptyDescription>Start from a blank form or pick a GC template</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate("/forms/templates")}>
                    <ClipboardList className="size-3.5 mr-1.5" />Browse Templates
                  </Button>
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-3.5 mr-1" />Blank Form
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          )
        ) : (
          <div className="space-y-2">
            {filtered.map((form) => (
              <FormCard
                key={form._id}
                form={form}
                onEdit={() => navigate(`/forms/${form._id}/edit`)}
                onShare={() => navigate(`/forms/${form._id}/share`)}
                onIntegrations={() => navigate(`/forms/${form._id}/integrations`)}
                onArchive={() => handleArchive(form._id)}
                onDelete={() => handleDelete(form._id, form.name)}
              />
            ))}
          </div>
        )}
      </div>

      {activeTenant && createOpen && (
        <CreateFormDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          tenantId={activeTenant._id}
        />
      )}
    </div>
  );
}

export default function FormsPage() {
  return (
    <>
      <AuthLoading>
        <div className="p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <p className="text-muted-foreground">Please sign in to continue.</p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <FormsPageInner />
      </Authenticated>
    </>
  );
}
