/**
 * FormCanvas — the centre panel where fields are dropped and reordered.
 * Handles drag-from-palette and drag-to-reorder.
 */
import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils.ts";
import type { FormField, FormPage } from "../_lib/form-schema.ts";
import { FIELD_ICONS } from "./FieldIcon.tsx";
import FieldPreview from "./FieldPreview.tsx";
import { GripVertical, Trash2, Copy, Settings2 } from "lucide-react";

// ─── Sortable field card ──────────────────────────────────────────────────────

function SortableFieldCard({
  field,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    data: { source: "canvas", field },
  });

  const Icon = FIELD_ICONS[field.type];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative rounded-lg border bg-background transition-all",
        isSelected ? "border-primary shadow-sm ring-1 ring-primary/30" : "border-border hover:border-primary/40",
        isDragging && "opacity-50 shadow-xl",
        field.type === "hidden" && "opacity-60",
      )}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute left-0 top-0 bottom-0 flex w-7 cursor-grab items-center justify-center rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="size-4" />
      </div>

      {/* Hover toolbar */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          <Icon className="size-2.5" />
          <span>{field.type.replace(/_/g, " ")}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="rounded border bg-muted p-0.5 text-muted-foreground hover:text-foreground"
          title="Duplicate"
        >
          <Copy className="size-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="rounded border bg-muted p-0.5 text-muted-foreground hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="size-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className="rounded border bg-muted p-0.5 text-muted-foreground hover:text-primary"
          title="Edit settings"
        >
          <Settings2 className="size-3" />
        </button>
      </div>

      {/* Field preview */}
      <div className="pl-7 pr-3 py-3 pointer-events-none select-none">
        <FieldPreview field={field} />
      </div>
    </div>
  );
}

// ─── Empty drop zone ──────────────────────────────────────────────────────────

function EmptyDropZone({ pageId }: { pageId: string }) {
  const { isOver, setNodeRef } = useDroppable({ id: `drop-zone-${pageId}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-16 text-center transition-all",
        isOver ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground",
      )}
    >
      <div className="text-4xl mb-3 opacity-40">⊕</div>
      <p className="text-sm font-medium">{isOver ? "Release to add field" : "Drag fields from the left panel"}</p>
      <p className="text-xs mt-1 opacity-60">or click any field type to add instantly</p>
    </div>
  );
}

// ─── Page tab ─────────────────────────────────────────────────────────────────

export function PageTab({
  page,
  active,
  index,
  onClick,
  onRename,
  onDelete,
  canDelete,
}: {
  page: FormPage;
  active: boolean;
  index: number;
  onClick: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(page.title);

  const handleBlur = () => {
    setEditing(false);
    if (value.trim()) onRename(value.trim());
    else setValue(page.title);
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center gap-1 rounded-t-md border-b-2 px-3 py-2 text-sm cursor-pointer transition-all select-none",
        active
          ? "border-primary bg-primary/5 text-primary font-medium"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleBlur();
            if (e.key === "Escape") { setValue(page.title); setEditing(false); }
          }}
          className="w-24 rounded border border-primary bg-background px-1 text-sm outline-none"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}>
          {page.title || `Page ${index + 1}`}
        </span>
      )}
      {canDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="ml-1 rounded p-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </div>
  );
}

// ─── Main canvas ──────────────────────────────────────────────────────────────

type CanvasProps = {
  page: FormPage;
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onDeleteField: (id: string) => void;
  onDuplicateField: (id: string) => void;
};

export default function FormCanvas({
  page,
  selectedFieldId,
  onSelectField,
  onDeleteField,
  onDuplicateField,
}: CanvasProps) {
  const { setNodeRef } = useDroppable({ id: `page-${page.id}` });

  return (
    <div
      ref={setNodeRef}
      className="flex-1 overflow-y-auto px-4 py-6"
      onClick={() => onSelectField(null)}
    >
      <div className="mx-auto max-w-2xl space-y-2">
        {page.fields.length === 0 ? (
          <EmptyDropZone pageId={page.id} />
        ) : (
          <SortableContext
            items={page.fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {page.fields.map((field) => (
              <SortableFieldCard
                key={field.id}
                field={field}
                isSelected={selectedFieldId === field.id}
                onSelect={() => onSelectField(field.id)}
                onDelete={() => onDeleteField(field.id)}
                onDuplicate={() => onDuplicateField(field.id)}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
