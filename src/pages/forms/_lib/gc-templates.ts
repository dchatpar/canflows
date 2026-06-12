/**
 * Government of Canada pre-built form templates.
 * Each template ships a complete FormSchema ready for the builder.
 */
import type { FormSchema } from "./form-schema.ts";

const u = () => crypto.randomUUID();

export type GCTemplate = {
  id: string;
  title: string;
  titleFr: string;
  description: string;
  descriptionFr: string;
  category: GCTemplateCategory;
  tags: string[];
  /** Estimated completion time in minutes */
  estimatedTime: number;
  schema: FormSchema;
};

export type GCTemplateCategory =
  | "permits"
  | "ati"
  | "complaints"
  | "grants"
  | "inspections"
  | "benefits"
  | "visitor"
  | "feedback";

export const GC_TEMPLATE_CATEGORIES: Record<GCTemplateCategory, { label: string; labelFr: string; icon: string }> = {
  permits:    { label: "Permits & Licences",      labelFr: "Permis et licences",         icon: "ClipboardList" },
  ati:        { label: "Access to Information",   labelFr: "Accès à l'information",      icon: "FileSearch" },
  complaints: { label: "Complaints & Feedback",   labelFr: "Plaintes et commentaires",   icon: "MessageSquareWarning" },
  grants:     { label: "Grants & Funding",        labelFr: "Subventions et financement", icon: "BadgeDollarSign" },
  inspections:{ label: "Inspections",             labelFr: "Inspections",                icon: "ShieldCheck" },
  benefits:   { label: "Benefits Enrollment",     labelFr: "Inscription aux prestations", icon: "HeartHandshake" },
  visitor:    { label: "Visitor Registration",    labelFr: "Inscription des visiteurs",  icon: "UserCheck" },
  feedback:   { label: "General Feedback",        labelFr: "Commentaires généraux",      icon: "Star" },
};

// ─── Helper builders ──────────────────────────────────────────────────────────

function makeSettings(overrides: Partial<FormSchema["settings"]> = {}): FormSchema["settings"] {
  return {
    multiPage: false,
    showProgressBar: true,
    allowSaveAndResume: true,
    submitLabel: "Submit",
    successMessage: "Thank you. Your submission has been received. You will receive a confirmation email shortly.",
    captchaEnabled: true,
    confirmationEmail: true,
    locale: "en",
    ...overrides,
  };
}

// ─── Templates ────────────────────────────────────────────────────────────────

const permitApplication: GCTemplate = {
  id: "gc-permit-general",
  title: "General Permit Application",
  titleFr: "Demande de permis général",
  description: "Standard Government of Canada permit application form covering applicant info, activity details, and supporting documents.",
  descriptionFr: "Formulaire standard de demande de permis du gouvernement du Canada.",
  category: "permits",
  tags: ["permit", "licence", "regulatory"],
  estimatedTime: 15,
  schema: {
    id: u(),
    title: "General Permit Application",
    description: "Use this form to apply for a Government of Canada permit or licence.",
    pages: [
      {
        id: u(),
        title: "Applicant Information",
        description: "Please provide your personal or organizational details.",
        fields: [
          { id: u(), type: "section_header", label: "Personal Information", required: false, hidden: false, readOnly: false, width: "full", headingLevel: 2 },
          { id: u(), type: "name", label: "Full Legal Name", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "email", label: "Email Address", placeholder: "name@example.gc.ca", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "phone", label: "Telephone Number", placeholder: "e.g. 613-555-0100", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "address", label: "Mailing Address", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "section_header", label: "Identification", required: false, hidden: false, readOnly: false, width: "full", headingLevel: 3 },
          { id: u(), type: "short_text", label: "Business Number (BN)", placeholder: "123456789 RC 0001", required: false, hidden: false, readOnly: false, width: "half", description: "If applying on behalf of a corporation" },
          { id: u(), type: "single_choice", label: "Applicant Type", required: true, hidden: false, readOnly: false, width: "half", options: [
            { id: u(), label: "Individual", value: "individual" },
            { id: u(), label: "Corporation", value: "corporation" },
            { id: u(), label: "Non-profit Organization", value: "nonprofit" },
            { id: u(), label: "Government Entity", value: "government" },
          ]},
        ],
      },
      {
        id: u(),
        title: "Permit Details",
        description: "Describe the activity or purpose for which you are requesting a permit.",
        fields: [
          { id: u(), type: "section_header", label: "Activity Information", required: false, hidden: false, readOnly: false, width: "full", headingLevel: 2 },
          { id: u(), type: "short_text", label: "Permit Type Requested", placeholder: "e.g. Construction Permit", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "long_text", label: "Description of Activity", placeholder: "Provide a detailed description…", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "date", label: "Proposed Start Date", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "date", label: "Proposed End Date", required: false, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "address", label: "Location of Activity", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "boolean", label: "This activity involves federal land or waters", required: false, hidden: false, readOnly: false, width: "full" },
        ],
      },
      {
        id: u(),
        title: "Supporting Documents",
        fields: [
          { id: u(), type: "instructions", label: "Upload all required supporting documents. Accepted formats: PDF, DOCX, JPG (max 10 MB each).", required: false, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "file_upload", label: "Supporting Documents", required: false, hidden: false, readOnly: false, width: "full", acceptedFileTypes: [".pdf", ".docx", ".jpg", ".png"], maxFileSize: 10, allowMultiple: true },
          { id: u(), type: "signature", label: "Applicant Signature", required: true, hidden: false, readOnly: false, width: "full", description: "By signing, you certify that the information provided is accurate and complete." },
        ],
      },
    ],
    settings: makeSettings({ multiPage: true }),
  },
};

