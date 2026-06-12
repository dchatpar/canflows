/**
 * GC Template Library page — browse and apply pre-built GC form templates.
 * Accessed from: /forms/templates
 */
import { useState, useMemo } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/contexts/tenant-context.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
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
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { motion } from "motion/react";
import {
  Sparkles, Search, FileText, ClipboardList, FileSearch, MessageSquareWarning,
  BadgeDollarSign, ShieldCheck, HeartHandshake, UserCheck, Star, ArrowLeft,
  Clock, ChevronRight, Building2, Wand2, Loader2,
} from "lucide-react";
import {
  GC_TEMPLATES, GC_TEMPLATE_CATEGORIES,
  type GCTemplate, type GCTemplateCategory,
} from "../_lib/gc-templates.ts";
import { createDefaultSchema } from "../_lib/form-schema.ts";

// ─── Icon map ─────────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  ClipboardList: ClipboardList,
  FileSearch: FileSearch,
  MessageSquareWarning: MessageSquareWarning,
  BadgeDollarSign: BadgeDollarSign,
  ShieldCheck: ShieldCheck,
  HeartHandshake: HeartHandshake,
  UserCheck: UserCheck,
  Star: Star,
};

// ─── AI Generator Dialog ──────────────────────────────────────────────────────
function AIGeneratorDialog({
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
  const generateForm = useAction(api.formAi.generateForm);
  const [prompt, setPrompt] = useState("");
  const [locale, setLocale] = useState<"en" | "fr" | "both">("en");
  const [loading, setLoading] = useState(false);

  const examplePrompts = [
    "Building permit application for the City of Ottawa",
    "Food handler certification renewal request",
    "Environmental incident report form for First Nations communities",
    "Employee onboarding checklist for federal departments",
    "Public consultation feedback form — bilingual",
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error("Please describe the form you need"); return; }
    setLoading(true);
    try {
      const schema = await generateForm({ prompt: prompt.trim(), locale });
      const parsed = JSON.parse(schema) as { title?: string; description?: string };
      const formId = await createForm({
        tenantId,
        name: parsed.title ?? "AI-Generated Form",
        description: parsed.description,
        initialSchema: schema,
      });
      toast.success("Form generated! Opening editor…");
      onClose();
      navigate(`/forms/${formId}/edit`);
    } catch (err) {
      const msg = err instanceof ConvexError
        ? (err.data as { message: string }).message
        : "Failed to generate form. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            AI Form Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-sm text-muted-foreground">
            Describe the form you need and our AI will generate a complete Government of Canada–style form for you.
          </p>

          <div className="space-y-1.5">
            <Label>What kind of form do you need?</Label>
            <Textarea
              placeholder="e.g. Permit application for small businesses operating near federal waterways"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="resize-none"
              disabled={loading}
            />
          </div>

          {/* Example prompts */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Examples:</p>
            <div className="flex flex-wrap gap-1.5">
              {examplePrompts.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  disabled={loading}
                  className="text-[11px] px-2 py-1 rounded-full border border-border bg-muted/50 hover:bg-muted hover:border-primary/30 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Language</Label>
            <Select value={locale} onValueChange={(v) => setLocale(v as typeof locale)} disabled={loading}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English only</SelectItem>
                <SelectItem value="fr">French only / Français</SelectItem>
                <SelectItem value="both">Bilingual (EN/FR)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Loader2 className="size-4 animate-spin text-primary" />
              Generating your form… this takes a few seconds.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
            {loading ? (
              <><Loader2 className="size-4 mr-2 animate-spin" />Generating…</>
            ) : (
              <><Wand2 className="size-4 mr-2" />Generate Form</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({ template, onUse }: { template: GCTemplate; onUse: () => void }) {
  const catMeta = GC_TEMPLATE_CATEGORIES[template.category];
  const Icon = CATEGORY_ICONS[catMeta.icon] ?? FileText;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col rounded-xl border border-border bg-background hover:border-primary/40 hover:shadow-md transition-all overflow-hidden"
    >
      {/* Header strip */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm leading-tight">{template.title}</h3>
          </div>
          <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1.5">
            {catMeta.label}
          </Badge>
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground px-4 pb-3 leading-relaxed flex-1">
        {template.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5 bg-muted/20">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="size-3" />
          ~{template.estimatedTime} min
          <span className="mx-1">·</span>
          {template.schema.pages.length} page{template.schema.pages.length !== 1 ? "s" : ""}
        </div>
        <Button size="sm" className="h-7 text-xs" onClick={onUse}>
          Use Template <ChevronRight className="size-3 ml-0.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Confirm use dialog ───────────────────────────────────────────────────────
function UseTemplateDialog({
  template,
  tenantId,
  onClose,
}: {
  template: GCTemplate;
  tenantId: Id<"tenants">;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const createForm = useMutation(api.forms.create);
  const [name, setName] = useState(template.title);
  const [saving, setSaving] = useState(false);

  const handleUse = async () => {
    if (!name.trim()) { toast.error("Form name is required"); return; }
    setSaving(true);
    try {
      const schema = { ...template.schema, title: name.trim() };
      const formId = await createForm({
        tenantId,
        name: name.trim(),
        description: template.description,
        initialSchema: JSON.stringify(schema),
      });
      toast.success("Form created from template");
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
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Use Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            A new form will be created from <strong>{template.title}</strong>. You can then customise it in the editor.
          </p>
          <div className="space-y-1.5">
            <Label>Form Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleUse} disabled={saving}>{saving ? "Creating…" : "Create & Edit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
function TemplateLibraryInner() {
  const navigate = useNavigate();
  const { activeTenant } = useTenant();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<GCTemplateCategory | "all">("all");
  const [aiOpen, setAiOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<GCTemplate | null>(null);

  const filtered = useMemo(() => {
    return GC_TEMPLATES.filter((t) => {
      if (activeCategory !== "all" && t.category !== activeCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [search, activeCategory]);

  if (!activeTenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <Building2 className="size-12 text-muted-foreground/40" />
        <p className="text-lg font-medium">No Organisation Selected</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Select or create an organisation in the Tenants section to use templates.
        </p>
        <Button onClick={() => navigate("/tenants")}>Go to Tenants</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => navigate("/forms")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" />
              Template Library
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {GC_TEMPLATES.length} Government of Canada templates · {activeTenant.name}
            </p>
          </div>
          <Button onClick={() => setAiOpen(true)}>
            <Sparkles className="size-4 mr-1.5" />
            AI Generate
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — categories */}
        <aside className="hidden md:flex w-52 flex-col border-r p-3 gap-0.5 overflow-y-auto shrink-0">
          <button
            onClick={() => setActiveCategory("all")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${activeCategory === "all" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            <FileText className="size-3.5 shrink-0" />
            All Templates
            <span className="ml-auto text-[11px]">{GC_TEMPLATES.length}</span>
          </button>
          {(Object.entries(GC_TEMPLATE_CATEGORIES) as [GCTemplateCategory, typeof GC_TEMPLATE_CATEGORIES[GCTemplateCategory]][]).map(([key, meta]) => {
            const Icon = CATEGORY_ICONS[meta.icon] ?? FileText;
            const count = GC_TEMPLATES.filter((t) => t.category === key).length;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${activeCategory === key ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{meta.label}</span>
                <span className="ml-auto text-[11px]">{count}</span>
              </button>
            );
          })}
        </aside>

        {/* Grid */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Mobile category tabs */}
          <div className="md:hidden mb-4">
            <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as typeof activeCategory)}>
              <TabsList className="flex overflow-x-auto w-full">
                <TabsTrigger value="all" className="shrink-0">All</TabsTrigger>
                {(Object.entries(GC_TEMPLATE_CATEGORIES) as [GCTemplateCategory, typeof GC_TEMPLATE_CATEGORIES[GCTemplateCategory]][]).map(([key, meta]) => (
                  <TabsTrigger key={key} value={key} className="shrink-0">{meta.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* AI highlight banner */}
          {!search && activeCategory === "all" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-4"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="size-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Can't find what you need?</p>
                <p className="text-xs text-muted-foreground">Use AI to generate a custom GC-style form from a text description in seconds.</p>
              </div>
              <Button size="sm" onClick={() => setAiOpen(true)}>
                <Wand2 className="size-3.5 mr-1.5" />
                Generate with AI
              </Button>
            </motion.div>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <FileText className="size-10 opacity-30" />
              <p className="text-sm">No templates match your search.</p>
              <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setActiveCategory("all"); }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={() => setSelectedTemplate(template)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {aiOpen && (
        <AIGeneratorDialog
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          tenantId={activeTenant._id}
        />
      )}

      {selectedTemplate && (
        <UseTemplateDialog
          template={selectedTemplate}
          tenantId={activeTenant._id}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  );
}

export default function TemplateLibraryPage() {
  return (
    <>
      <AuthLoading>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <p className="text-muted-foreground">Please sign in to continue.</p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <TemplateLibraryInner />
      </Authenticated>
    </>
  );
}
