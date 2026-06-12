/**
 * PublicFormPage — Renders a published form for public submission.
 * Route: /submit/:formId
 * No auth required; supports draft save/resume, multi-page wizard, confirmation.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { useDebounce } from "@/hooks/use-debounce.ts";
import {
  ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, FileText,
  Save, Clock, Star, Minus,
} from "lucide-react";
import type { FormSchema, FormField, FormPage } from "@/pages/forms/_lib/form-schema.ts";

// ─── Draft key management ─────────────────────────────────────────────────────

function getDraftKey(formId: string): string {
  const storageKey = `canflow_draft_key_${formId}`;
  let key = localStorage.getItem(storageKey);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(storageKey, key);
  }
  return key;
}

function clearDraftKey(formId: string) {
  localStorage.removeItem(`canflow_draft_key_${formId}`);
}

// ─── Field Renderer ───────────────────────────────────────────────────────────

type FieldValue = string | string[] | boolean | null;
type FormValues = Record<string, FieldValue>;

function FieldRenderer({
  field,
  value,
  onChange,
  error,
}: {
  field: FormField;
  value: FieldValue;
  onChange: (val: FieldValue) => void;
  error?: string;
}) {
  const baseInputClass = `${error ? "border-destructive" : ""} transition-colors`;

  switch (field.type) {
    case "section_header":
      return (
        <div className={`col-span-full ${field.headingLevel === 2 ? "pt-2" : ""}`}>
          {field.headingLevel === 2 && <h2 className="text-lg font-semibold text-foreground border-b pb-2">{field.label}</h2>}
          {field.headingLevel === 3 && <h3 className="text-base font-semibold text-foreground">{field.label}</h3>}
          {field.headingLevel === 4 && <h4 className="text-sm font-semibold text-foreground">{field.label}</h4>}
          {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
        </div>
      );
    case "divider":
      return <div className="col-span-full border-t my-1" />;
    case "instructions":
      return (
        <div className="col-span-full rounded-lg bg-muted/50 border px-4 py-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{field.label}</p>
        </div>
      );
    case "hidden":
      return null;
    case "boolean":
      return (
        <div className="col-span-full">
          <div className="flex items-start gap-3">
            <Checkbox
              id={field.id}
              checked={value === true || value === "true"}
              onCheckedChange={(checked) => onChange(checked === true)}
            />
            <label htmlFor={field.id} className="text-sm cursor-pointer leading-snug">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
          </div>
          {field.description && <p className="text-xs text-muted-foreground mt-1 ml-7">{field.description}</p>}
          {error && <p className="text-xs text-destructive mt-1 ml-7">{error}</p>}
        </div>
      );
    case "yes_no":
      return (
        <FieldWrapper field={field} error={error}>
          <RadioGroup
            value={value as string ?? ""}
            onValueChange={onChange}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="yes" id={`${field.id}_yes`} />
              <label htmlFor={`${field.id}_yes`} className="text-sm cursor-pointer">Yes</label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no" id={`${field.id}_no`} />
              <label htmlFor={`${field.id}_no`} className="text-sm cursor-pointer">No</label>
            </div>
          </RadioGroup>
        </FieldWrapper>
      );
    case "single_choice":
      if (field.options && field.options.length <= 5) {
        return (
          <FieldWrapper field={field} error={error}>
            <RadioGroup
              value={value as string ?? ""}
              onValueChange={onChange}
              className="space-y-2"
            >
              {field.options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={`${field.id}_${opt.id}`} />
                  <label htmlFor={`${field.id}_${opt.id}`} className="text-sm cursor-pointer">{opt.label}</label>
                </div>
              ))}
            </RadioGroup>
          </FieldWrapper>
        );
      }
      return (
        <FieldWrapper field={field} error={error}>
          <Select value={value as string ?? ""} onValueChange={onChange}>
            <SelectTrigger className={baseInputClass}>
              <SelectValue placeholder={field.placeholder ?? "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWrapper>
      );
    case "multi_choice":
      return (
        <FieldWrapper field={field} error={error}>
          <div className="space-y-2">
            {field.options?.map((opt) => {
              const selected = Array.isArray(value) ? value.includes(opt.value) : false;
              return (
                <div key={opt.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`${field.id}_${opt.id}`}
                    checked={selected}
                    onCheckedChange={(checked) => {
                      const cur = Array.isArray(value) ? value : [];
                      onChange(checked ? [...cur, opt.value] : cur.filter((v) => v !== opt.value));
                    }}
                  />
                  <label htmlFor={`${field.id}_${opt.id}`} className="text-sm cursor-pointer">{opt.label}</label>
                </div>
              );
            })}
          </div>
        </FieldWrapper>
      );
    case "dropdown":
      return (
        <FieldWrapper field={field} error={error}>
          <Select value={value as string ?? ""} onValueChange={onChange}>
            <SelectTrigger className={baseInputClass}>
              <SelectValue placeholder={field.placeholder ?? "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWrapper>
      );
    case "rating":
      return (
        <FieldWrapper field={field} error={error}>
          <div className="flex gap-1">
            {Array.from({ length: field.maxRating ?? 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange(String(i + 1))}
                className="cursor-pointer transition-colors"
              >
                <Star
                  className={`size-7 ${Number(value) > i ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                />
              </button>
            ))}
          </div>
        </FieldWrapper>
      );
    case "slider":
      return (
        <FieldWrapper field={field} error={error}>
          <div className="space-y-2">
            <input
              type="range"
              min={field.min ?? "0"}
              max={field.max ?? "100"}
              step={field.step ?? 1}
              value={String(value ?? field.min ?? 0)}
              onChange={(e) => onChange(e.target.value)}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{field.min ?? "0"}</span>
              <span className="font-medium text-foreground">{String(value ?? field.min ?? 0)}</span>
              <span>{field.max ?? "100"}</span>
            </div>
          </div>
        </FieldWrapper>
      );
    case "long_text":
    case "rich_text":
      return (
        <FieldWrapper field={field} error={error}>
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            className={`resize-none ${baseInputClass}`}
            readOnly={field.readOnly}
          />
        </FieldWrapper>
      );
    case "date":
      return (
        <FieldWrapper field={field} error={error}>
          <Input
            id={field.id}
            type="date"
            value={String(value ?? "")}
            min={field.min}
            max={field.max}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
            readOnly={field.readOnly}
          />
        </FieldWrapper>
      );
    case "time":
      return (
        <FieldWrapper field={field} error={error}>
          <Input id={field.id} type="time" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={baseInputClass} />
        </FieldWrapper>
      );
    case "datetime":
      return (
        <FieldWrapper field={field} error={error}>
          <Input id={field.id} type="datetime-local" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={baseInputClass} />
        </FieldWrapper>
      );
    case "date_range":
      return (
        <FieldWrapper field={field} error={error}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">From</p>
              <Input type="date" value={(Array.isArray(value) ? value[0] : "") ?? ""} onChange={(e) => { const v = Array.isArray(value) ? [...value] : ["", ""]; v[0] = e.target.value; onChange(v); }} className={baseInputClass} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">To</p>
              <Input type="date" value={(Array.isArray(value) ? value[1] : "") ?? ""} onChange={(e) => { const v = Array.isArray(value) ? [...value] : ["", ""]; v[1] = e.target.value; onChange(v); }} className={baseInputClass} />
            </div>
          </div>
        </FieldWrapper>
      );
    case "email":
      return (
        <FieldWrapper field={field} error={error}>
          <Input id={field.id} type="email" placeholder={field.placeholder ?? "example@email.com"} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={baseInputClass} readOnly={field.readOnly} />
        </FieldWrapper>
      );
    case "phone":
      return (
        <FieldWrapper field={field} error={error}>
          <Input id={field.id} type="tel" placeholder={field.placeholder ?? "e.g. 613-555-0100"} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={baseInputClass} />
        </FieldWrapper>
      );
    case "url":
      return (
        <FieldWrapper field={field} error={error}>
          <Input id={field.id} type="url" placeholder={field.placeholder ?? "https://"} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={baseInputClass} />
        </FieldWrapper>
      );
    case "number":
    case "currency":
    case "percentage":
      return (
        <FieldWrapper field={field} error={error}>
          <div className="relative">
            {field.type === "currency" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
            {field.type === "percentage" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
            <Input
              id={field.id}
              type="number"
              placeholder={field.placeholder ?? "0"}
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
              value={String(value ?? "")}
              onChange={(e) => onChange(e.target.value)}
              className={`${field.type === "currency" ? "pl-7" : ""} ${field.type === "percentage" ? "pr-7" : ""} ${baseInputClass}`}
            />
          </div>
        </FieldWrapper>
      );
    case "signature":
      // Simple text-based signature for now
      return (
        <FieldWrapper field={field} error={error}>
          <div className="rounded-lg border-2 border-dashed border-border p-4 space-y-2">
            <p className="text-xs text-muted-foreground">Type your full name as your electronic signature</p>
            <Input
              id={field.id}
              placeholder="Full legal name"
              value={String(value ?? "")}
              onChange={(e) => onChange(e.target.value)}
              className={`font-serif italic text-lg ${baseInputClass}`}
            />
            <div className="border-t pt-1">
              <p className="text-[10px] text-muted-foreground">
                By typing your name above you agree this constitutes your electronic signature.
              </p>
            </div>
          </div>
        </FieldWrapper>
      );
    case "address":
      return (
        <FieldWrapper field={field} error={error}>
          <div className="space-y-2">
            <Input placeholder="Street address" value={(Array.isArray(value) ? value[0] : "") ?? ""} onChange={(e) => { const v = Array.isArray(value) ? [...value] : ["","","","",""]; v[0] = e.target.value; onChange(v); }} className={baseInputClass} />
            <Input placeholder="City" value={(Array.isArray(value) ? value[1] : "") ?? ""} onChange={(e) => { const v = Array.isArray(value) ? [...value] : ["","","","",""]; v[1] = e.target.value; onChange(v); }} className={baseInputClass} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={(Array.isArray(value) ? value[2] : "") ?? ""} onValueChange={(v2) => { const v = Array.isArray(value) ? [...value] : ["","","","",""]; v[2] = v2; onChange(v); }}>
                <SelectTrigger><SelectValue placeholder="Province / Territory" /></SelectTrigger>
                <SelectContent>
                  {["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Postal code" value={(Array.isArray(value) ? value[3] : "") ?? ""} onChange={(e) => { const v = Array.isArray(value) ? [...value] : ["","","","",""]; v[3] = e.target.value; onChange(v); }} className={baseInputClass} />
            </div>
          </div>
        </FieldWrapper>
      );
    case "name":
      return (
        <FieldWrapper field={field} error={error}>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="First name" value={(Array.isArray(value) ? value[0] : "") ?? ""} onChange={(e) => { const v = Array.isArray(value) ? [...value] : ["",""]; v[0] = e.target.value; onChange(v); }} className={baseInputClass} />
            <Input placeholder="Last name" value={(Array.isArray(value) ? value[1] : "") ?? ""} onChange={(e) => { const v = Array.isArray(value) ? [...value] : ["",""]; v[1] = e.target.value; onChange(v); }} className={baseInputClass} />
          </div>
        </FieldWrapper>
      );
    case "file_upload":
      return (
        <FieldWrapper field={field} error={error}>
          <div className="rounded-lg border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <FileText className="size-6 mx-auto mb-2 opacity-50" />
            <p>File upload coming in a future update.</p>
            <p className="text-xs mt-0.5">
              Accepted: {field.acceptedFileTypes?.join(", ") ?? "all files"} · Max {field.maxFileSize ?? 10}MB
            </p>
          </div>
        </FieldWrapper>
      );
    default:
      return (
        <FieldWrapper field={field} error={error}>
          <Input
            id={field.id}
            type="text"
            placeholder={field.placeholder}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
            readOnly={field.readOnly}
          />
        </FieldWrapper>
      );
  }
}

function FieldWrapper({ field, error, children }: { field: FormField; error?: string; children: React.ReactNode }) {
  return (
    <div className={field.width === "half" ? "" : field.width === "third" ? "" : "col-span-full"}>
      {field.type !== "boolean" && (
        <Label htmlFor={field.id} className="mb-1.5 block text-sm">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {field.description && field.type !== "boolean" && (
        <p className="text-xs text-muted-foreground mb-1.5">{field.description}</p>
      )}
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

// ─── Page renderer ────────────────────────────────────────────────────────────

function PageForm({
  page,
  values,
  errors,
  onChange,
}: {
  page: FormPage;
  values: FormValues;
  errors: Record<string, string>;
  onChange: (fieldId: string, val: FieldValue) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-5">
      {page.fields
        .filter((f) => !f.hidden)
        .map((field) => (
          <div
            key={field.id}
            className={
              field.width === "half" ? "col-span-1" :
              field.width === "third" ? "col-span-1" :
              "col-span-full"
            }
          >
            <FieldRenderer
              field={field}
              value={values[field.id] ?? null}
              onChange={(v) => onChange(field.id, v)}
              error={errors[field.id]}
            />
          </div>
        ))}
    </div>
  );
}

// ─── Validate a page ─────────────────────────────────────────────────────────

function validatePage(page: FormPage, values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of page.fields) {
    if (field.hidden || field.type === "section_header" || field.type === "divider" || field.type === "instructions") continue;
    if (!field.required) continue;
    const val = values[field.id];
    const isEmpty =
      val === null || val === undefined || val === "" ||
      (Array.isArray(val) && val.length === 0) ||
      (Array.isArray(val) && val.every((v) => !v));
    if (isEmpty) {
      errors[field.id] = "This field is required.";
    }
  }
  return errors;
}

// ─── Confirmation screen ──────────────────────────────────────────────────────

function ConfirmationScreen({
  referenceNumber,
  successMessage,
  formName,
  tenantName,
}: {
  referenceNumber: string;
  successMessage: string;
  formName: string;
  tenantName: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center py-12 px-4 gap-6"
    >
      <div className="flex size-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle2 className="size-10 text-green-600 dark:text-green-400" />
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-2">Submission Received</h2>
        <p className="text-muted-foreground max-w-md">{successMessage}</p>
      </div>
      <div className="rounded-xl border border-border bg-muted/50 px-8 py-5 space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Reference Number</p>
        <p className="text-3xl font-mono font-bold text-primary tracking-widest">{referenceNumber}</p>
        <p className="text-xs text-muted-foreground">Keep this number to track your submission status</p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Link to={`/track?ref=${referenceNumber}`}>
          <Button className="w-full" variant="ghost">
            <Clock className="size-4 mr-2" /> Track Status
          </Button>
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">{tenantName} · {formName}</p>
    </motion.div>
  );
}

// ─── Main public form page ────────────────────────────────────────────────────

export default function PublicFormPage() {
  const { formId } = useParams<{ formId: string }>();
  const formData = useQuery(
    api.submissions.getPublishedForm,
    formId ? { formId: formId as Id<"forms"> } : "skip",
  );

  const submitMutation = useMutation(api.submissions.submit);
  const saveDraftMutation = useMutation(api.submissions.saveDraft);

  const [currentPage, setCurrentPage] = useState(0);
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ referenceNumber: string; successMessage: string } | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const draftKey = formId ? getDraftKey(formId) : "";

  // Draft resume
  const draftData = useQuery(
    api.submissions.getDraft,
    formId ? { formId: formId as Id<"forms">, draftKey } : "skip",
  );
  const draftLoaded = useRef(false);
  useEffect(() => {
    if (draftData && !draftLoaded.current) {
      draftLoaded.current = true;
      try {
        const parsed = JSON.parse(draftData.data) as FormValues;
        setValues(parsed);
        setCurrentPage(draftData.currentPage);
        toast.info("Draft restored — your previous answers have been loaded.", { duration: 4000 });
      } catch { /* ignore malformed draft */ }
    }
  }, [draftData]);

  // Auto-save draft with debounce
  const [debouncedValues] = useDebounce(values, 2000);
  useEffect(() => {
    if (!formId || Object.keys(debouncedValues).length === 0) return;
    saveDraftMutation({
      formId: formId as Id<"forms">,
      draftKey,
      data: JSON.stringify(debouncedValues),
      currentPage,
    }).then(() => setDraftSaved(true)).catch(() => {/* silent */});
  }, [debouncedValues, currentPage, formId, draftKey, saveDraftMutation]);

  const handleChange = useCallback((fieldId: string, val: FieldValue) => {
    setValues((prev) => ({ ...prev, [fieldId]: val }));
    setErrors((prev) => { const e = { ...prev }; delete e[fieldId]; return e; });
    setDraftSaved(false);
  }, []);

  if (formData === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <GCHeader tenantName="" />
        <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (formData === null) {
    return (
      <div className="min-h-screen bg-background">
        <GCHeader tenantName="" />
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <AlertTriangle className="size-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Form Not Available</h2>
          <p className="text-muted-foreground">This form is not currently accepting submissions.</p>
        </div>
      </div>
    );
  }

  const schema = JSON.parse(formData.schema) as FormSchema;
  const pages = schema.pages;
  const isMultiPage = schema.settings.multiPage && pages.length > 1;
  const progress = isMultiPage ? ((currentPage) / pages.length) * 100 : 0;

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background">
        <GCHeader tenantName={formData.tenantName} />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <ConfirmationScreen
            referenceNumber={confirmed.referenceNumber}
            successMessage={confirmed.successMessage}
            formName={formData.name}
            tenantName={formData.tenantName}
          />
        </div>
      </div>
    );
  }

  const page = pages[currentPage];

  const handleNext = () => {
    const errs = validatePage(page, values);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fill in all required fields.");
      return;
    }
    setErrors({});
    setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setCurrentPage((p) => Math.max(p - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    const errs = validatePage(page, values);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitMutation({
        formId: formId as Id<"forms">,
        data: JSON.stringify(values),
        draftKey,
      });
      clearDraftKey(formId!);
      setConfirmed({ referenceNumber: result.referenceNumber, successMessage: schema.settings.successMessage });
    } catch (err) {
      const msg = err instanceof ConvexError
        ? (err.data as { message: string }).message
        : "Submission failed. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <GCHeader tenantName={formData.tenantName} />

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Form header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{formData.name}</h1>
          {formData.description && (
            <p className="text-muted-foreground mt-1">{formData.description}</p>
          )}
          {isMultiPage && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Step {currentPage + 1} of {pages.length}: {page.title}</span>
                <span>{Math.round(((currentPage) / pages.length) * 100)}% complete</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </div>

        {/* Draft save status */}
        {schema.settings.allowSaveAndResume && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
            <Save className="size-3" />
            {draftSaved ? "Progress saved automatically" : "Saving…"}
          </div>
        )}

        {/* Page */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
          >
            {isMultiPage && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold">{page.title}</h2>
                {page.description && <p className="text-sm text-muted-foreground">{page.description}</p>}
              </div>
            )}
            <PageForm page={page} values={values} errors={errors} onChange={handleChange} />
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t">
          <Button variant="ghost" onClick={handleBack} disabled={currentPage === 0}>
            <ChevronLeft className="size-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {isMultiPage && pages.map((_, i) => (
              <div
                key={i}
                className={`size-2 rounded-full transition-colors ${i === currentPage ? "bg-primary" : i < currentPage ? "bg-primary/40" : "bg-muted-foreground/20"}`}
              />
            ))}
          </div>
          {isMultiPage && currentPage < pages.length - 1 ? (
            <Button onClick={handleNext}>
              Next <ChevronRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting…" : (schema.settings.submitLabel ?? "Submit")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── GC Header ────────────────────────────────────────────────────────────────

function GCHeader({ tenantName }: { tenantName: string }) {
  return (
    <header>
      {/* GC top bar */}
      <div className="bg-[#1C2540] text-white text-xs flex items-center gap-2 px-4 py-1.5">
        <span className="text-[11px]">🇨🇦</span>
        <span>An official website of the Government of Canada</span>
        {tenantName && <span className="mx-2 opacity-40">|</span>}
        {tenantName && <span className="opacity-70">{tenantName}</span>}
        <div className="ml-auto flex items-center gap-2">
          <Minus className="size-3 opacity-40" />
          <span className="opacity-70 cursor-pointer hover:opacity-100">Français</span>
        </div>
      </div>
      {/* CanFlow branding */}
      <div className="border-b bg-background px-4 py-3 flex items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded bg-primary text-primary-foreground text-sm font-bold">C</div>
          <span className="font-semibold text-sm">CanFlow.ai</span>
        </div>
      </div>
    </header>
  );
}