const atiRequest: GCTemplate = {
  id: "gc-ati-request",
  title: "Access to Information Request",
  titleFr: "Demande d'accès à l'information",
  description: "Submit a formal ATI / Privacy Act request to a federal institution under the Access to Information Act.",
  descriptionFr: "Soumettez une demande officielle d'AIPRP à une institution fédérale.",
  category: "ati",
  tags: ["ATI", "ATIP", "privacy", "FOIP"],
  estimatedTime: 10,
  schema: {
    id: u(),
    title: "Access to Information and Privacy (ATIP) Request",
    description: "Complete this form to request records from a federal government institution.",
    pages: [
      {
        id: u(),
        title: "Requester Information",
        fields: [
          { id: u(), type: "name", label: "Full Name", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "email", label: "Email Address", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "phone", label: "Phone Number", required: false, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "address", label: "Mailing Address", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "single_choice", label: "Request Type", required: true, hidden: false, readOnly: false, width: "full", options: [
            { id: u(), label: "Access to Information Act", value: "ati" },
            { id: u(), label: "Privacy Act (own information)", value: "privacy" },
          ]},
        ],
      },
      {
        id: u(),
        title: "Request Details",
        fields: [
          { id: u(), type: "short_text", label: "Federal Institution", placeholder: "e.g. Treasury Board of Canada Secretariat", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "long_text", label: "Description of Records Requested", placeholder: "Be as specific as possible — include dates, subjects, document types, or names of individuals…", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "date_range", label: "Date Range of Records", required: false, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "single_choice", label: "Preferred Format", required: true, hidden: false, readOnly: false, width: "half", options: [
            { id: u(), label: "Electronic (PDF)", value: "pdf" },
            { id: u(), label: "Paper", value: "paper" },
          ]},
          { id: u(), type: "single_choice", label: "Preferred Language", required: true, hidden: false, readOnly: false, width: "half", options: [
            { id: u(), label: "English", value: "en" },
            { id: u(), label: "French / Français", value: "fr" },
          ]},
          { id: u(), type: "boolean", label: "I am willing to pay applicable fees (up to $25 for ATI requests)", required: true, hidden: false, readOnly: false, width: "full" },
        ],
      },
    ],
    settings: makeSettings({ multiPage: true, submitLabel: "Submit ATIP Request" }),
  },
};

