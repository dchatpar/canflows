/**
 * Form Embed & QR Code page — share a published form via embed code or QR.
 * Route: /forms/:formId/share
 */
import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useParams, useNavigate } from "react-router-dom";
import { useTenant } from "@/contexts/tenant-context.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  ArrowLeft, Share2, Code2, QrCode, Link2, Copy, Download, ExternalLink,
  FileText, AlertTriangle,
} from "lucide-react";

// ─── QR Code Canvas ───────────────────────────────────────────────────────────
function QRCodeCanvas({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 256,
      margin: 2,
      color: { dark: "#1a1a2e", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).catch(console.error);
  }, [url]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "form-qr.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <canvas ref={canvasRef} className="block rounded-lg" />
      </div>
      <Button onClick={handleDownload} variant="ghost" size="sm">
        <Download className="size-4 mr-2" /> Download PNG
      </Button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
function SharePageInner() {
  const navigate = useNavigate();
  const { formId } = useParams<{ formId: string }>();
  const form = useQuery(api.forms.getById, formId ? { formId: formId as Id<"forms"> } : "skip");

  // Embed options
  const [embedWidth, setEmbedWidth] = useState("100%");
  const [embedHeight, setEmbedHeight] = useState("600px");
  const [showBorder, setShowBorder] = useState(true);
  const [embedTheme, setEmbedTheme] = useState<"light" | "dark" | "auto">("auto");

  const formUrl = formId
    ? `${window.location.origin}/submit/${formId}`
    : "";

  const embedCode = `<iframe
  src="${formUrl}?theme=${embedTheme}"
  width="${embedWidth}"
  height="${embedHeight}"
  frameborder="${showBorder ? "1" : "0"}"
  style="border:${showBorder ? "1px solid #e2e8f0" : "none"};border-radius:8px;"
  title="CanFlow Form"
  loading="lazy"
></iframe>`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied to clipboard`),
      () => toast.error("Failed to copy"),
    );
  };

  if (form === undefined) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (form === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <AlertTriangle className="size-8 text-muted-foreground" />
        <p className="text-muted-foreground">Form not found.</p>
        <Button onClick={() => navigate("/forms")} variant="ghost">Back to Forms</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => navigate("/forms")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold flex items-center gap-2 truncate">
              <Share2 className="size-5 text-primary shrink-0" />
              Share Form
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {form.name}
              {form.status !== "published" && (
                <span className="ml-2 text-yellow-600 font-medium">· Not published</span>
              )}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate(`/forms/${formId}/edit`)}>
            <FileText className="size-3.5 mr-1.5" /> Edit Form
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {form.status !== "published" && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 px-4 py-3 flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="size-4 shrink-0" />
            This form is not published. Publish it first so end users can access it.
          </div>
        )}

        <Tabs defaultValue="link" className="max-w-2xl">
          <TabsList className="mb-6">
            <TabsTrigger value="link"><Link2 className="size-3.5 mr-1.5" />Direct Link</TabsTrigger>
            <TabsTrigger value="embed"><Code2 className="size-3.5 mr-1.5" />Embed</TabsTrigger>
            <TabsTrigger value="qr"><QrCode className="size-3.5 mr-1.5" />QR Code</TabsTrigger>
          </TabsList>

          {/* Direct Link */}
          <TabsContent value="link" className="space-y-4">
            <div>
              <Label className="mb-1.5 block">Public Form URL</Label>
              <div className="flex gap-2">
                <Input value={formUrl} readOnly className="font-mono text-xs" />
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(formUrl, "URL")}>
                  <Copy className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" asChild>
                  <a href={formUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Share this link so citizens can access and fill out your form directly.
              </p>
            </div>
          </TabsContent>

          {/* Embed */}
          <TabsContent value="embed" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Width</Label>
                <Input value={embedWidth} onChange={(e) => setEmbedWidth(e.target.value)} placeholder="100%" />
              </div>
              <div className="space-y-1.5">
                <Label>Height</Label>
                <Input value={embedHeight} onChange={(e) => setEmbedHeight(e.target.value)} placeholder="600px" />
              </div>
              <div className="space-y-1.5">
                <Label>Theme</Label>
                <Select value={embedTheme} onValueChange={(v) => setEmbedTheme(v as typeof embedTheme)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (system)</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch id="border" checked={showBorder} onCheckedChange={setShowBorder} />
                <Label htmlFor="border" className="cursor-pointer">Show border</Label>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Embed Code</Label>
              <div className="relative">
                <Textarea
                  value={embedCode}
                  readOnly
                  rows={7}
                  className="font-mono text-xs resize-none pr-10"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 size-7"
                  onClick={() => copyToClipboard(embedCode, "Embed code")}
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Paste this snippet into any HTML page, portal, or CMS to embed the form.
              </p>
            </div>
          </TabsContent>

          {/* QR Code */}
          <TabsContent value="qr" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Print this QR code on posters, brochures, or letters so citizens can scan and access the form on their mobile device.
            </p>
            <QRCodeCanvas url={formUrl} />
            <p className="text-xs text-muted-foreground">
              QR code links to: <span className="font-mono break-all">{formUrl}</span>
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function FormSharePage() {
  return (
    <>
      <AuthLoading>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <p className="text-muted-foreground">Please sign in to continue.</p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <SharePageInner />
      </Authenticated>
    </>
  );
}
