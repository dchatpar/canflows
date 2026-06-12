"use node";
/**
 * formAi.ts — AI-assisted form generation using Hercules AI Gateway.
 */
import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import OpenAI from "openai";
import type { FormSchema } from "../src/pages/forms/_lib/form-schema.ts";

const openai = new OpenAI({
  baseURL: "https://ai-gateway.hercules.app/v1",
  apiKey: process.env.HERCULES_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert Government of Canada form designer.
Generate a complete, production-ready form schema as a JSON object following the exact FormSchema type below.

Rules:
- Return ONLY valid JSON, no markdown fences, no explanations.
- Every page must have at least 3 fields.
- Use realistic Government of Canada field labels and descriptions in the requested language (default English).
- For bilingual forms use the "both" locale and provide French translations in field descriptions.
- Populate realistic options for choice fields.
- The settings object must always be fully populated.
- IDs must be unique UUID v4 strings.

FormSchema type (TypeScript):
{
  id: string, // UUID
  title: string,
  description?: string,
  pages: Array<{
    id: string, // UUID
    title: string,
    description?: string,
    fields: Array<{
      id: string, // UUID
      type: one of: short_text|long_text|rich_text|email|phone|url|number|currency|percentage|single_choice|multi_choice|dropdown|boolean|rating|ranking|date|time|datetime|date_range|file_upload|signature|section_header|divider|instructions|address|name|yes_no|slider|hidden,
      label: string,
      description?: string,
      placeholder?: string,
      required: boolean,
      hidden: boolean,
      readOnly: boolean,
      width: "full"|"half"|"third",
      options?: Array<{id: string, label: string, value: string}>, // for choice fields
      min?: string,
      max?: string,
      step?: number,
      maxRating?: number,
      headingLevel?: 2|3|4,
      acceptedFileTypes?: string[],
      maxFileSize?: number,
      allowMultiple?: boolean,
    }>
  }>,
  settings: {
    multiPage: boolean,
    showProgressBar: boolean,
    allowSaveAndResume: boolean,
    submitLabel: string,
    successMessage: string,
    captchaEnabled: boolean,
    confirmationEmail: boolean,
    locale: "en"|"fr"|"both"
  }
}`;

export const generateForm = action({
  args: {
    prompt: v.string(),
    locale: v.optional(v.union(v.literal("en"), v.literal("fr"), v.literal("both"))),
  },
  handler: async (_ctx, args): Promise<string> => {
    const locale = args.locale ?? "en";
    const userMsg = `Generate a Government of Canada form for: ${args.prompt}\nLocale: ${locale}`;

    const response = await openai.chat.completions.create({
      model: "openai/gpt-5-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      temperature: 0.4,
      max_tokens: 4096,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    // Validate JSON parses
    try {
      const parsed = JSON.parse(raw) as FormSchema;
      if (!parsed.pages || !parsed.settings) {
        throw new Error("Invalid schema structure");
      }
      return raw;
    } catch {
      throw new ConvexError({ message: "AI returned invalid form schema. Please try again.", code: "BAD_REQUEST" });
    }
  },
});