const complaintIntake: GCTemplate = {
  id: "gc-complaint-intake",
  title: "Complaint Intake Form",
  titleFr: "Formulaire de réception des plaintes",
  description: "Capture and triage service complaints submitted to a federal department.",
  descriptionFr: "Saisir et trier les plaintes de service soumises à un ministère fédéral.",
  category: "complaints",
  tags: ["complaint", "feedback", "service"],
  estimatedTime: 8,
  schema: {
    id: u(),
    title: "Service Complaint",
    description: "We are committed to improving our services. Please tell us about your experience.",
    pages: [
      {
        id: u(),
        title: "Your Information",
        fields: [
          { id: u(), type: "name", label: "Name", required: false, hidden: false, readOnly: false, width: "full", description: "Optional — you may submit anonymously" },
          { id: u(), type: "email", label: "Email Address", required: false, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "phone", label: "Phone Number", required: false, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "boolean", label: "I wish to remain anonymous", required: false, hidden: false, readOnly: false, width: "full" },
        ],
      },
      {
        id: u(),
        title: "Complaint Details",
        fields: [
          { id: u(), type: "single_choice", label: "Type of Complaint", required: true, hidden: false, readOnly: false, width: "full", options: [
            { id: u(), label: "Service delay", value: "delay" },
            { id: u(), label: "Incorrect information received", value: "incorrect_info" },
            { id: u(), label: "Rude or unprofessional conduct", value: "conduct" },
            { id: u(), label: "Accessibility barrier", value: "accessibility" },
            { id: u(), label: "Language rights violation", value: "language" },
            { id: u(), label: "Other", value: "other" },
          ]},
          { id: u(), type: "date", label: "Date of Incident", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "short_text", label: "Program or Service Affected", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "long_text", label: "Description of Complaint", placeholder: "Please describe what happened…", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "long_text", label: "Desired Resolution", placeholder: "What outcome are you seeking?", required: false, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "file_upload", label: "Supporting Documents", required: false, hidden: false, readOnly: false, width: "full", acceptedFileTypes: [".pdf", ".jpg", ".png", ".docx"], maxFileSize: 10, allowMultiple: true },
        ],
      },
    ],
    settings: makeSettings({ multiPage: true, submitLabel: "Submit Complaint", successMessage: "Your complaint has been received. You will be contacted within 15 business days." }),
  },
};

const grantApplication: GCTemplate = {
  id: "gc-grant-application",
  title: "Grant Application",
  titleFr: "Demande de subvention",
  description: "Eligibility screening and funding request for Government of Canada grant programs.",
  descriptionFr: "Admissibilité et demande de financement pour les programmes de subventions.",
  category: "grants",
  tags: ["grant", "funding", "contribution"],
  estimatedTime: 25,
  schema: {
    id: u(),
    title: "Grant / Contribution Application",
    pages: [
      {
        id: u(),
        title: "Organization Profile",
        fields: [
          { id: u(), type: "short_text", label: "Organization Legal Name", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "short_text", label: "Business Number (BN)", placeholder: "123456789", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "single_choice", label: "Organization Type", required: true, hidden: false, readOnly: false, width: "half", options: [
            { id: u(), label: "Non-profit / Charity", value: "nonprofit" },
            { id: u(), label: "Small Business (< 500 employees)", value: "small_biz" },
            { id: u(), label: "Research Institution", value: "research" },
            { id: u(), label: "Municipal / Provincial Government", value: "gov" },
            { id: u(), label: "Indigenous Organization", value: "indigenous" },
            { id: u(), label: "Other", value: "other" },
          ]},
          { id: u(), type: "address", label: "Registered Address", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "email", label: "Primary Contact Email", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "phone", label: "Primary Contact Phone", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "name", label: "Authorized Representative", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "short_text", label: "Title/Position", required: true, hidden: false, readOnly: false, width: "half" },
        ],
      },
      {
        id: u(),
        title: "Project Proposal",
        fields: [
          { id: u(), type: "short_text", label: "Project Title", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "long_text", label: "Project Description", placeholder: "Provide a concise overview of the project, its goals, and expected outcomes…", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "date", label: "Proposed Start Date", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "date", label: "Proposed End Date", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "currency", label: "Total Project Cost (CAD)", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "currency", label: "Amount Requested (CAD)", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "multi_choice", label: "Target Population", required: true, hidden: false, readOnly: false, width: "full", options: [
            { id: u(), label: "Seniors", value: "seniors" },
            { id: u(), label: "Youth", value: "youth" },
            { id: u(), label: "Women and girls", value: "women" },
            { id: u(), label: "Indigenous peoples", value: "indigenous" },
            { id: u(), label: "Persons with disabilities", value: "disabilities" },
            { id: u(), label: "Newcomers / immigrants", value: "newcomers" },
            { id: u(), label: "Rural / remote communities", value: "rural" },
          ]},
        ],
      },
      {
        id: u(),
        title: "Budget & Documents",
        fields: [
          { id: u(), type: "long_text", label: "Budget Breakdown", placeholder: "Personnel: $X\nEquipment: $X\nTravel: $X\nOther: $X", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "file_upload", label: "Detailed Budget Spreadsheet", required: false, hidden: false, readOnly: false, width: "full", acceptedFileTypes: [".xlsx", ".csv", ".pdf"], maxFileSize: 10 },
          { id: u(), type: "file_upload", label: "Letters of Support", required: false, hidden: false, readOnly: false, width: "full", acceptedFileTypes: [".pdf", ".docx"], maxFileSize: 10, allowMultiple: true },
          { id: u(), type: "signature", label: "Authorized Signature", required: true, hidden: false, readOnly: false, width: "full" },
        ],
      },
    ],
    settings: makeSettings({ multiPage: true, submitLabel: "Submit Application", successMessage: "Your grant application has been submitted. Reference number will be emailed to you within 24 hours." }),
  },
};

