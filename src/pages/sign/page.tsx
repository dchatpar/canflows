/**
 * Public signing portal — accessible via /sign/:token
 * No authentication required. Signers draw or type their signature.
 */
import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle2, PenLine, Type, X, AlertTriangle, RotateCcw } from "lucide-react";
import GCTopBar from "@/components/GCTopBar.tsx";
import Logo from "@/components/Logo.tsx";
import { ConvexError } from "convex/values";

// ─── Signature Canvas ─────────────────────────────────────────────────────────

function SignatureCanvas({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => {
    drawing.current = false;
    lastPos.current = null;
    const canvas = canvasRef.current;
    if (canvas) onCapture(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onCapture("");
  };

  return (
    <div className="space-y-2">
      <div className="relative border-2 border-dashed border-border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none select-none opacity-40">
          Draw your signature here
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={clear} className="gap-1 text-muted-foreground">
        <RotateCcw className="h-3.5 w-3.5" /> Clear
      </Button>
    </div>
  );
}

// ─── Typed signature ──────────────────────────────────────────────────────────

function TypedSignature({ name, onCapture }: { name: string; onCapture: (dataUrl: string) => void }) {
  const [typed, setTyped] = useState(name);

  useEffect(() => {
    // Render typed text to a canvas and return data URL
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 600, 160);
    ctx.font = "italic 48px Georgia, serif";
    ctx.fillStyle = "#1a1a2e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typed, 300, 80);
    onCapture(typed ? canvas.toDataURL("image/png") : "");
  }, [typed, onCapture]);

  return (
    <div className="space-y-2">
      <div className="border-2 border-dashed border-border rounded-lg bg-white p-4 flex items-center justify-center h-[160px]">
        <span style={{ fontFamily: "Georgia, serif", fontSize: "48px", fontStyle: "italic", color: "#1a1a2e" }}>
          {typed || <span className="text-muted-foreground text-base" style={{ fontFamily: "inherit" }}>Your name will appear here</span>}
        </span>
      </div>
      <Input
        placeholder="Type your full name"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        className="mt-2"
      />
    </div>
  );
}

// ─── Main signing page ────────────────────────────────────────────────────────

export default function SignPage() {
  const { token } = useParams<{ token: string }>();
  const data = useQuery(api.esignature.getSignerByToken, token ? { token } : "skip");
  const markViewed = useMutation(api.esignature.markSignerViewed);
  const submitSignature = useMutation(api.esignature.submitSignature);
  const declineSignature = useMutation(api.esignature.declineSignature);

  const [signatureData, setSignatureData] = useState("");
  const [sigMethod, setSigMethod] = useState<"draw" | "type">("draw");
  const [declineMode, setDeclineMode] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [done, setDone] = useState<"signed" | "declined" | null>(null);
  const [loading, setLoading] = useState(false);
  const hasMarkedViewed = useRef(false);

  useEffect(() => {
    if (data?.signer && !hasMarkedViewed.current) {
      hasMarkedViewed.current = true;
      markViewed({ token: token!, ipAddress: undefined, userAgent: navigator.userAgent }).catch(() => {});
    }
  }, [data, token, markViewed]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Invalid signing link.</p>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <GCTopBar />
        <div className="max-w-2xl mx-auto p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  if (data === null || !data.signer || !data.request) {
    return (
      <div className="min-h-screen bg-background">
        <GCTopBar />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Invalid Signing Link</h1>
          <p className="text-muted-foreground">This link is invalid or has expired. Please contact the sender for a new link.</p>
        </div>
      </div>
    );
  }

  const { signer, request } = data;

  // Already signed or declined
  if (done === "signed" || signer.status === "signed") {
    return (
      <div className="min-h-screen bg-background">
        <GCTopBar />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Document Signed</h1>
          <p className="text-muted-foreground mb-4">Thank you, <strong>{signer.name}</strong>. Your signature has been recorded.</p>
          <div className="bg-muted rounded-lg p-4 text-left text-sm space-y-1">
            <p><span className="font-medium">Document:</span> {request.title}</p>
            <p><span className="font-medium">Signed:</span> {signer.signedAt ? format(new Date(signer.signedAt), "MMMM d, yyyy · h:mm a") : format(new Date(), "MMMM d, yyyy · h:mm a")}</p>
            <p><span className="font-medium">Reference:</span> {request._id.slice(-8).toUpperCase()}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-4">A certificate of completion will be sent once all parties have signed.</p>
        </div>
      </div>
    );
  }

  if (done === "declined") {
    return (
      <div className="min-h-screen bg-background">
        <GCTopBar />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <X className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Signing Declined</h1>
          <p className="text-muted-foreground">You have declined to sign this document. The sender has been notified.</p>
        </div>
      </div>
    );
  }

  if (request.status === "cancelled" || request.status === "expired") {
    return (
      <div className="min-h-screen bg-background">
        <GCTopBar />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Request {request.status === "cancelled" ? "Cancelled" : "Expired"}</h1>
          <p className="text-muted-foreground">This signing request is no longer active. Please contact the sender.</p>
        </div>
      </div>
    );
  }

  const handleSign = async () => {
    if (!signatureData) { toast.error("Please provide a signature"); return; }
    setLoading(true);
    try {
      await submitSignature({ token: token!, signatureData });
      setDone("signed");
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to submit signature";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await declineSignature({ token: token!, reason: declineReason || undefined });
      setDone("declined");
    } catch {
      toast.error("Failed to decline");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <GCTopBar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Logo className="h-8" />
        </div>

        <div className="bg-muted/40 border rounded-xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">{request.title}</h1>
              {request.message && <p className="text-sm text-muted-foreground mt-1 italic">"{request.message}"</p>}
            </div>
            <Badge variant="outline">Signature Required</Badge>
          </div>
          <div className="mt-3 pt-3 border-t text-sm space-y-1">
            <p>You are signing as: <strong>{signer.name}</strong> ({signer.email}){signer.role ? ` · ${signer.role}` : ""}</p>
            {request.expiresAt && (
              <p className="text-muted-foreground">Expires: {format(new Date(request.expiresAt), "MMMM d, yyyy")}</p>
            )}
          </div>
        </div>

        {!declineMode ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Your Signature</Label>
              <Tabs value={sigMethod} onValueChange={(v) => { setSigMethod(v as "draw" | "type"); setSignatureData(""); }}>
                <TabsList>
                  <TabsTrigger value="draw" className="gap-1"><PenLine className="h-3.5 w-3.5" /> Draw</TabsTrigger>
                  <TabsTrigger value="type" className="gap-1"><Type className="h-3.5 w-3.5" /> Type</TabsTrigger>
                </TabsList>
                <TabsContent value="draw" className="mt-3">
                  <SignatureCanvas onCapture={setSignatureData} />
                </TabsContent>
                <TabsContent value="type" className="mt-3">
                  <TypedSignature name={signer.name} onCapture={setSignatureData} />
                </TabsContent>
              </Tabs>
            </div>

            {/* Legal notice */}
            <div className="text-xs text-muted-foreground border rounded-lg p-3 bg-muted/30 leading-relaxed">
              By clicking <strong>"Sign Document"</strong>, you agree that your electronic signature is the legal equivalent of your manual signature on this document. You consent to be legally bound by this signature. Your IP address and timestamp will be recorded as part of the audit trail.
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 gap-2"
                onClick={handleSign}
                disabled={loading || !signatureData}
              >
                <PenLine className="h-4 w-4" />
                {loading ? "Submitting…" : "Sign Document"}
              </Button>
              <Button variant="ghost" className="text-muted-foreground" onClick={() => setDeclineMode(true)}>
                Decline to sign
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 border rounded-xl p-5 bg-destructive/5">
            <h2 className="font-semibold text-destructive flex items-center gap-2"><X className="h-4 w-4" /> Decline to Sign</h2>
            <p className="text-sm text-muted-foreground">If you decline, the sender will be notified and this signing request will be cancelled.</p>
            <div className="space-y-1">
              <Label htmlFor="decline-reason">Reason (optional)</Label>
              <Textarea id="decline-reason" placeholder="Please explain why you are declining…" value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-3">
              <Button variant="destructive" onClick={handleDecline} disabled={loading}>{loading ? "Processing…" : "Confirm Decline"}</Button>
              <Button variant="ghost" onClick={() => setDeclineMode(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
