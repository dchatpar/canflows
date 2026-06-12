/**
 * FieldEditor — right-hand panel for configuring a selected field.
 */
import { useState } from "react";
import type { FormField, FieldOption, ValidationRule } from "../_lib/form-schema.ts";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Trash2, Plus, GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

type Props = {
  field: FormField;
  onChange: (updated: FormField) => void;
  onDelete: () => void;
};

function OptionRow({
  option,
  onUpdate,
  onDelete,
}: {
  option: FieldOption;
  onUpdate: (o: FieldOption) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-1.5", isDragging && "opacity-50")}
    >
      <button {...listeners} {...attributes} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="size-3.5" />
      </button>
      <Input
        value={option.label}
        onChange={(e) => onUpdate({ ...option, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
        className="h-7 text-xs flex-1"
        placeholder="Option label"
      />
      <button onClick={onDelete} className="text-muted-foreground hover:text-destructive">
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function OptionsEditor({ field, onChange }: { field: FormField; onChange: (f: FormField) => void }) {
  const options = field.options ?? [];

  const handleAdd = () => {
    const id = crypto.randomUUID();
    onChange({ ...field, options: [...options, { id, label: `Option ${options.length + 1}`, value: `option_${options.length + 1}` }] });
  };

  const handleUpdate = (updated: FieldOption) => {
    onChange({ ...field, options: options.map((o) => (o.id === updated.id ? updated : o)) });
  };

  const handleDelete = (id: string) => {
    onChange({ ...field, options: options.filter((o) => o.id !== id) });
  };

  const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = options.findIndex((o) => o.id === active.id);
    const newIndex = options.findIndex((o) => o.id === over.id);
    const reordered = [...options];
    const [item] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, item);
    onChange({ ...field, options: reordered });
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Options</Label>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {options.map((opt) => (
              <OptionRow
                key={opt.id}
                option={opt}
                onUpdate={handleUpdate}
                onDelete={() => handleDelete(opt.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button size="sm" variant="ghost" onClick={handleAdd} className="h-7 text-xs w-full">
        <Plus className="size-3 mr-1" /> Add Option
      </Button>
    </div>
  );
}

function ValidationEditor({ field, onChange }: { field: FormField; onChange: (f: FormField) => void }) {
  const rules = field.validation ?? [];

  const handleAdd = () => {
    const newRule: ValidationRule = { type: "min_length", value: "", message: "" };
    onChange({ ...field, validation: [...rules, newRule] });
  };

  const handleUpdate = (index: number, updated: ValidationRule) => {
    onChange({ ...field, validation: rules.map((r, i) => (i === index ? updated : r)) });
  };

  const handleDelete = (index: number) => {
    onChange({ ...field, validation: rules.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Validation Rules</Label>
      {rules.map((rule, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-start">
          <Select value={rule.type} onValueChange={(v) => handleUpdate(i, { ...rule, type: v as ValidationRule["type"] })}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="min_length">Min length</SelectItem>
              <SelectItem value="max_length">Max length</SelectItem>
              <SelectItem value="min_value">Min value</SelectItem>
              <SelectItem value="max_value">Max value</SelectItem>
              <SelectItem value="regex">Regex</SelectItem>
            </SelectContent>
          </Select>
          <Input value={rule.value} onChange={(e) => handleUpdate(i, { ...rule, value: e.target.value })} className="h-7 text-xs" placeholder="Value" />
          <button onClick={() => handleDelete(i)} className="mt-1 text-muted-foreground hover:text-destructive">
            <X className="size-3.5" />
          </button>
          <Input value={rule.message} onChange={(e) => handleUpdate(i, { ...rule, message: e.target.value })} className="h-7 text-xs col-span-2" placeholder="Error message" />
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={handleAdd} className="h-7 text-xs w-full">
        <Plus className="size-3 mr-1" /> Add Rule
      </Button>
    </div>
  );
}

export default function FieldEditor({ field, onChange, onDelete }: Props) {
  const hasOptions = ["single_choice", "multi_choice", "dropdown", "ranking"].includes(field.type);
  const hasValidation = ["short_text", "long_text", "email", "phone", "url", "number", "currency", "percentage"].includes(field.type);
  const isLayout = ["section_header", "divider", "instructions"].includes(field.type);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l bg-muted/20 overflow-y-auto">
      <div className="flex items-center justify-between border-b px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Field Settings</p>
        <button onClick={onDelete} className="rounded p-0.5 text-muted-foreground hover:text-destructive" title="Delete field">
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Label */}
        <div className="space-y-1.5">
          <Label htmlFor="field-label" className="text-xs">Label</Label>
          <Input
            id="field-label"
            value={field.label}
            onChange={(e) => onChange({ ...field, label: e.target.value })}
            className="h-8 text-sm"
          />
        </div>

        {/* Description */}
        {!isLayout && (
          <div className="space-y-1.5">
            <Label htmlFor="field-desc" className="text-xs">Help Text</Label>
            <Textarea
              id="field-desc"
              value={field.description ?? ""}
              onChange={(e) => onChange({ ...field, description: e.target.value })}
              rows={2}
              className="text-sm resize-none"
              placeholder="Optional help text shown below field"
            />
          </div>
        )}

        {/* Placeholder */}
        {!isLayout && !hasOptions && !["boolean", "yes_no", "rating", "slider", "file_upload", "signature", "hidden"].includes(field.type) && (
          <div className="space-y-1.5">
            <Label htmlFor="field-placeholder" className="text-xs">Placeholder</Label>
            <Input
              id="field-placeholder"
              value={field.placeholder ?? ""}
              onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        )}

        {/* Section heading level */}
        {field.type === "section_header" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Heading Level</Label>
            <Select
              value={String(field.headingLevel ?? 2)}
              onValueChange={(v) => onChange({ ...field, headingLevel: Number(v) as 2 | 3 | 4 })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">H2 — Large</SelectItem>
                <SelectItem value="3">H3 — Medium</SelectItem>
                <SelectItem value="4">H4 — Small</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Width */}
        {!isLayout && field.type !== "hidden" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Width</Label>
            <Select value={field.width} onValueChange={(v) => onChange({ ...field, width: v as FormField["width"] })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full width</SelectItem>
                <SelectItem value="half">Half width</SelectItem>
                <SelectItem value="third">One third</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Number min/max */}
        {["number", "currency", "percentage", "slider"].includes(field.type) && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Min</Label>
              <Input value={field.min ?? ""} onChange={(e) => onChange({ ...field, min: e.target.value })} className="h-8 text-sm" type="number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max</Label>
              <Input value={field.max ?? ""} onChange={(e) => onChange({ ...field, max: e.target.value })} className="h-8 text-sm" type="number" />
            </div>
          </div>
        )}

        {/* Rating max */}
        {field.type === "rating" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Max Stars</Label>
            <Select
              value={String(field.maxRating ?? 5)}
              onValueChange={(v) => onChange({ ...field, maxRating: Number(v) })}
            >
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[3, 4, 5, 6, 7, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} stars</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* File upload */}
        {field.type === "file_upload" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Allow Multiple Files</Label>
              <Switch
                checked={field.allowMultiple ?? false}
                onCheckedChange={(c) => onChange({ ...field, allowMultiple: c })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max File Size (MB)</Label>
              <Input type="number" value={field.maxFileSize ?? 10} onChange={(e) => onChange({ ...field, maxFileSize: Number(e.target.value) })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Accepted Types</Label>
              <Input value={(field.acceptedFileTypes ?? []).join(", ")} onChange={(e) => onChange({ ...field, acceptedFileTypes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="h-8 text-sm" placeholder=".pdf, .docx, image/*" />
            </div>
          </div>
        )}

        {/* Options */}
        {hasOptions && <OptionsEditor field={field} onChange={onChange} />}

        {/* Default value */}
        {!isLayout && !hasOptions && !["file_upload", "signature", "hidden", "rating", "slider"].includes(field.type) && (
          <div className="space-y-1.5">
            <Label className="text-xs">Default Value</Label>
            <Input
              value={field.defaultValue ?? ""}
              onChange={(e) => onChange({ ...field, defaultValue: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        )}

        <Separator />

        {/* Toggles */}
        {!isLayout && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Required</Label>
              <Switch
                checked={field.required}
                onCheckedChange={(c) => onChange({ ...field, required: c })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Read Only</Label>
              <Switch
                checked={field.readOnly}
                onCheckedChange={(c) => onChange({ ...field, readOnly: c })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Hidden by Default</Label>
              <Switch
                checked={field.hidden}
                onCheckedChange={(c) => onChange({ ...field, hidden: c })}
              />
            </div>
          </div>
        )}

        {/* Validation */}
        {hasValidation && (
          <>
            <Separator />
            <ValidationEditor field={field} onChange={onChange} />
          </>
        )}
      </div>
    </aside>
  );
}