const inspectionForm: GCTemplate = {
  id: "gc-inspection-checklist",
  title: "Regulatory Inspection Report",
  titleFr: "Rapport d'inspection réglementaire",
  description: "Field inspection checklist for federal regulatory inspectors — food safety, transportation, environment, etc.",
  descriptionFr: "Liste de contrôle pour les inspecteurs fédéraux.",
  category: "inspections",
  tags: ["inspection", "compliance", "regulatory", "field"],
  estimatedTime: 20,
  schema: {
    id: u(),
    title: "Regulatory Inspection Report",
    pages: [
      {
        id: u(),
        title: "Inspection Details",
        fields: [
          { id: u(), type: "short_text", label: "Inspection Reference Number", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "single_choice", label: "Inspection Type", required: true, hidden: false, readOnly: false, width: "half", options: [
            { id: u(), label: "Routine / Scheduled", value: "routine" },
            { id: u(), label: "Complaint-driven", value: "complaint" },
            { id: u(), label: "Follow-up", value: "followup" },
            { id: u(), label: "Incident Response", value: "incident" },
          ]},
          { id: u(), type: "date", label: "Inspection Date", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "time", label: "Inspection Start Time", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "name", label: "Lead Inspector", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "short_text", label: "Inspector Employee ID", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "short_text", label: "Regulated Entity Name", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "address", label: "Inspection Site Address", required: true, hidden: false, readOnly: false, width: "full" },
        ],
      },
      {
        id: u(),
        title: "Compliance Assessment",
        fields: [
          { id: u(), type: "section_header", label: "Regulatory Requirements", required: false, hidden: false, readOnly: false, width: "full", headingLevel: 2 },
          { id: u(), type: "single_choice", label: "Documentation & Records", required: true, hidden: false, readOnly: false, width: "half", options: [
            { id: u(), label: "Compliant", value: "compliant" },
            { id: u(), label: "Non-compliant", value: "non_compliant" },
            { id: u(), label: "Not Applicable", value: "na" },
          ]},
          { id: u(), type: "single_choice", label: "Facilities & Equipment", required: true, hidden: false, readOnly: false, width: "half", options: [
            { id: u(), label: "Compliant", value: "compliant" },
            { id: u(), label: "Non-compliant", value: "non_compliant" },
            { id: u(), label: "Not Applicable", value: "na" },
          ]},
          { id: u(), type: "single_choice", label: "Personnel Training", required: true, hidden: false, readOnly: false, width: "half", options: [
            { id: u(), label: "Compliant", value: "compliant" },
            { id: u(), label: "Non-compliant", value: "non_compliant" },
            { id: u(), label: "Not Applicable", value: "na" },
          ]},
          { id: u(), type: "single_choice", label: "Safety Procedures", required: true, hidden: false, readOnly: false, width: "half", options: [
            { id: u(), label: "Compliant", value: "compliant" },
            { id: u(), label: "Non-compliant", value: "non_compliant" },
            { id: u(), label: "Not Applicable", value: "na" },
          ]},
          { id: u(), type: "single_choice", label: "Overall Compliance Outcome", required: true, hidden: false, readOnly: false, width: "full", options: [
            { id: u(), label: "Satisfactory — No action required", value: "satisfactory" },
            { id: u(), label: "Conditional — Minor corrective action required", value: "conditional" },
            { id: u(), label: "Unsatisfactory — Enforcement action initiated", value: "unsatisfactory" },
          ]},
          { id: u(), type: "long_text", label: "Findings & Observations", placeholder: "Document all observations, measurements, and findings…", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "long_text", label: "Corrective Action Required", placeholder: "List required actions and timelines…", required: false, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "file_upload", label: "Photos / Evidence", required: false, hidden: false, readOnly: false, width: "full", acceptedFileTypes: [".jpg", ".png", ".pdf"], maxFileSize: 20, allowMultiple: true },
          { id: u(), type: "signature", label: "Inspector Signature", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "signature", label: "Regulated Entity Representative Signature", required: false, hidden: false, readOnly: false, width: "half" },
        ],
      },
    ],
    settings: makeSettings({ multiPage: true, submitLabel: "Submit Inspection Report", allowSaveAndResume: true }),
  },
};

