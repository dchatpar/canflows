import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  KeyRound,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { cn } from "@/lib/utils.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

type CredentialType =
  | "apiKey"
  | "bearerToken"
  | "basicAuth"
  | "httpHeader"
  | "oauth2ClientCredentials";

const CREDENTIAL_TYPES: { value: CredentialType; label: string }[] = [
  { value: "apiKey", label: "API Key" },
  { value: "bearerToken", label: "Bearer Token" },
  { value: "basicAuth", label: "Basic Auth" },
  { value: "httpHeader", label: "HTTP Header" },
  { value: "oauth2ClientCredentials", label: "OAuth2 Client Credentials" },
];

const TYPE_BADGE: Record<CredentialType, string> = {
  apiKey: "bg-indigo-100 text-indigo-700 border-indigo-200",
  bearerToken: "bg-blue-100 text-blue-700 border-blue-200",
  basicAuth: "bg-green-100 text-green-700 border-green-200",
  httpHeader: "bg-amber-100 text-amber-700 border-amber-200",
  oauth2ClientCredentials:
    "bg-purple-100 text-purple-700 border-purple-200",
};

type CredentialFields = Record<string, string>;

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  optional?: boolean;
}

const TYPE_FIELDS: Record<CredentialType, FieldDef[]> = {
  apiKey: [
    { key: "key", label: "Header Name", placeholder: "X-API-Key" },
    { key: "value", label: "API Key Value", placeholder: "sk-…", secret: true },
  ],
  bearerToken: [
    { key: "token", label: "Token", placeholder: "eyJ…", secret: true },
  ],
  basicAuth: [
    { key: "username", label: "Username", placeholder: "john.doe" },
    { key: "password", label: "Password", placeholder: "••••••••", secret: true },
  ],
  httpHeader: [
    { key: "headerName", label: "Header Name", placeholder: "X-Custom-Header" },
    { key: "headerValue", label: "Header Value", placeholder: "my-value", secret: true },
  ],
  oauth2ClientCredentials: [
    { key: "tokenUrl", label: "Token URL", placeholder: "https://auth.example.com/oauth/token" },
    { key: "clientId", label: "Client ID", placeholder: "my-client-id" },
    { key: "clientSecret", label: "Client Secret", placeholder: "••••••••", secret: true },
    { key: "scope", label: "Scope", placeholder: "read write", optional: true },
  ],
};

// ─── Credential Dialog ────────────────────────────────────────────────────────

type DialogMode =
  | { mode: "create" }
  | { mode: "edit"; credentialId: Id<"credentials">; existingName: string; existingType: CredentialType };

interface CredentialDialogProps {
  open: boolean;
  dialogMode: DialogMode;
  onClose: () => void;
}

