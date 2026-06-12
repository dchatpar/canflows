/**
 * Form schema types — the data model for the drag-and-drop form builder.
 * All form definitions are serialized as JSON and stored in formVersions.schema.
 */

// ─── Field types ─────────────────────────────────────────────────────────────

export const FIELD_TYPES = [
  // Text
  "short_text", "long_text", "rich_text", "email", "phone", "url", "number",
  "currency", "percentage",
  // Choice
  "single_choice", "multi_choice", "dropdown", "boolean", "rating", "ranking",
  // Date/Time
  "date", "time", "datetime", "date_range",
  // File
  "file_upload", "signature",
  // Layout
  "section_header", "divider", "instructions",
  // Advanced
  "address", "name", "yes_no", "slider", "hidden",
] as const;

export type FieldType = typeof FIELD_TYPES[number];

export type FieldOption = {
  id: string;
  label: string;
  value: string;
};

export type ConditionalRule = {
  id: string;
  sourceFieldId: string;
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";
  value: string;
  /** What happens when rule matches */
  action: "show" | "hide" | "require" | "set_value";
  targetFieldId?: string;
  targetValue?: string;
};

export type ValidationRule = {
  type: "min_length" | "max_length" | "min_value" | "max_value" | "regex" | "custom";
  value: string;
  message: string;
};

export type CalculatedField = {
  expression: string;
  /** Field IDs referenced in expression */
  dependencies: string[];
};

export type FormField = {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  hidden: boolean;
  readOnly: boolean;
  width: "full" | "half" | "third";
  /** For choice fields */
  options?: FieldOption[];
  /** For number/text fields */
  validation?: ValidationRule[];
  /** Conditional visibility/requirement */
  conditions?: ConditionalRule[];
  /** Calculated value */
  calculated?: CalculatedField;
  /** Min/max for number, date, etc. */
  min?: string;
  max?: string;
  step?: number;
  /** File upload */
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  allowMultiple?: boolean;
  /** Rating */
  maxRating?: number;
  /** Default value */
  defaultValue?: string;
  /** Section header specific */
  headingLevel?: 2 | 3 | 4;
};

export type FormPage = {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
};

export type FormSchema = {
  id: string;
  title: string;
  description?: string;
  pages: FormPage[];
  /** Global conditional rules that span pages */
  globalConditions?: ConditionalRule[];
  settings: {
    multiPage: boolean;
    showProgressBar: boolean;
    allowSaveAndResume: boolean;
    submitLabel: string;
    successMessage: string;
    redirectUrl?: string;
    captchaEnabled: boolean;
    confirmationEmail: boolean;
    locale: "en" | "fr" | "both";
  };
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

export function createDefaultField(type: FieldType, id: string): FormField {
  const base: FormField = {
    id,
    type,
    label: FIELD_LABELS[type],
    required: false,
    hidden: false,
    readOnly: false,
    width: "full",
  };

  switch (type) {
    case "single_choice":
    case "multi_choice":
    case "dropdown":
      return {
        ...base,
        options: [
          { id: `${id}_opt1`, label: "Option 1", value: "option_1" },
          { id: `${id}_opt2`, label: "Option 2", value: "option_2" },
        ],
      };
    case "rating":
      return { ...base, maxRating: 5 };
    case "section_header":
      return { ...base, headingLevel: 2, required: false };
    case "number":
    case "currency":
    case "percentage":
    case "slider":
      return { ...base, min: "0", step: 1 };
    case "file_upload":
      return { ...base, maxFileSize: 10, allowMultiple: false };
    default:
      return base;
  }
}

export function createDefaultPage(id: string, index: number): FormPage {
  return {
    id,
    title: `Page ${index + 1}`,
    fields: [],
  };
}

export function createDefaultSchema(): FormSchema {
  const pageId = crypto.randomUUID();
  return {
    id: crypto.randomUUID(),
    title: "Untitled Form",
    description: "",
    pages: [createDefaultPage(pageId, 0)],
    settings: {
      multiPage: false,
      showProgressBar: true,
      allowSaveAndResume: false,
      submitLabel: "Submit",
      successMessage: "Thank you for your submission.",
      captchaEnabled: false,
      confirmationEmail: false,
      locale: "en",
    },
  };
}

// ─── Labels & metadata ────────────────────────────────────────────────────────

export const FIELD_LABELS: Record<FieldType, string> = {
  short_text: "Short Text",
  long_text: "Long Text",
  rich_text: "Rich Text",
  email: "Email",
  phone: "Phone",
  url: "URL",
  number: "Number",
  currency: "Currency",
  percentage: "Percentage",
  single_choice: "Single Choice",
  multi_choice: "Multiple Choice",
  dropdown: "Dropdown",
  boolean: "Checkbox",
  rating: "Rating",
  ranking: "Ranking",
  date: "Date",
  time: "Time",
  datetime: "Date & Time",
  date_range: "Date Range",
  file_upload: "File Upload",
  signature: "Signature",
  section_header: "Section Header",
  divider: "Divider",
  instructions: "Instructions",
  address: "Address",
  name: "Full Name",
  yes_no: "Yes / No",
  slider: "Slider",
  hidden: "Hidden Field",
};

export type FieldCategory = {
  label: string;
  fields: FieldType[];
};

export const FIELD_CATEGORIES: FieldCategory[] = [
  {
    label: "Text",
    fields: ["short_text", "long_text", "rich_text", "email", "phone", "url"],
  },
  {
    label: "Number",
    fields: ["number", "currency", "percentage", "slider"],
  },
  {
    label: "Choice",
    fields: ["single_choice", "multi_choice", "dropdown", "boolean", "yes_no", "rating", "ranking"],
  },
  {
    label: "Date & Time",
    fields: ["date", "time", "datetime", "date_range"],
  },
  {
    label: "File & Signature",
    fields: ["file_upload", "signature"],
  },
  {
    label: "Personal Info",
    fields: ["name", "address"],
  },
  {
    label: "Layout",
    fields: ["section_header", "divider", "instructions", "hidden"],
  },
];