const benefitsEnrollment: GCTemplate = {
  id: "gc-benefits-enrollment",
  title: "Benefits Enrollment",
  titleFr: "Inscription aux prestations",
  description: "Enrollment form for Government of Canada benefits programs including eligibility screening.",
  descriptionFr: "Formulaire d'inscription aux programmes de prestations du GC.",
  category: "benefits",
  tags: ["benefits", "enrollment", "EI", "OAS", "CPP"],
  estimatedTime: 12,
  schema: {
    id: u(),
    title: "Benefits Enrollment Application",
    pages: [
      {
        id: u(),
        title: "Personal Information",
        fields: [
          { id: u(), type: "name", label: "Full Legal Name", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "date", label: "Date of Birth", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "single_choice", label: "Gender", required: false, hidden: false, readOnly: false, width: "half", options: [
            { id: u(), label: "Man", value: "man" },
            { id: u(), label: "Woman", value: "woman" },
            { id: u(), label: "Non-binary / gender diverse", value: "nonbinary" },
            { id: u(), label: "Prefer not to say", value: "no_answer" },
          ]},
          { id: u(), type: "short_text", label: "Social Insurance Number (SIN)", placeholder: "000 000 000", required: true, hidden: false, readOnly: false, width: "half", description: "Required to determine eligibility" },
          { id: u(), type: "email", label: "Email Address", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "phone", label: "Phone Number", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "address", label: "Home Address", required: true, hidden: false, readOnly: false, width: "full" },
        ],
      },
      {
        id: u(),
        title: "Eligibility & Benefit Details",
        fields: [
          { id: u(), type: "single_choice", label: "Benefit Program", required: true, hidden: false, readOnly: false, width: "full", options: [
            { id: u(), label: "Employment Insurance (EI)", value: "ei" },
            { id: u(), label: "Old Age Security (OAS)", value: "oas" },
            { id: u(), label: "Canada Pension Plan (CPP)", value: "cpp" },
            { id: u(), label: "Canada Child Benefit (CCB)", value: "ccb" },
            { id: u(), label: "Guaranteed Income Supplement (GIS)", value: "gis" },
            { id: u(), label: "Canada Workers Benefit (CWB)", value: "cwb" },
          ]},
          { id: u(), type: "date", label: "Requested Start Date", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "single_choice", label: "Residency Status", required: true, hidden: false, readOnly: false, width: "half", options: [
            { id: u(), label: "Canadian Citizen", value: "citizen" },
            { id: u(), label: "Permanent Resident", value: "pr" },
            { id: u(), label: "Protected Person", value: "protected" },
          ]},
          { id: u(), type: "single_choice", label: "Payment Method", required: true, hidden: false, readOnly: false, width: "full", options: [
            { id: u(), label: "Direct deposit to Canadian bank account", value: "direct_deposit" },
            { id: u(), label: "Cheque by mail", value: "cheque" },
          ]},
          { id: u(), type: "long_text", label: "Additional Information", required: false, hidden: false, readOnly: false, width: "full", placeholder: "Any other relevant information…" },
          { id: u(), type: "file_upload", label: "Supporting Documentation", required: true, hidden: false, readOnly: false, width: "full", description: "e.g. proof of identity, Record of Employment, Notice of Assessment", acceptedFileTypes: [".pdf", ".jpg", ".png"], maxFileSize: 10, allowMultiple: true },
          { id: u(), type: "signature", label: "Applicant Signature", required: true, hidden: false, readOnly: false, width: "full" },
        ],
      },
    ],
    settings: makeSettings({ multiPage: true, submitLabel: "Submit Enrollment" }),
  },
};