function CredentialDialog({ open, dialogMode, onClose }: CredentialDialogProps) {
  const isEdit = dialogMode.mode === "edit";

  const [name, setName] = useState(isEdit ? dialogMode.existingName : "");
  const [type, setType] = useState<CredentialType>(
    isEdit ? dialogMode.existingType : "apiKey"
  );
  const [fields, setFields] = useState<CredentialFields>({});
  const [saving, setSaving] = useState(false);

  const createCredential = useMutation(api.credentials.create);
  const updateCredential = useMutation(api.credentials.update);

  const fieldDefs = TYPE_FIELDS[type];

  const handleTypeChange = (val: string) => {
    setType(val as CredentialType);
    setFields({});
  };

  const handleFieldChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a credential name");
      return;
    }

    // Validate required fields (skip if editing and field is blank — means keep existing)
    if (!isEdit) {
      for (const fd of fieldDefs) {
        if (!fd.optional && !fields[fd.key]?.trim()) {
          toast.error(`Please fill in "${fd.label}"`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      if (isEdit) {
        // Only include fields that were actually filled in (non-empty means user wants to update)
        const updatedData = Object.fromEntries(
          Object.entries(fields).filter(([, v]) => v.trim() !== "")
        );
        await updateCredential({
          credentialId: dialogMode.credentialId,
          name: name.trim(),
          ...(Object.keys(updatedData).length > 0 ? { data: updatedData } : {}),
        });
        toast.success("Credential updated");
      } else {
        await createCredential({ name: name.trim(), type, data: fields });
        toast.success("Credential created");
      }
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { message: string };
        toast.error(message);
      } else {
        toast.error("Failed to save credential");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Credential" : "Add Credential"}</DialogTitle>
          <DialogDescription>
            Values are stored securely and never displayed after saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cred-name">Name</Label>
            <Input
              id="cred-name"
              placeholder="My API Key"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Type selector — locked when editing */}
          <div className="space-y-1.5">
            <Label htmlFor="cred-type">Type</Label>
            <Select value={type} onValueChange={handleTypeChange} disabled={isEdit}>
              <SelectTrigger id="cred-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREDENTIAL_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic fields */}
          {fieldDefs.map((fd) => (
            <div key={fd.key} className="space-y-1.5">
              <Label htmlFor={`cred-${fd.key}`}>
                {fd.label}
                {fd.optional && (
                  <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
                )}
              </Label>
              <Input
                id={`cred-${fd.key}`}
                type={fd.secret ? "password" : "text"}
                placeholder={isEdit && fd.secret ? "••••••••" : fd.placeholder}
                value={fields[fd.key] ?? ""}
                onChange={(e) => handleFieldChange(fd.key, e.target.value)}
                autoComplete="off"
              />
            </div>
          ))}

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0" />
            Values are stored securely and never displayed after saving.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Credentials List ─────────────────────────────────────────────────────────

function CredentialsList() {
  const credentials = useQuery(api.credentials.list, {});
  const removeCredential = useMutation(api.credentials.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>({ mode: "create" });
  const [deleteTarget, setDeleteTarget] = useState<Id<"credentials"> | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setDialogMode({ mode: "create" });
    setDialogOpen(true);
  };

  const openEdit = (id: Id<"credentials">, name: string, type: string) => {
    setDialogMode({
      mode: "edit",
      credentialId: id,
      existingName: name,
      existingType: type as CredentialType,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeCredential({ credentialId: deleteTarget });
      toast.success("Credential deleted");
    } catch {
      toast.error("Failed to delete credential");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Credentials</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage API keys and authentication secrets used by your workflows.
          </p>
        </div>
        <Button onClick={openCreate} className="cursor-pointer">
          <Plus className="size-4 mr-1.5" />
          Add Credential
        </Button>
      </div>

      {/* Loading */}
      {credentials === undefined && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {credentials !== undefined && credentials.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <KeyRound />
            </EmptyMedia>
            <EmptyTitle>No credentials yet</EmptyTitle>
            <EmptyDescription>
              Add your first credential to use in workflow nodes.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={openCreate} className="cursor-pointer">
              <Plus className="size-3.5 mr-1" />
              Add Credential
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {/* List */}
      {credentials !== undefined && credentials.length > 0 && (
        <ul className="space-y-3">
          {credentials.map((cred) => (
            <li
              key={cred._id}
              className="flex items-center justify-between gap-4 rounded-lg border bg-card px-5 py-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{cred.name}</span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      TYPE_BADGE[cred.type as CredentialType] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {CREDENTIAL_TYPES.find((t) => t.value === cred.type)?.label ?? cred.type}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Added {format(new Date(cred.createdAt), "MMM d, yyyy")}
                  {cred.updatedAt !== cred.createdAt &&
                    ` · Updated ${format(new Date(cred.updatedAt), "MMM d, yyyy")}`}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="cursor-pointer"
                      onClick={() => openEdit(cred._id, cred.name, cred.type)}
                    >
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit credential name or update secret values</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="cursor-pointer text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(cred._id)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete this credential — workflow nodes using it will stop working</TooltipContent>
                </Tooltip>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add/Edit dialog */}
      {dialogOpen && (
        <CredentialDialog
          open={dialogOpen}
          dialogMode={dialogMode}
          onClose={() => setDialogOpen(false)}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete credential?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Any workflow nodes using this credential will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CredentialsPage() {
  return (
    <div className="min-h-full bg-background">

      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">Sign in to manage credentials.</p>
          <SignInButton />
        </div>
      </Unauthenticated>

      <AuthLoading>
        <div className="container mx-auto px-4 py-8 max-w-3xl space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </AuthLoading>

      <Authenticated>
        <CredentialsList />
      </Authenticated>
    </div>
  );
}
