/**
 * Tenant Management Console — Super Admin only.
 * Create, edit, delete tenants and manage member roles.
 */
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useLanguage } from "@/contexts/language-context.tsx";
import { useUserRole } from "@/hooks/use-user-role.ts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { Building2, Plus, Trash2, Pencil, Users, UserPlus, ShieldOff } from "lucide-react";
import { ConvexError } from "convex/values";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type TenantSummary = {
  _id: Id<"tenants">;
  name: string;
  slug: string;
  description?: string;
  primaryColor?: string;
  logoUrl?: string;
  createdAt: string;
  memberCount: number;
};

type TenantDetails = {
  _id: Id<"tenants">;
  name: string;
  slug: string;
  description?: string;
  primaryColor?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
  role: string;
  members: {
    _id: Id<"tenantMemberships">;
    userId: Id<"users">;
    name?: string;
    email?: string;
    role: string;
    invitedAt: string;
  }[];
};

const TENANT_ROLES = ["org_admin", "form_designer", "reviewer", "public"] as const;
type TenantRole = typeof TENANT_ROLES[number];

const ROLE_LABELS: Record<TenantRole, string> = {
  org_admin: "Org Admin",
  form_designer: "Form Designer",
  reviewer: "Reviewer",
  public: "Public",
};

// ─── Create/Edit dialog ───────────────────────────────────────────────────────