const visitorRegistration: GCTemplate = {
  id: "gc-visitor-registration",
  title: "Visitor / Event Registration",
  titleFr: "Inscription des visiteurs / événements",
  description: "Register visitors to a federal facility, event, or program.",
  descriptionFr: "Inscrire les visiteurs à une installation, un événement ou un programme fédéral.",
  category: "visitor",
  tags: ["visitor", "event", "registration", "security"],
  estimatedTime: 5,
  schema: {
    id: u(),
    title: "Visitor Registration",
    pages: [
      {
        id: u(),
        title: "Visitor Information",
        fields: [
          { id: u(), type: "name", label: "Full Name", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "email", label: "Email Address", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "phone", label: "Phone Number", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "single_choice", label: "Type of Identification Presented", required: true, hidden: false, readOnly: false, width: "half", options: [
            { id: u(), label: "Government-issued photo ID", value: "photo_id" },
            { id: u(), label: "Passport", value: "passport" },
            { id: u(), label: "Permanent Resident Card", value: "pr_card" },
            { id: u(), label: "Other", value: "other" },
          ]},
          { id: u(), type: "short_text", label: "Organization / Employer", required: false, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "short_text", label: "Purpose of Visit", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "short_text", label: "Host Name (GC Employee)", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "short_text", label: "Host Department", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "datetime", label: "Expected Arrival", required: true, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "datetime", label: "Expected Departure", required: false, hidden: false, readOnly: false, width: "half" },
          { id: u(), type: "boolean", label: "I agree to comply with all security requirements while on federal premises", required: true, hidden: false, readOnly: false, width: "full" },
        ],
      },
    ],
    settings: makeSettings({ multiPage: false, submitLabel: "Register", successMessage: "Your registration has been confirmed. Please present this confirmation at the security desk upon arrival." }),
  },
};

const feedbackSurvey: GCTemplate = {
  id: "gc-service-feedback",
  title: "Service Satisfaction Survey",
  titleFr: "Sondage sur la satisfaction des services",
  description: "Standard GC service satisfaction survey aligned with the Government of Canada Client Experience Survey methodology.",
  descriptionFr: "Sondage standard sur la satisfaction du service aligné sur la méthodologie GC.",
  category: "feedback",
  tags: ["survey", "satisfaction", "CX", "service"],
  estimatedTime: 5,
  schema: {
    id: u(),
    title: "Service Satisfaction Survey",
    description: "Your feedback helps us improve Government of Canada services. This survey takes approximately 5 minutes.",
    pages: [
      {
        id: u(),
        title: "Your Experience",
        fields: [
          { id: u(), type: "short_text", label: "Service Used", placeholder: "e.g. Passport application, EI application", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "single_choice", label: "How did you access this service?", required: true, hidden: false, readOnly: false, width: "full", options: [
            { id: u(), label: "Online (web)", value: "online" },
            { id: u(), label: "In person", value: "in_person" },
            { id: u(), label: "By phone", value: "phone" },
            { id: u(), label: "By mail", value: "mail" },
          ]},
          { id: u(), type: "rating", label: "Overall satisfaction with the service", required: true, hidden: false, readOnly: false, width: "full", maxRating: 5, description: "1 = Very dissatisfied, 5 = Very satisfied" },
          { id: u(), type: "rating", label: "Ease of completing the service", required: true, hidden: false, readOnly: false, width: "half", maxRating: 5 },
          { id: u(), type: "rating", label: "Timeliness of service delivery", required: true, hidden: false, readOnly: false, width: "half", maxRating: 5 },
          { id: u(), type: "yes_no", label: "Were you able to complete what you came to do?", required: true, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "long_text", label: "What could we do to improve this service?", placeholder: "Your suggestions are valuable…", required: false, hidden: false, readOnly: false, width: "full" },
          { id: u(), type: "single_choice", label: "Language of service received", required: true, hidden: false, readOnly: false, width: "half", options: [
            { id: u(), label: "English", value: "en" },
            { id: u(), label: "French / Français", value: "fr" },
            { id: u(), label: "Both", value: "both" },
          ]},
          { id: u(), type: "yes_no", label: "Were you served in the official language of your choice?", required: true, hidden: false, readOnly: false, width: "half" },
        ],
      },
    ],
    settings: makeSettings({ multiPage: false, submitLabel: "Submit Feedback", successMessage: "Thank you for your feedback. Your responses help us continuously improve Government of Canada services." }),
  },
};

export const GC_TEMPLATES: GCTemplate[] = [
  permitApplication,
  atiRequest,
  complaintIntake,
  grantApplication,
  inspectionForm,
  benefitsEnrollment,
  visitorRegistration,
  feedbackSurvey,
];
