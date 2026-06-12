"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Id } from "./_generated/dataModel.d.ts";

type MergeField = { key: string; label: string; source: "submission_field" | "submission_meta" | "static" };
type TemplateBlock =
  | { type: "header"; text: string; level: 1 | 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "field_value"; fieldKey: string; label: string }
  | { type: "table"; columns: string[]; rows: string[][] }
  | { type: "divider" }
  | { type: "spacer"; height?: number }
  | { type: "all_fields" };

/** Replace {{key}} merge tags in text with actual values from data record */
function resolveMergeTags(text: string, data: Record<string, unknown>, meta: Record<string, string>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const trimmed = key.trim();
    if (trimmed in meta) return meta[trimmed] ?? "";
    const val = data[trimmed];
    if (val === undefined || val === null) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  });
}

/** Build a professional CanFlow.ai branded PDF from template + submission data */
function buildPdf(opts: {
  templateName: string;
  formName: string;
  tenantName: string;
  referenceNumber: string;
  submittedAt: string;
  blocks: TemplateBlock[];
  submissionData: Record<string, unknown>;
  mergeFields: MergeField[];
}): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const meta: Record<string, string> = {
    reference_number: opts.referenceNumber,
    form_name: opts.formName,
    tenant_name: opts.tenantName,
    submitted_at: new Date(opts.submittedAt).toLocaleString("en-CA"),
    generated_at: new Date().toLocaleString("en-CA"),
  };

  const pageW = 210;
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 0;

  // ── GC-style header banner ────────────────────────────────────────────────
  // Red bar
  doc.setFillColor(196, 30, 58);
  doc.rect(0, 0, pageW, 12, "F");

  // CanFlow.ai branding text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CanFlow.ai", marginL, 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Government of Canada — Automated Processing", 50, 8);

  // White area below banner
  y = 20;

  // Document title
  doc.setTextColor(26, 26, 46);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(opts.templateName, marginL, y);
  y += 8;

  // Subtitle bar
  doc.setFillColor(240, 242, 245);
  doc.rect(marginL, y, contentW, 8, "F");
  doc.setTextColor(80, 80, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Reference: ${opts.referenceNumber}`, marginL + 3, y + 5.5);
  doc.text(`Form: ${opts.formName}`, marginL + 70, y + 5.5);
  doc.text(`Submitted: ${meta.submitted_at}`, marginL + 130, y + 5.5);
  y += 14;

  // ── Render blocks ─────────────────────────────────────────────────────────
  const addPageIfNeeded = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  };

  for (const block of opts.blocks) {
    switch (block.type) {
      case "header": {
        addPageIfNeeded(10);
        const sizes: Record<number, number> = { 1: 14, 2: 12, 3: 10 };
        const size = sizes[block.level] ?? 11;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(size);
        doc.setTextColor(26, 26, 46);
        const resolved = resolveMergeTags(block.text, opts.submissionData, meta);
        doc.text(resolved, marginL, y);
        y += size * 0.5 + 2;
        // Underline for h1
        if (block.level === 1) {
          doc.setDrawColor(196, 30, 58);
          doc.setLineWidth(0.5);
          doc.line(marginL, y, marginL + contentW, y);
          y += 3;
        }
        break;
      }
      case "paragraph": {
        addPageIfNeeded(8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 80);
        const resolved = resolveMergeTags(block.text, opts.submissionData, meta);
        const lines = doc.splitTextToSize(resolved, contentW);
        addPageIfNeeded(lines.length * 5);
        doc.text(lines, marginL, y);
        y += lines.length * 5 + 2;
        break;
      }
      case "field_value": {
        addPageIfNeeded(8);
        const val = opts.submissionData[block.fieldKey];
        const displayVal = val === undefined || val === null ? "—" : String(val);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 100);
        doc.text(`${block.label}:`, marginL, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(26, 26, 46);
        const valLines = doc.splitTextToSize(displayVal, contentW - 50);
        doc.text(valLines, marginL + 50, y);
        y += Math.max(valLines.length * 5, 6) + 1;
        break;
      }
      case "table": {
        addPageIfNeeded(20);
        autoTable(doc, {
          startY: y,
          head: [block.columns],
          body: block.rows.map((row) =>
            row.map((cell) => resolveMergeTags(cell, opts.submissionData, meta))
          ),
          theme: "striped",
          headStyles: { fillColor: [26, 26, 46], textColor: 255, fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: marginL, right: marginR },
        });
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
        break;
      }
      case "all_fields": {
        // Render every field in submission data as a two-column table
        const entries = Object.entries(opts.submissionData).filter(
          ([k]) => !k.startsWith("_")
        );
        if (entries.length === 0) break;
        addPageIfNeeded(20);
        autoTable(doc, {
          startY: y,
          head: [["Field", "Value"]],
          body: entries.map(([k, v]) => [k, v === null || v === undefined ? "—" : String(v)]),
          theme: "striped",
          headStyles: { fillColor: [26, 26, 46], textColor: 255, fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" }, 1: { cellWidth: contentW - 60 } },
          margin: { left: marginL, right: marginR },
        });
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
        break;
      }
      case "divider": {
        addPageIfNeeded(5);
        doc.setDrawColor(220, 220, 230);
        doc.setLineWidth(0.3);
        doc.line(marginL, y, marginL + contentW, y);
        y += 4;
        break;
      }
      case "spacer":
        y += block.height ?? 5;
        break;
    }
  }

  // ── Footer on every page ─────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(240, 242, 245);
    doc.rect(0, 285, pageW, 12, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 140);
    doc.text(`Generated by CanFlow.ai  |  ${new Date().toLocaleDateString("en-CA")}  |  Page ${i} of ${totalPages}`, marginL, 293);
    doc.text(opts.tenantName, pageW - marginR, 293, { align: "right" });
  }

  return doc;
}

// ── Public action — generate PDF for a submission ─────────────────────────

export const generatePdfForSubmission = action({
  args: {
    submissionId: v.id("submissions"),
    templateId: v.id("docTemplates"),
  },
  handler: async (ctx, args): Promise<{ dataUri: string; filename: string; docId: Id<"generatedDocuments"> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    // Load resources
    const [submission, template] = await Promise.all([
      ctx.runQuery(internal.documentGeneration.getSubmissionForPdf, { submissionId: args.submissionId }),
      ctx.runQuery(internal.documentGeneration.getTemplateForPdf, { templateId: args.templateId }),
    ]);

    if (!submission) throw new ConvexError({ message: "Submission not found", code: "NOT_FOUND" });
    if (!template) throw new ConvexError({ message: "Template not found", code: "NOT_FOUND" });

    const submissionData = (() => {
      try { return JSON.parse(submission.data) as Record<string, unknown>; } catch { return {} as Record<string, unknown>; }
    })();

    const blocks = (() => {
      try { return JSON.parse(template.content) as TemplateBlock[]; } catch { return [{ type: "all_fields" } as TemplateBlock]; }
    })();

    const mergeFields = (() => {
      try { return JSON.parse(template.mergeFields) as MergeField[]; } catch { return [] as MergeField[]; }
    })();

    const doc = buildPdf({
      templateName: template.name,
      formName: submission.formName,
      tenantName: submission.tenantName,
      referenceNumber: submission.referenceNumber,
      submittedAt: submission.submittedAt,
      blocks,
      submissionData,
      mergeFields,
    });

    const dataUri = doc.output("dataurlstring");
    const slug = template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `${slug}-${submission.referenceNumber}.pdf`;

    // Record the generation
    const docId = await ctx.runMutation(internal.documentGeneration.recordGeneratedDoc, {
      tenantId: submission.tenantId,
      submissionId: args.submissionId,
      templateId: args.templateId,
      filename,
      format: "pdf",
      dataUri,
      generatorTokenIdentifier: identity.tokenIdentifier,
    });

    return { dataUri, filename, docId };
  },
});

// ── Bulk-generate for a submission (all active templates linked to the form) ──

export const generateAllDocsForSubmission = internalAction({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args): Promise<void> => {
    const submission = await ctx.runQuery(internal.documentGeneration.getSubmissionForPdf, {
      submissionId: args.submissionId,
    });
    if (!submission) return;

    const templates = await ctx.runQuery(internal.documentGeneration.listActiveTemplatesForForm, {
      tenantId: submission.tenantId,
      formId: submission.formId,
    });

    // Generate each template (fire-and-forget individual errors)
    await Promise.allSettled(
      templates.map((t) =>
        ctx.runAction(internal.documentGenerationAction.generatePdfInternal, {
          submissionId: args.submissionId,
          templateId: t._id,
        })
      )
    );
  },
});

export const generatePdfInternal = internalAction({
  args: {
    submissionId: v.id("submissions"),
    templateId: v.id("docTemplates"),
  },
  handler: async (ctx, args): Promise<void> => {
    const [submission, template] = await Promise.all([
      ctx.runQuery(internal.documentGeneration.getSubmissionForPdf, { submissionId: args.submissionId }),
      ctx.runQuery(internal.documentGeneration.getTemplateForPdf, { templateId: args.templateId }),
    ]);
    if (!submission || !template) return;

    const submissionData = (() => {
      try { return JSON.parse(submission.data) as Record<string, unknown>; } catch { return {} as Record<string, unknown>; }
    })();

    const blocks = (() => {
      try { return JSON.parse(template.content) as TemplateBlock[]; } catch { return [{ type: "all_fields" } as TemplateBlock]; }
    })();

    const mergeFields = (() => {
      try { return JSON.parse(template.mergeFields) as MergeField[]; } catch { return [] as MergeField[]; }
    })();

    const doc = buildPdf({
      templateName: template.name,
      formName: submission.formName,
      tenantName: submission.tenantName,
      referenceNumber: submission.referenceNumber,
      submittedAt: submission.submittedAt,
      blocks,
      submissionData,
      mergeFields,
    });

    const dataUri = doc.output("dataurlstring");
    const slug = template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `${slug}-${submission.referenceNumber}.pdf`;

    await ctx.runMutation(internal.documentGeneration.recordGeneratedDocSystem, {
      tenantId: submission.tenantId,
      submissionId: args.submissionId,
      templateId: args.templateId,
      filename,
      format: "pdf",
      dataUri,
      createdBy: submission.createdById,
    });
  },
});
