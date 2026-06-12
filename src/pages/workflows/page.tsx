import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { useState } from "react";
import {
  Workflow,
  Plus,
  PlayCircle,
  Trash2,
  KeyRound,
  Copy,
  LayoutTemplate,
  Zap,
  BrainCircuit,
  Database,
  Bell,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { workflowTemplates } from "@/data/workflowTemplates.ts";
import type { WorkflowTemplate } from "@/data/workflowTemplates.ts";

const CATEGORY_LABELS: Record<WorkflowTemplate["category"], string> = {
  automation: "Automation",
  ai: "AI",
  data: "Data",
  notification: "Notification",
};

const CATEGORY_COLORS: Record<WorkflowTemplate["category"], string> = {
  automation: "bg-blue-500/10 text-blue-600 border-blue-200",
  ai: "bg-purple-500/10 text-purple-600 border-purple-200",
  data: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  notification: "bg-orange-500/10 text-orange-600 border-orange-200",
};

const CATEGORY_ICONS: Record<WorkflowTemplate["category"], React.ReactNode> = {
  automation: <Zap className="size-3.5" />,
  ai: <BrainCircuit className="size-3.5" />,
  data: <Database className="size-3.5" />,
  notification: <Bell className="size-3.5" />,
};

function TemplatesDialog() {
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const importWorkflow = useMutation(api.workflows.importWorkflow);
  const navigate = useNavigate();

  const handleUseTemplate = async (template: WorkflowTemplate) => {
    setLoadingId(template.id);
    try {
      const workflowId = await importWorkflow({
        name: template.name,
        description: template.description,
        nodes: template.nodes,
        connections: template.connections,
      });
      toast.success(`"${template.name}" template applied`);
      setOpen(false);
      navigate(`/workflows/${workflowId}`);
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else {
        toast.error("Failed to create from template");
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <LayoutTemplate className="size-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workflow Templates</DialogTitle>
          <DialogDescription>
            Start with a pre-built template and customize it to your needs
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {workflowTemplates.map((template) => (
            <Card
              key={template.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold leading-snug">
                    {template.name}
                  </CardTitle>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${CATEGORY_COLORS[template.category]}`}
                  >
                    {CATEGORY_ICONS[template.category]}
                    {CATEGORY_LABELS[template.category]}
                  </span>
                </div>
                <CardDescription className="text-xs leading-relaxed">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {template.nodes.length} nodes · {template.connections.length} connections
                  </span>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleUseTemplate(template)}
                    disabled={loadingId === template.id}
                  >
                    {loadingId === template.id ? "Creating..." : "Use Template"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkflowsInner() {
  const workflows = useQuery(api.workflows.list, {});
  const stats = useQuery(api.executions.getStats, {});
  const createWorkflow = useMutation(api.workflows.create);
  const deleteWorkflow = useMutation(api.workflows.remove);
  const duplicateWorkflow = useMutation(api.workflows.duplicate);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a workflow name");
      return;
    }

    setIsCreating(true);
    try {
      const workflowId = await createWorkflow({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Workflow created");
      setOpen(false);
      setName("");
      setDescription("");
      navigate(`/workflows/${workflowId}`);
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else {
        toast.error("Failed to create workflow");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (workflowId: string, workflowName: string) => {
    if (!confirm(`Delete workflow "${workflowName}"?`)) return;

    try {
      await deleteWorkflow({ workflowId: workflowId as never });
      toast.success("Workflow deleted");
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else {
        toast.error("Failed to delete workflow");
      }
    }
  };

  const handleDuplicate = async (workflowId: string, workflowName: string) => {
    setDuplicatingId(workflowId);
    try {
      const newId = await duplicateWorkflow({ workflowId: workflowId as never });
      toast.success(`"${workflowName}" duplicated`);
      navigate(`/workflows/${newId}`);
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else {
        toast.error("Failed to duplicate workflow");
      }
    } finally {
      setDuplicatingId(null);
    }
  };

  if (!workflows) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">My Workflows</h2>
          <p className="text-muted-foreground">
            Create and manage your automation workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TemplatesDialog />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" />
                New Workflow
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Workflow</DialogTitle>
                <DialogDescription>
                  Give your workflow a name and description
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="My Workflow"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What does this workflow do?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="w-full"
                >
                  {isCreating ? "Creating..." : "Create Workflow"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (workflows.length > 0 || stats.total > 0) && (
        <div className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground border rounded-lg px-4 py-2.5 bg-muted/30">
          <span>
            <span className="font-semibold text-foreground">{workflows.length}</span>{" "}
            {workflows.length === 1 ? "workflow" : "workflows"}
          </span>
          {stats.total > 0 && (
            <>
              <div className="h-4 w-px bg-border" />
              <span>
                <span className="font-semibold text-foreground">{stats.total}</span> total runs
              </span>
              <div className="h-4 w-px bg-border" />
              <span>
                <span
                  className={`font-semibold ${stats.successRate >= 80 ? "text-green-600" : stats.successRate >= 50 ? "text-yellow-600" : "text-red-600"}`}
                >
                  {stats.successRate}%
                </span>{" "}
                success rate
              </span>
              {stats.running > 0 && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="font-semibold text-foreground">{stats.running}</span> running
                  </span>
                </>
              )}
            </>
          )}
        </div>
      )}

      {workflows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Workflow />
            </EmptyMedia>
            <EmptyTitle>No workflows yet</EmptyTitle>
            <EmptyDescription>
              Create your first workflow or start from a template
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setOpen(true)}>
                Create Workflow
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow._id}
              workflow={workflow}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              isDuplicating={duplicatingId === workflow._id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type WorkflowCardWorkflow = {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  updatedAt: string;
};

function WorkflowCard({
  workflow,
  onDelete,
  onDuplicate,
  isDuplicating,
}: {
  workflow: WorkflowCardWorkflow;
  onDelete: (id: string, name: string) => void;
  onDuplicate: (id: string, name: string) => void;
  isDuplicating: boolean;
}) {
  const executions = useQuery(api.executions.list, {
    workflowId: workflow._id as never,
  });

  const lastExecution = executions?.[0];
  const lastStatus = lastExecution?.status;

  const statusDot =
    lastStatus === "success"
      ? "bg-green-500"
      : lastStatus === "failed"
        ? "bg-red-500"
        : lastStatus === "running"
          ? "bg-blue-500 animate-pulse"
          : "bg-muted-foreground/30";

  const statusTitle =
    lastStatus === "success"
      ? "Last run succeeded"
      : lastStatus === "failed"
        ? "Last run failed"
        : lastStatus === "running"
          ? "Currently running"
          : "Never run";

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="line-clamp-1">{workflow.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {workflow.description || "No description"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`size-2 rounded-full cursor-default ${statusDot}`} />
              </TooltipTrigger>
              <TooltipContent>{statusTitle}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`size-2 rounded-full cursor-default ${workflow.isActive ? "bg-green-500" : "bg-muted"}`} />
              </TooltipTrigger>
              <TooltipContent>{workflow.isActive ? "Workflow is active — triggers can fire" : "Workflow is inactive — triggers are paused"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild className="flex-1 gap-2">
                <Link to={`/workflows/${workflow._id}`}>
                  <PlayCircle className="size-4" />
                  Open
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open the visual editor for this workflow</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                disabled={isDuplicating}
                onClick={() => onDuplicate(workflow._id, workflow.name)}
                className="cursor-pointer"
              >
                <Copy className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate this workflow — creates an identical copy you can edit independently</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => onDelete(workflow._id, workflow.name)}
                className="cursor-pointer"
              >
                <Trash2 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Permanently delete this workflow and all its nodes and history</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Updated {new Date(workflow.updatedAt).toLocaleDateString()}
          </p>
          {lastStatus && (
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 ${lastStatus === "success" ? "text-green-600" : lastStatus === "failed" ? "text-red-600" : lastStatus === "running" ? "text-blue-600" : ""}`}
            >
              {lastStatus}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Workflows() {
  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto px-4 py-8">
        <Unauthenticated>
          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                Please sign in to access your workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignInButton>
                <Button className="w-full">Sign In</Button>
              </SignInButton>
            </CardContent>
          </Card>
        </Unauthenticated>

        <AuthLoading>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </AuthLoading>

        <Authenticated>
          <WorkflowsInner />
        </Authenticated>
      </div>
    </div>
  );
}
