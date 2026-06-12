/**
 * FieldPalette — the left-hand panel listing all available field types.
 * Each field is draggable via dnd-kit.
 */
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils.ts";
import { FIELD_CATEGORIES, FIELD_LABELS, type FieldType } from "../_lib/form-schema.ts";
import { FIELD_ICONS } from "./FieldIcon.tsx";

function PaletteField({ type }: { type: FieldType }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { source: "palette", fieldType: type },
  });
  const Icon = FIELD_ICONS[type];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-xs font-medium",
        "cursor-grab select-none transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
        isDragging && "opacity-40 ring-2 ring-primary",
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{FIELD_LABELS[type]}</span>
    </div>
  );
}

export default function FieldPalette() {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-muted/30 overflow-y-auto">
      <div className="border-b px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fields</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Drag onto canvas</p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {FIELD_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              {cat.label}
            </p>
            <div className="space-y-1">
              {cat.fields.map((ft) => (
                <PaletteField key={ft} type={ft} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
