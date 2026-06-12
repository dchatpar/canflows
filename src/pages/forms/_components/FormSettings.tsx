/**
 * FormSettings — right-hand panel shown when no field is selected.
 * Allows editing form-level settings like multi-page, submit label, etc.
 */
import type { FormSchema } from "../_lib/form-schema.ts";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";

type Props = {
  schema: FormSchema;
  onChange: (updated: FormSchema) => void;
};

export default function FormSettings({ schema, onChange }: Props) {
  const s = schema.settings;

  const update = (patch: Partial<FormSchema["settings"]>) => {
    onChange({ ...schema, settings: { ...s, ...patch } });
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l bg-muted/20 overflow-y-auto">
      <div className="border-b px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Form Settings</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Form name */}
        <div className="space-y-1.5">
          <Label className="text-xs">Form Name</Label>
          <Input
            value={schema.title}
            onChange={(e) => onChange({ ...schema, title: e.target.value })}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Description</Label>
          <Textarea
            value={schema.description ?? ""}
            onChange={(e) => onChange({ ...schema, description: e.target.value })}
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        <Separator />

        {/* Behaviour */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Behaviour</p>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Multi-page wizard</Label>
            <Switch checked={s.multiPage} onCheckedChange={(c) => update({ multiPage: c })} />
          </div>

          {s.multiPage && (
            <div className="flex items-center justify-between">
              <Label className="text-xs">Progress bar</Label>
              <Switch checked={s.showProgressBar} onCheckedChange={(c) => update({ showProgressBar: c })} />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label className="text-xs">Allow save &amp; resume</Label>
            <Switch checked={s.allowSaveAndResume} onCheckedChange={(c) => update({ allowSaveAndResume: c })} />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">CAPTCHA</Label>
            <Switch checked={s.captchaEnabled} onCheckedChange={(c) => update({ captchaEnabled: c })} />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Confirmation email</Label>
            <Switch checked={s.confirmationEmail} onCheckedChange={(c) => update({ confirmationEmail: c })} />
          </div>
        </div>

        <Separator />

        {/* Locale */}
        <div className="space-y-1.5">
          <Label className="text-xs">Language</Label>
          <Select value={s.locale} onValueChange={(v) => update({ locale: v as FormSchema["settings"]["locale"] })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English only</SelectItem>
              <SelectItem value="fr">Français only</SelectItem>
              <SelectItem value="both">Bilingual (EN/FR)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Submit */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Submission</p>

          <div className="space-y-1.5">
            <Label className="text-xs">Submit Button Label</Label>
            <Input
              value={s.submitLabel}
              onChange={(e) => update({ submitLabel: e.target.value })}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Success Message</Label>
            <Textarea
              value={s.successMessage}
              onChange={(e) => update({ successMessage: e.target.value })}
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Redirect URL (optional)</Label>
            <Input
              value={s.redirectUrl ?? ""}
              onChange={(e) => update({ redirectUrl: e.target.value || undefined })}
              className="h-8 text-sm"
              placeholder="https://…"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