function TenantFormDialog({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: TenantSummary | null;
}) {
  const createTenant = useMutation(api.tenants.create);
  const updateTenant = useMutation(api.tenants.update);

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [primaryColor, setPrimaryColor] = useState(existing?.primaryColor ?? "#284162");
  const [saving, setSaving] = useState(false);

  const isEdit = !!existing;

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await updateTenant({ tenantId: existing._id, name, description: description || undefined, primaryColor });
        toast.success("Tenant updated");
      } else {
        await createTenant({ name, description: description || undefined, primaryColor });
        toast.success("Tenant created");
      }
      onClose();
    } catch (err) {
      const msg = err instanceof ConvexError
        ? (err.data as { message: string }).message
        : "Failed to save tenant";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Tenant" : "New Tenant"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="tenant-name">Organisation Name</Label>
            <Input id="tenant-name" placeholder="Health Canada" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tenant-desc">Description</Label>
            <Textarea id="tenant-desc" placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tenant-color">Accent Colour</Label>
            <div className="flex items-center gap-2">
              <input type="color" id="tenant-color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-input" />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 font-mono text-sm" placeholder="#284162" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save Changes" : "Create Tenant"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  tenantId,
  onRemoved,
}: {
  member: TenantDetails["members"][number];
  tenantId: Id<"tenants">;
  onRemoved: () => void;
}) {
  const upsertMembership = useMutation(api.tenants.upsertMembership);
  const removeMembership = useMutation(api.tenants.removeMembership);
  const [removing, setRemoving] = useState(false);

  const handleRoleChange = async (role: TenantRole) => {
    try {
      await upsertMembership({ tenantId, userId: member.userId, role });
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeMembership({ tenantId, userId: member.userId });
      toast.success("Member removed");
      onRemoved();
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
        {(member.name ?? member.email ?? "?")[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{member.name ?? "—"}</p>
        <p className="truncate text-xs text-muted-foreground">{member.email ?? member.userId}</p>
      </div>
      <Select value={member.role} onValueChange={(v) => handleRoleChange(v as TenantRole)}>
        <SelectTrigger className="w-36 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TENANT_ROLES.map((r) => (
            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" disabled={removing} onClick={handleRemove}>
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

// ─── Add member dialog ────────────────────────────────────────────────────────

function AddMemberDialog({
  open,
  onClose,
  tenantId,
}: {
  open: boolean;
  onClose: () => void;
  tenantId: Id<"tenants">;
}) {
  const allUsers = useQuery(api.users.listUsers, {});
  const upsertMembership = useMutation(api.tenants.upsertMembership);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [role, setRole] = useState<TenantRole>("public");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!selectedUserId) { toast.error("Select a user"); return; }
    setSaving(true);
    try {
      await upsertMembership({ tenantId, userId: selectedUserId as Id<"users">, role });
      toast.success("Member added");
      onClose();
    } catch (err) {
      const msg = err instanceof ConvexError
        ? (err.data as { message: string }).message
        : "Failed to add member";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user…" />
              </SelectTrigger>
              <SelectContent>
                {(allUsers ?? []).map((u) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.name ?? u.email ?? u._id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as TenantRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TENANT_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving}>{saving ? "Adding…" : "Add Member"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tenant detail panel ──────────────────────────────────────────────────────

function TenantDetail({
  tenantId,
  onClose,
}: {
  tenantId: Id<"tenants">;
  onClose: () => void;
}) {
  const tenants = useQuery(api.tenants.listAll, {});
  const tenant = tenants?.find((t) => t._id === tenantId);
  const detailQuery = useQuery(api.tenants.getBySlug, tenant ? { slug: tenant.slug } : "skip");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [, setRefresh] = useState(0);

  if (!tenant || !detailQuery) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b">
        <div
          className="flex size-10 items-center justify-center rounded-lg text-white font-bold text-lg"
          style={{ backgroundColor: tenant.primaryColor ?? "#284162" }}
        >
          {tenant.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{tenant.name}</h2>
          <p className="text-xs text-muted-foreground font-mono">{tenant.slug}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
          <Pencil className="size-3.5 mr-1" /> Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
      </div>

      {tenant.description && (
        <p className="px-4 pt-3 text-sm text-muted-foreground">{tenant.description}</p>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="size-4" /> Members ({detailQuery.members.length})
          </h3>
          <Button size="sm" onClick={() => setAddMemberOpen(true)}>
            <UserPlus className="size-3.5 mr-1" /> Add
          </Button>
        </div>

        {detailQuery.members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No members yet.</p>
        ) : (
          <div>
            {detailQuery.members.map((m) => (
              <MemberRow
                key={m._id}
                member={m}
                tenantId={tenantId}
                onRemoved={() => setRefresh((n) => n + 1)}
              />
            ))}
          </div>
        )}
      </div>

      {addMemberOpen && (
        <AddMemberDialog
          open={addMemberOpen}
          onClose={() => setAddMemberOpen(false)}
          tenantId={tenantId}
        />
      )}
      {editOpen && tenant && (
        <TenantFormDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          existing={tenant}
        />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function TenantsPageInner() {
  const { t } = useLanguage();
  const role = useUserRole();
  const tenants = useQuery(api.tenants.listAll, role === "super_admin" ? {} : "skip");
  const removeTenant = useMutation(api.tenants.remove);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"tenants"> | null>(null);
  const [deleting, setDeleting] = useState<Id<"tenants"> | null>(null);

  if (role === undefined) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  if (role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <ShieldOff className="size-12 text-muted-foreground" />
        <p className="text-lg font-medium">{t.forbidden}</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Only Super Admins can manage tenants.
        </p>
      </div>
    );
  }

  const handleDelete = async (id: Id<"tenants">, name: string) => {
    if (!confirm(`Delete tenant "${name}" and all its memberships? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await removeTenant({ tenantId: id });
      toast.success("Tenant deleted");
      if (selectedId === id) setSelectedId(null);
    } catch {
      toast.error("Failed to delete tenant");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* List panel */}
      <div className={`flex flex-col ${selectedId ? "hidden md:flex" : "flex"} w-full md:w-96 border-r overflow-y-auto`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="size-5 text-primary" /> Tenants
          </h1>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1" /> New
          </Button>
        </div>

        {!tenants ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : tenants.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
              <EmptyTitle>No tenants yet</EmptyTitle>
              <EmptyDescription>Create your first department or organisation</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-3.5 mr-1" />Create Tenant</Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="p-3 space-y-2">
            {tenants.map((t) => (
              <div
                key={t._id}
                onClick={() => setSelectedId(t._id)}
                className={`group flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition hover:border-primary/50 ${selectedId === t._id ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white font-bold text-sm"
                  style={{ backgroundColor: t.primaryColor ?? "#284162" }}
                >
                  {t.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-sm">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground font-mono">{t.slug}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <Users className="size-3 inline mr-0.5" />{t.memberCount} members
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-destructive opacity-0 group-hover:opacity-100 shrink-0"
                  disabled={deleting === t._id}
                  onClick={(e) => { e.stopPropagation(); void handleDelete(t._id, t.name); }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedId ? (
        <div className="flex-1 overflow-hidden">
          <TenantDetail tenantId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground text-sm">
          Select a tenant to view details
        </div>
      )}

      {createOpen && (
        <TenantFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}

export default function TenantsPage() {
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
        <TenantsPageInner />
      </Authenticated>
    </>
  );
}
