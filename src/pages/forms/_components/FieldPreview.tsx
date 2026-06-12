/**
 * FieldPreview — renders a non-interactive preview of a form field in the canvas.
 */
import { cn } from "@/lib/utils.ts";
import type { FormField } from "../_lib/form-schema.ts";
import { FIELD_ICONS } from "./FieldIcon.tsx";
import { Badge } from "@/components/ui/badge.tsx";

function PreviewInput({ className }: { className?: string }) {
  return (
    <div className={cn("mt-1.5 h-8 rounded-md border border-input bg-background px-3 flex items-center", className)}>
      <span className="text-xs text-muted-foreground/50 italic">Input</span>
    </div>
  );
}

export default function FieldPreview({ field }: { field: FormField }) {
  const Icon = FIELD_ICONS[field.type];

  if (field.type === "divider") {
    return <hr className="my-2 border-border" />;
  }

  if (field.type === "section_header") {
    const Tag = field.headingLevel === 3 ? "h3" : field.headingLevel === 4 ? "h4" : "h2";
    const sizes = { 2: "text-lg font-bold", 3: "text-base font-semibold", 4: "text-sm font-semibold" };
    return (
      <div className="py-1">
        <Tag className={cn(sizes[field.headingLevel ?? 2], "text-foreground")}>
          {field.label || "Section Header"}
        </Tag>
        {field.description && <p className="text-sm text-muted-foreground mt-0.5">{field.description}</p>}
      </div>
    );
  }

  if (field.type === "instructions") {
    return (
      <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
        {field.label || "Instructions text..."}
      </div>
    );
  }

  if (field.type === "boolean" || field.type === "yes_no") {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="size-4 rounded border border-input bg-background" />
        <span className="text-sm font-medium">
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </span>
      </div>
    );
  }

  if (field.type === "single_choice" || field.type === "multi_choice") {
    const InputEl = field.type === "single_choice" ? "circle" : "square";
    return (
      <div>
        <p className="text-sm font-medium">
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </p>
        <div className="mt-1.5 space-y-1">
          {(field.options ?? []).slice(0, 3).map((opt) => (
            <div key={opt.id} className="flex items-center gap-2">
              <div className={cn("size-3.5 border border-input bg-background shrink-0", InputEl === "circle" ? "rounded-full" : "rounded-sm")} />
              <span className="text-sm">{opt.label}</span>
            </div>
          ))}
          {(field.options?.length ?? 0) > 3 && (
            <p className="text-xs text-muted-foreground pl-5">+{(field.options?.length ?? 0) - 3} more</p>
          )}
        </div>
      </div>
    );
  }

  if (field.type === "dropdown") {
    return (
      <div>
        <p className="text-sm font-medium">
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </p>
        <div className="mt-1.5 h-8 rounded-md border border-input bg-background px-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground/50 italic">Select…</span>
          <span className="text-muted-foreground">▾</span>
        </div>
      </div>
    );
  }

  if (field.type === "rating") {
    return (
      <div>
        <p className="text-sm font-medium">
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </p>
        <div className="mt-1.5 flex gap-1">
          {Array.from({ length: field.maxRating ?? 5 }).map((_, i) => (
            <span key={i} className="text-lg text-muted-foreground/30">★</span>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "slider") {
    return (
      <div>
        <p className="text-sm font-medium">
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{field.min ?? 0}</span>
          <div className="flex-1 h-1.5 rounded-full bg-border">
            <div className="w-1/2 h-full rounded-full bg-primary/40" />
          </div>
          <span className="text-xs text-muted-foreground">{field.max ?? 100}</span>
        </div>
      </div>
    );
  }

  if (field.type === "long_text" || field.type === "rich_text") {
    return (
      <div>
        <p className="text-sm font-medium">
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </p>
        <div className="mt-1.5 h-20 rounded-md border border-input bg-background px-3 py-2 flex items-start">
          <span className="text-xs text-muted-foreground/50 italic">Long answer…</span>
        </div>
      </div>
    );
  }

  if (field.type === "file_upload") {
    return (
      <div>
        <p className="text-sm font-medium">
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </p>
        <div className="mt-1.5 rounded-md border-2 border-dashed border-border py-4 text-center text-xs text-muted-foreground">
          <Icon className="mx-auto mb-1 size-5 text-muted-foreground/40" />
          Drop files here or click to upload
        </div>
      </div>
    );
  }

  if (field.type === "signature") {
    return (
      <div>
        <p className="text-sm font-medium">
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </p>
        <div className="mt-1.5 h-20 rounded-md border border-input bg-background flex items-end px-3 py-2">
          <div className="w-full border-t border-dashed border-muted-foreground/30" />
        </div>
      </div>
    );
  }

  if (field.type === "address") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </p>
        <PreviewInput />
        <div className="grid grid-cols-2 gap-2">
          <PreviewInput />
          <PreviewInput />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PreviewInput />
          <PreviewInput />
        </div>
      </div>
    );
  }

  if (field.type === "hidden") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/30 px-3 py-2 opacity-50">
        <Icon className="size-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground italic">Hidden: {field.label}</span>
      </div>
    );
  }

  // Default: single-line input
  return (
    <div>
      <p className="text-sm font-medium">
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </p>
      {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
      <PreviewInput />
    </div>
  );
}
