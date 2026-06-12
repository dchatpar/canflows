import { useQuery, useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useUserRole, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_BADGE_COLORS } from "@/hooks/use-user-role.ts";
import type { UserRole } from "@/hooks/use-user-role.ts";
import { useLanguage } from "@/contexts/language-context.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Users,
  ShieldCheck,
  Search,
  Trash2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";

const ROLES: UserRole[] = ["super_admin", "org_admin", "form_designer", "reviewer", "public"];

// Permission matrix rows
const PERMISSIONS = [
  { label: "Submit public forms", super_admin: true, org_admin: true, form_designer: true, reviewer: true, public: true },
  { label: "View dashboard", super_admin: true, org_admin: true, form_designer: true, reviewer: true, public: false },
  { label: "View submissions", super_admin: true, org_admin: true, form_designer: true, reviewer: true, public: false },
  { label: "Process submissions", super_admin: true, org_admin: true, form_designer: false, reviewer: true, public: false },
  { label: "Create & edit forms", super_admin: true, org_admin: true, form_designer: true, reviewer: false, public: false },
  { label: "Create & edit workflows", super_admin: true, org_admin: true, form_designer: true, reviewer: false, public: false },
  { label: "Manage credentials", super_admin: true, org_admin: true, form_designer: true, reviewer: false, public: false },
  { label: "View process intelligence", super_admin: true, org_admin: true, form_designer: false, reviewer: false, public: false },
  { label: "Manage users & roles", super_admin: true, org_admin: true, form_designer: false, reviewer: false, public: false },
  { label: "System settings", super_admin: true, org_admin: false, form_designer: false, reviewer: false, public: false },
  { label: "Assign Super Admin role", super_admin: true, org_admin: false, form_designer: false, reviewer: false, public: false },
];

function PermissionMatrix() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-primary" />
          Permission Matrix
        </CardTitle>
        <CardDescription>Fine-grained capabilities per role</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Capability</th>
                {ROLES.map((role) => (
                  <th key={role} className="px-3 py-3 text-center font-medium">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", ROLE_BADGE_COLORS[role])}>
                      {ROLE_LABELS[role]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((perm, i) => (
                <tr key={i} className={cn("border-b last:border-0", i % 2 === 0 ? "bg-white" : "bg-muted/20")}>
                  <td className="px-4 py-2.5 text-foreground">{perm.label}</td>
                  {ROLES.map((role) => (
                    <td key={role} className="px-3 py-2.5 text-center">
                      {(perm as Record<string, boolean | string>)[role] ? (
                        <span className="inline-flex size-5 items-center justify-center rounded-full bg-green-100 text-green-700">✓</span>
                      ) : (
                        <span className="inline-flex size-5 items-center justify-center rounded-full bg-gray-100 text-gray-400 text-xs">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

type UserRow = {
  _id: Id<"users">;
  _creationTime?: number;
  name?: string;
  email?: string;
  role: UserRole;
};

function UserTable({ currentUserId }: { currentUserId: Id<"users"> | undefined }) {
  const users = useQuery(api.users.listUsers);
  const updateRole = useMutation(api.users.updateUserRole);
  const deleteUser = useMutation(api.users.deleteUser);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [updatingId, setUpdatingId] = useState<Id<"users"> | null>(null);

  const filtered = (users ?? []).filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role.includes(q)
    );
  }) as UserRow[];

  const handleRoleChange = async (userId: Id<"users">, role: UserRole) => {
    setUpdatingId(userId);
    try {
      await updateRole({ userId, role });
      toast.success("Role updated");
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Failed to update role");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser({ userId: deleteTarget._id });
      toast.success("User removed");
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Failed to delete user");
      }
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-primary" />
              User Management
            </CardTitle>
            <CardDescription>
              {users ? `${users.length} users` : "Loading…"}
            </CardDescription>
          </div>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search users…"
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {users === undefined ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Joined</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((user) => (
                      <tr key={user._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                              {user.name?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <p className="font-medium text-foreground leading-tight">
                                {user.name ?? "Unknown"}
                                {user._id === currentUserId && (
                                  <span className="ml-1.5 text-[10px] text-muted-foreground">(you)</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">{user.email ?? "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={user.role}
                            onValueChange={(v) => handleRoleChange(user._id, v as UserRole)}
                            disabled={updatingId === user._id}
                          >
                            <SelectTrigger className="h-7 w-40 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r} className="text-xs">
                                  {ROLE_LABELS[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                          {user._creationTime ? format(new Date(user._creationTime as number), "MMM d, yyyy") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                            onClick={() => setDeleteTarget(user)}
                            disabled={user._id === currentUserId}
                            title="Remove user"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Remove user?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name ?? deleteTarget?.email ?? "this user"}</strong> and their access. Their workflows will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AdminPageInner() {
  const role = useUserRole();
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isLoading = role === undefined;
  const isAdmin = role === "super_admin" || role === "org_admin";

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <ShieldCheck className="size-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          You need Org Admin or Super Admin role to access user management.
        </p>
        <Button onClick={() => navigate("/workflows")}>Back to Workflows</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          User &amp; Role Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage platform users and their access levels. Role assignments take effect immediately.
        </p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {ROLES.map((role) => (
          <div
            key={role}
            className="rounded-lg border p-3 space-y-1.5"
          >
            <span className={cn("inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", ROLE_BADGE_COLORS[role])}>
              {ROLE_LABELS[role]}
            </span>
            <p className="text-xs text-muted-foreground leading-snug">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2.5 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <Info className="size-4 mt-0.5 shrink-0" />
        <span>
          Role changes are enforced server-side immediately. The first user to sign up is automatically assigned <strong>Super Admin</strong>.
        </span>
      </div>

      {/* User table */}
      <UserTable currentUserId={currentUser?._id} />

      {/* Permission matrix */}
      <PermissionMatrix />
    </div>
  );
}

export default function AdminPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center gap-4 p-12">
          <SignInButton />
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="space-y-4 p-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </AuthLoading>
      <Authenticated>
        <AdminPageInner />
      </Authenticated>
    </>
  );
}
