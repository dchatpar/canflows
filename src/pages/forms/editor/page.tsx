/**
 * Form Builder editor — full drag-and-drop form design interface.
 * Route: /forms/:formId/edit
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Authenticated, AuthLoading } from "convex/react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  ArrowLeft, Save, Upload, Eye, History, Plus, Loader2, EyeOff,
} from "lucide-react";

import type { FormSchema, FormField, FormPage, FieldType } from "../_lib/form-schema.ts";
import { createDefaultField, createDefaultPage } from "../_lib/form-schema.ts";
import FieldPalette from "../_components/FieldPalette.tsx";
import FormCanvas, { PageTab } from "../_components/FormCanvas.tsx";
import FieldEditor from "../_components/FieldEditor.tsx";
import FormSettings from "../_components/FormSettings.tsx";
import VersionHistory from "../_components/VersionHistory.tsx";
import FieldPreview from "../_components/FieldPreview.tsx";

// ─── Auto-save delay ──────────────────────────────────────────────────────────
const AUTO_SAVE_DELAY = 2000;

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800 border-yellow-200",
    published: "bg-green-100 text-green-800 border-green-200",
    archived: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${variants[status] ?? variants.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────
function Toolbar({
  formName,
  status,
  draftVersion,
  saving,
  previewing,
  showHistory,
  onBack,
  onSave,
  onPublish,
  onUnpublish,
  onPreview,
  onToggleHistory,
}: {
  formName: string;
  status: string;
  draftVersion: number;
  saving: boolean;
  previewing: boolean;
  showHistory: boolean;
  onBack: () => void;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onPreview: () => void;
  onToggleHistory: () => void;
}) {
  return (
    <header className="flex items-center gap-3 border-b bg-background px-4 py-2.5 shrink-0">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
        <ArrowLeft className="size-4" /> Forms
      </button>
      <div className="w-px h-4 bg-border" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate">{formName}</span>
          <StatusBadge status={status} />
          <span className="text-xs text-muted-foreground">v{draftVersion}</span>
          {saving && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onToggleHistory} className={showHistory ? "text-primary" : ""}>
          <History className="size-3.5 mr-1" /> History
        </Button>
        <Button size="sm" variant="ghost" onClick={onPreview}>
          {previewing ? <EyeOff className="size-3.5 mr-1" /> : <Eye className="size-3.5 mr-1" />}
          {previewing ? "Edit" : "Preview"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onSave}>
          <Save className="size-3.5 mr-1" /> Save
        </Button>
        {status === "published" ? (
          <Button size="sm" variant="ghost" onClick={onUnpublish}>Unpublish</Button>
        ) : (
          <Button size="sm" onClick={onPublish}>
            <Upload className="size-3.5 mr-1" /> Publish
          </Button>
        )}
      </div>
    </header>
  );
}

// ─── Preview modal ────────────────────────────────────────────────────────────
function PreviewPanel({ schema, onClose }: { schema: FormSchema; onClose: () => void }) {
  const [currentPage, setCurrentPage] = useState(0);
  const pages = schema.pages;
  const page = pages[currentPage];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <h2 className="font-semibold">{schema.title}</h2>
            {schema.settings.multiPage && (
              <p className="text-xs text-muted-foreground">
                Page {currentPage + 1} of {pages.length}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
        </div>

        {schema.settings.multiPage && schema.settings.showProgressBar && (
          <div className="h-1.5 bg-muted mx-5 mt-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {schema.description && <p className="text-sm text-muted-foreground">{schema.description}</p>}
          {page?.fields.map((field) => (
            <FieldPreview key={field.id} field={field} />
          ))}
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Back
          </Button>
          {currentPage < pages.length - 1 ? (
            <Button size="sm" onClick={() => setCurrentPage((p) => p + 1)}>Next</Button>
          ) : (
            <Button size="sm">{schema.settings.submitLabel || "Submit"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page toolbar ─────────────────────────────────────────────────────────────
function PageToolbar({
  schema,
  activePageIndex,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
}: {
  schema: FormSchema;
  activePageIndex: number;
  onSelectPage: (i: number) => void;
  onAddPage: () => void;
  onRenamePage: (i: number, title: string) => void;
  onDeletePage: (i: number) => void;
}) {
  if (!schema.settings.multiPage && schema.pages.length === 1) return null;

  return (
    <div className="flex items-center gap-0.5 border-b bg-muted/30 px-4 overflow-x-auto">
      {schema.pages.map((page, i) => (
        <PageTab
          key={page.id}
          page={page}
          active={activePageIndex === i}
          index={i}
          onClick={() => onSelectPage(i)}
          onRename={(title) => onRenamePage(i, title)}
          onDelete={() => onDeletePage(i)}
          canDelete={schema.pages.length > 1}
        />
      ))}
      <button
        onClick={onAddPage}
        className="flex items-center gap-1 px-2 py-2 text-xs text-muted-foreground hover:text-primary transition"
        title="Add page"
      >
        <Plus className="size-3.5" /> Page
      </button>
    </div>
  );
}

// ─── Builder inner (authenticated) ───────────────────────────────────────────
function BuilderInner({ formId }: { formId: Id<"forms"> }) {
  const navigate = useNavigate();
  const form = useQuery(api.forms.getById, { formId });
  const rawSchema = useQuery(api.forms.getDraftSchema, { formId });
  const autoSave = useMutation(api.forms.autoSave);
  const saveDraft = useMutation(api.forms.saveDraft);
  const publishForm = useMutation(api.forms.publish);
  const unpublishForm = useMutation(api.forms.unpublish);

  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragActiveType, setDragActiveType] = useState<FieldType | null>(null);
  const [dragActiveField, setDragActiveField] = useState<FormField | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load schema from DB on first load
  useEffect(() => {
    if (rawSchema && !schema) {
      try {
        setSchema(JSON.parse(rawSchema) as FormSchema);
      } catch {
        toast.error("Failed to parse form schema");
      }
    }
  }, [rawSchema, schema]);

  // Auto-save on schema changes
  const scheduleAutoSave = useCallback(
    (s: FormSchema) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          await autoSave({ formId, schema: JSON.stringify(s) });
        } catch {
          // silently ignore auto-save failures
        } finally {
          setSaving(false);
        }
      }, AUTO_SAVE_DELAY);
    },
    [autoSave, formId],
  );

  const updateSchema = useCallback(
    (updated: FormSchema) => {
      setSchema(updated);
      scheduleAutoSave(updated);
    },
    [scheduleAutoSave],
  );

  // ─── Field operations ──────────────────────────────────────────────────────

  const addField = useCallback(
    (type: FieldType, pageIndex: number) => {
      if (!schema) return;
      const newField = createDefaultField(type, crypto.randomUUID());
      const pages = schema.pages.map((p: FormPage, i: number) =>
        i === pageIndex ? { ...p, fields: [...p.fields, newField] } : p,
      );
      const updated = { ...schema, pages };
      updateSchema(updated);
      setSelectedFieldId(newField.id);
    },
    [schema, updateSchema],
  );

  const updateField = useCallback(
    (updated: FormField) => {
      if (!schema) return;
      const pages = schema.pages.map((p: FormPage, i: number) =>
        i === activePageIndex
          ? { ...p, fields: p.fields.map((f: FormField) => (f.id === updated.id ? updated : f)) }
          : p,
      );
      updateSchema({ ...schema, pages });
    },
    [schema, activePageIndex, updateSchema],
  );

  const deleteField = useCallback(
    (fieldId: string) => {
      if (!schema) return;
      const pages = schema.pages.map((p: FormPage, i: number) =>
        i === activePageIndex ? { ...p, fields: p.fields.filter((f: FormField) => f.id !== fieldId) } : p,
      );
      updateSchema({ ...schema, pages });
      if (selectedFieldId === fieldId) setSelectedFieldId(null);
    },
    [schema, activePageIndex, selectedFieldId, updateSchema],
  );

  const duplicateField = useCallback(
    (fieldId: string) => {
      if (!schema) return;
      const page = schema.pages[activePageIndex];
      const idx = page.fields.findIndex((f: FormField) => f.id === fieldId);
      if (idx === -1) return;
      const copy = { ...page.fields[idx], id: crypto.randomUUID() };
      const newFields = [...page.fields];
      newFields.splice(idx + 1, 0, copy);
      const pages = schema.pages.map((p: FormPage, i: number) =>
        i === activePageIndex ? { ...p, fields: newFields } : p,
      );
      updateSchema({ ...schema, pages });
      setSelectedFieldId(copy.id);
    },
    [schema, activePageIndex, updateSchema],
  );

  // ─── Page operations ───────────────────────────────────────────────────────

  const addPage = () => {
    if (!schema) return;
    const newPage = createDefaultPage(crypto.randomUUID(), schema.pages.length);
    const updated = { ...schema, pages: [...schema.pages, newPage], settings: { ...schema.settings, multiPage: true } };
    updateSchema(updated);
    setActivePageIndex(schema.pages.length);
  };

  const renamePage = (i: number, title: string) => {
    if (!schema) return;
    const pages = schema.pages.map((p: FormPage, idx: number) => (idx === i ? { ...p, title } : p));
    updateSchema({ ...schema, pages });
  };

  const deletePage = (i: number) => {
    if (!schema || schema.pages.length <= 1) return;
    const pages = schema.pages.filter((_: FormPage, idx: number) => idx !== i);
    const multiPage = pages.length > 1;
    updateSchema({ ...schema, pages, settings: { ...schema.settings, multiPage } });
    if (activePageIndex >= pages.length) setActivePageIndex(pages.length - 1);
  };

  // ─── Drag and drop ─────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const { data } = event.active;
    if (data.current?.source === "palette") {
      setDragActiveType(data.current.fieldType as FieldType);
    } else if (data.current?.source === "canvas") {
      setDragActiveField(data.current.field as FormField);
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Could handle cross-page moves here in a future enhancement
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragActiveType(null);
    setDragActiveField(null);
    if (!schema) return;

    const { active, over } = event;
    if (!over) return;

    const activeSrc = (active.data.current as { source?: string } | undefined)?.source;

    // Palette → canvas
    if (activeSrc === "palette") {
      const fieldType = (active.data.current as { fieldType: FieldType }).fieldType;
      addField(fieldType, activePageIndex);
      return;
    }

    // Canvas reorder
    if (activeSrc === "canvas") {
      const page = schema.pages[activePageIndex];
      const oldIndex = page.fields.findIndex((f: FormField) => f.id === active.id);
      const newIndex = page.fields.findIndex((f: FormField) => f.id === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const reordered = arrayMove(page.fields, oldIndex, newIndex);
      const pages = schema.pages.map((p: FormPage, i: number) =>
        i === activePageIndex ? { ...p, fields: reordered } : p,
      );
      updateSchema({ ...schema, pages });
    }
  };

  // ─── Save & publish ────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!schema) return;
    setSaving(true);
    try {
      await saveDraft({ formId, schema: JSON.stringify(schema), versionLabel: "Manual save" });
      toast.success("Version saved");
    } catch (err) {
      const msg = err instanceof ConvexError ? (err.data as { message: string }).message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!schema) return;
    setSaving(true);
    try {
      await saveDraft({ formId, schema: JSON.stringify(schema), versionLabel: "Published" });
      await publishForm({ formId });
      toast.success("Form published!");
    } catch {
      toast.error("Failed to publish");
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishForm({ formId });
      toast.success("Form unpublished");
    } catch {
      toast.error("Failed to unpublish");
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (!form || !schema) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activePage = schema.pages[activePageIndex] ?? schema.pages[0];
  const selectedField = activePage?.fields.find((f: FormField) => f.id === selectedFieldId) ?? null;

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {/* Toolbar */}
        <Toolbar
          formName={form.name}
          status={form.status}
          draftVersion={form.draftVersion}
          saving={saving}
          previewing={previewing}
          showHistory={showHistory}
          onBack={() => navigate(`/forms`)}
          onSave={handleSave}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          onPreview={() => setPreviewing((p) => !p)}
          onToggleHistory={() => setShowHistory((h) => !h)}
        />

        {/* Page tabs */}
        <PageToolbar
          schema={schema}
          activePageIndex={activePageIndex}
          onSelectPage={setActivePageIndex}
          onAddPage={addPage}
          onRenamePage={renamePage}
          onDeletePage={deletePage}
        />

        {/* Main editor area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Field Palette */}
          <FieldPalette />

          {/* Canvas */}
          {activePage && (
            <FormCanvas
              page={activePage}
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
              onDeleteField={deleteField}
              onDuplicateField={duplicateField}
            />
          )}

          {/* Right panel */}
          {showHistory ? (
            <VersionHistory
              formId={formId}
              currentDraftVersion={form.draftVersion}
              publishedVersion={form.publishedVersion}
              onClose={() => setShowHistory(false)}
              onRestored={() => {
                setSchema(null); // force re-fetch
              }}
            />
          ) : selectedField ? (
            <FieldEditor
              field={selectedField}
              onChange={updateField}
              onDelete={() => deleteField(selectedField.id)}
            />
          ) : (
            <FormSettings schema={schema} onChange={updateSchema} />
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {dragActiveType && (
          <div className="rounded-lg border border-primary bg-primary/10 px-3 py-2 text-xs font-medium text-primary shadow-lg opacity-90">
            + {dragActiveType.replace(/_/g, " ")}
          </div>
        )}
        {dragActiveField && (
          <div className="rounded-lg border border-primary bg-background px-3 py-2 shadow-xl opacity-80 max-w-md">
            <FieldPreview field={dragActiveField} />
          </div>
        )}
      </DragOverlay>

      {/* Preview modal */}
      {previewing && <PreviewPanel schema={schema} onClose={() => setPreviewing(false)} />}
    </DndContext>
  );
}

export default function FormEditorPage() {
  const { formId } = useParams<{ formId: string }>();

  if (!formId) return <div className="p-8 text-center text-muted-foreground">Form not found</div>;

  return (
    <div className="h-full">
      <AuthLoading>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </AuthLoading>
      <Authenticated>
        <BuilderInner formId={formId as Id<"forms">} />
      </Authenticated>
    </div>
  );
}
