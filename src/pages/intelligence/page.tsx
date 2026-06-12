/**
 * AI Process Intelligence dashboard.
 * Bottleneck detection, trend analysis, sentiment, predictive SLA alerts,
 * next-best-action suggestions, and process conformance checking.
 */
import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useTenant } from "@/contexts/tenant-context.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";
import {
  Brain, AlertTriangle, TrendingUp, MessageSquare, ShieldCheck,
  Zap, RefreshCw, ChevronRight, Clock, CheckCircle2, XCircle,
  Lightbulb, BarChart3, ArrowRight, Sparkles,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.js";

// ─── Shared types ─────────────────────────────────────────────────────────────

type Bottleneck = { stage: string; avgHours: number; count: number; severity: "low" | "medium" | "high" };
type SentimentResult = { id: string; label: string; sentiment: "positive" | "neutral" | "negative"; score: number; keyThemes: string[]; summary: string };
type AtRiskItem = { referenceNumber: string; submissionId: string; formName: string; hoursOpen: number; priority: string; riskLevel: "high" | "medium" | "low"; riskReason: string; suggestedAction: string };
type ConformanceFinding = { type: "violation" | "deviation" | "good_practice"; description: string; impact: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SeverityBadge({ level }: { level: "high" | "medium" | "low" }) {
  return (
    <Badge variant={level === "high" ? "destructive" : level === "medium" ? "secondary" : "outline"} className="capitalize text-xs">
      {level}
    </Badge>
  );
}

function SentimentIcon({ s }: { s: "positive" | "neutral" | "negative" }) {
  if (s === "positive") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (s === "negative") return <XCircle className="h-4 w-4 text-red-500" />;
  return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />;
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
  const bg = score >= 75 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`text-4xl font-black ${color}`}>{score}<span className="text-lg font-normal">/100</span></div>
      <div className="w-full max-w-[200px] h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${bg} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Bottleneck Tab ───────────────────────────────────────────────────────────

function BottleneckTab({ tenantId }: { tenantId: Id<"tenants"> }) {
  const analyze = useAction(api.intelligence.analyzeBottlenecks);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ bottlenecks: Bottleneck[]; summary: string; recommendations: string[] } | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const r = await analyze({ tenantId });
      setResult(r);
    } catch {
      toast.error("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Bottleneck Detection
          </CardTitle>
          <CardDescription>AI analyzes your submission pipeline to identify where work gets stuck</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={run} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Analyzing pipeline…" : "Run Analysis"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Summary */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4 px-5 flex items-start gap-3">
              <Brain className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </CardContent>
          </Card>

          {/* Bottlenecks */}
          {result.bottlenecks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Identified Bottlenecks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.bottlenecks.map((b, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/40">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background border flex items-center justify-center text-xs font-bold">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{b.stage}</p>
                      <p className="text-xs text-muted-foreground">{b.count} items · avg {b.avgHours}h</p>
                    </div>
                    <div className="hidden sm:block w-32">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${b.severity === "high" ? "bg-red-500" : b.severity === "medium" ? "bg-yellow-500" : "bg-blue-400"}`}
                          style={{ width: `${Math.min(100, (b.avgHours / 96) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <SeverityBadge level={b.severity} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4 text-yellow-500" /> Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sentiment Tab ────────────────────────────────────────────────────────────

function SentimentTab({ tenantId }: { tenantId: Id<"tenants"> }) {
  const analyze = useAction(api.intelligence.analyzeSentiment);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ results: SentimentResult[]; overallSentiment: string; overallScore: number; topThemes: string[] } | null>(null);
  const [customTexts, setCustomTexts] = useState("Applicant was very cooperative and documents were in order.\nMissing required supporting documents, process was confusing.\nForm instructions were unclear, submitted twice by mistake.");

  const run = async () => {
    const lines = customTexts.split("\n").filter(l => l.trim());
    if (lines.length === 0) { toast.error("Add some texts to analyze"); return; }
    setLoading(true);
    try {
      const texts = lines.map((t, i) => ({ id: String(i), label: `Entry ${i + 1}`, text: t.trim() }));
      const r = await analyze({ tenantId, texts });
      setResult(r);
    } catch {
      toast.error("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sentimentColor = (s: string) => s === "positive" ? "text-green-600" : s === "negative" ? "text-red-600" : "text-yellow-600";

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> NLP Sentiment Analysis
          </CardTitle>
          <CardDescription>Analyze free-text notes, comments, and review remarks for sentiment trends</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="sa-texts">Texts to analyze (one per line)</Label>
            <Textarea
              id="sa-texts"
              rows={5}
              value={customTexts}
              onChange={(e) => setCustomTexts(e.target.value)}
              placeholder="Paste review notes, comments, or any free text here…"
            />
          </div>
          <Button onClick={run} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Analyzing…" : "Analyze Sentiment"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="text-center py-5">
              <CardContent className="space-y-2 py-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Overall Sentiment</p>
                <p className={`text-2xl font-bold capitalize ${sentimentColor(result.overallSentiment)}`}>{result.overallSentiment}</p>
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden mx-auto">
                  <div className={`h-full rounded-full ${result.overallScore >= 75 ? "bg-green-500" : result.overallScore >= 45 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${result.overallScore}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">Score: {result.overallScore}/100</p>
              </CardContent>
            </Card>

            <Card className="py-5">
              <CardContent className="py-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Top Themes</p>
                <div className="flex flex-wrap gap-2">
                  {result.topThemes.length > 0
                    ? result.topThemes.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)
                    : <p className="text-sm text-muted-foreground">No themes detected</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Per-Entry Results</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {result.results.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <SentimentIcon s={r.sentiment} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-muted-foreground">{r.label}</p>
                      <Badge variant="outline" className={`text-xs capitalize ${sentimentColor(r.sentiment)}`}>{r.sentiment}</Badge>
                      <span className="text-xs text-muted-foreground">Score: {r.score}</span>
                    </div>
                    <p className="text-sm">{r.summary}</p>
                    {r.keyThemes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {r.keyThemes.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Predictive SLA Tab ───────────────────────────────────────────────────────

function PredictiveTab({ tenantId }: { tenantId: Id<"tenants"> }) {
  const predict = useAction(api.intelligence.predictSlaBreaches);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ atRisk: AtRiskItem[]; summary: string; totalAtRisk: number } | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const r = await predict({ tenantId });
      setResult(r);
    } catch {
      toast.error("Prediction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" /> Predictive SLA Breach Detection
          </CardTitle>
          <CardDescription>AI scans open submissions and predicts which are at risk of breaching their SLA deadline</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={run} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Scanning submissions…" : "Run Prediction"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card className={`border-${result.totalAtRisk > 0 ? "yellow" : "green"}-500/30 bg-${result.totalAtRisk > 0 ? "yellow" : "green"}-500/5`}>
            <CardContent className="py-4 px-5 flex items-start gap-3">
              {result.totalAtRisk > 0
                ? <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                : <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />}
              <div>
                <p className="font-medium text-sm">{result.totalAtRisk} submission{result.totalAtRisk !== 1 ? "s" : ""} at risk</p>
                <p className="text-sm text-muted-foreground mt-0.5">{result.summary}</p>
              </div>
            </CardContent>
          </Card>

          {result.atRisk.length > 0 && (
            <div className="space-y-3">
              {result.atRisk.map((item, i) => (
                <Card key={i} className={item.riskLevel === "high" ? "border-red-200" : item.riskLevel === "medium" ? "border-yellow-200" : ""}>
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-medium">{item.referenceNumber}</p>
                          <SeverityBadge level={item.riskLevel} />
                          <Badge variant="outline" className="text-xs capitalize">{item.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{item.formName} · Open {item.hoursOpen}h</p>
                      </div>
                      <Clock className={`h-5 w-5 flex-shrink-0 ${item.riskLevel === "high" ? "text-red-500" : "text-yellow-500"}`} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Risk Reason</p>
                        <p>{item.riskReason}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Suggested Action</p>
                        <p className="flex items-start gap-1"><ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />{item.suggestedAction}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Conformance Tab ──────────────────────────────────────────────────────────

function ConformanceTab({ tenantId }: { tenantId: Id<"tenants"> }) {
  const check = useAction(api.intelligence.checkProcessConformance);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ score: number; grade: string; findings: ConformanceFinding[]; summary: string } | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const r = await check({ tenantId });
      setResult(r);
    } catch {
      toast.error("Conformance check failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const findingIcon = (type: string) => {
    if (type === "violation") return <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />;
    if (type === "good_practice") return <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />;
  };

  const gradeColor = (g: string) => ({ A: "text-green-600", B: "text-teal-600", C: "text-yellow-600", D: "text-orange-600", F: "text-red-600" }[g] ?? "text-muted-foreground");

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Process Conformance Check
          </CardTitle>
          <CardDescription>AI audits your process metrics against best practices and flags violations, deviations, and compliance areas</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={run} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Running audit…" : "Run Conformance Check"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardContent className="py-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex flex-col items-center">
                <div className={`text-6xl font-black ${gradeColor(result.grade)}`}>{result.grade}</div>
                <ScoreGauge score={result.score} label="Conformance Score" />
              </div>
              <div className="flex-1">
                <p className="text-sm leading-relaxed text-muted-foreground">{result.summary}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Findings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {result.findings.map((f, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  {findingIcon(f.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant={f.type === "violation" ? "destructive" : f.type === "good_practice" ? "outline" : "secondary"} className="text-xs capitalize">
                        {f.type.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{f.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.impact}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Next-Best-Action Widget ──────────────────────────────────────────────────

function NextActionTab({ tenantId: _tenantId }: { tenantId: Id<"tenants"> }) {
  const suggest = useAction(api.intelligence.suggestNextAction);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ primaryAction: string; primaryActionLabel: string; rationale: string; additionalSuggestions: string[]; riskAssessment: string; estimatedResolutionTime: string } | null>(null);
  const [ref, setRef] = useState("CF-2026-DEMO01");
  const [form, setForm] = useState("Grant Application Form");
  const [status, setStatus] = useState("under_review");
  const [priority, setPriority] = useState("high");
  const [hoursOpen, setHoursOpen] = useState(36);
  const [notes, setNotes] = useState("Applicant has submitted all required documents. Budget section looks reasonable.");

  const run = async () => {
    setLoading(true);
    try {
      // Use a placeholder submission ID for the demo widget
      const r = await suggest({
        submissionId: "demo" as Id<"submissions">,
        referenceNumber: ref,
        formName: form,
        status,
        priority,
        hoursOpen,
        reviewNotes: notes,
      });
      setResult(r);
    } catch {
      toast.error("Failed to generate suggestion. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const actionColor = (a: string) => ({ approve: "text-green-600", reject: "text-red-600", escalate: "text-red-500", return: "text-yellow-600", request_info: "text-blue-600" }[a] ?? "text-primary");

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Next-Best-Action Suggester
          </CardTitle>
          <CardDescription>Enter submission context and AI will recommend the optimal next action for a reviewer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="nba-ref">Reference Number</Label>
              <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" id="nba-ref" value={ref} onChange={(e) => setRef(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nba-form">Form Name</Label>
              <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" id="nba-form" value={form} onChange={(e) => setForm(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nba-status">Status</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" id="nba-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="nba-priority">Priority</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" id="nba-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="nba-hours">Hours Open</Label>
              <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" id="nba-hours" type="number" value={hoursOpen} onChange={(e) => setHoursOpen(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="nba-notes">Review Notes</Label>
            <Textarea id="nba-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any existing review notes…" />
          </div>
          <Button onClick={run} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Generating suggestion…" : "Get AI Recommendation"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" /> AI Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/8 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">Recommended Action</p>
              <p className={`text-2xl font-bold ${actionColor(result.primaryAction)}`}>{result.primaryActionLabel}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Rationale</p>
              <p className="text-sm leading-relaxed">{result.rationale}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Risk Assessment</p>
                <p>{result.riskAssessment}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Estimated Resolution</p>
                <p className="font-medium">{result.estimatedResolutionTime}</p>
              </div>
            </div>
            {result.additionalSuggestions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Additional Suggestions</p>
                <ul className="space-y-1">
                  {result.additionalSuggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm">
                      <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function IntelligenceInner() {
  const { activeTenant } = useTenant();
  const [tab, setTab] = useState("bottleneck");

  if (!activeTenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select a tenant to use AI Process Intelligence.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Process Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Powered by CanFlow.ai — bottleneck detection, sentiment analysis, predictive SLA, and more
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-gradient-to-r from-primary/5 to-purple-500/5 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">AI-powered insights</p>
            <p className="text-muted-foreground">Each analysis calls the Hercules AI Gateway. Results are generated in real-time and not cached — click "Run" on each tab to generate fresh insights for <strong>{activeTenant.name}</strong>.</p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
          <TabsTrigger value="bottleneck" className="gap-1 text-xs sm:text-sm">
            <TrendingUp className="h-3.5 w-3.5" /><span className="hidden sm:inline">Bottlenecks</span><span className="sm:hidden">Bottleneck</span>
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="gap-1 text-xs sm:text-sm">
            <MessageSquare className="h-3.5 w-3.5" />Sentiment
          </TabsTrigger>
          <TabsTrigger value="sla" className="gap-1 text-xs sm:text-sm">
            <AlertTriangle className="h-3.5 w-3.5" /><span className="hidden sm:inline">Predictive SLA</span><span className="sm:hidden">SLA</span>
          </TabsTrigger>
          <TabsTrigger value="conformance" className="gap-1 text-xs sm:text-sm">
            <ShieldCheck className="h-3.5 w-3.5" />Conformance
          </TabsTrigger>
        </TabsList>
        <div className="mt-1 text-center">
          <button
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
            onClick={() => setTab("nextaction")}
            style={{ display: tab === "nextaction" ? "none" : "inline" }}
          >
            Also: Next-Best-Action Suggester →
          </button>
        </div>

        <TabsContent value="bottleneck" className="mt-4">
          <BottleneckTab tenantId={activeTenant._id} />
        </TabsContent>
        <TabsContent value="sentiment" className="mt-4">
          <SentimentTab tenantId={activeTenant._id} />
        </TabsContent>
        <TabsContent value="sla" className="mt-4">
          <PredictiveTab tenantId={activeTenant._id} />
        </TabsContent>
        <TabsContent value="conformance" className="mt-4">
          <ConformanceTab tenantId={activeTenant._id} />
        </TabsContent>
        <TabsContent value="nextaction" className="mt-4">
          <NextActionTab tenantId={activeTenant._id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function IntelligencePage() {
  return (
    <>
      <AuthLoading>
        <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex items-center justify-center h-64 flex-col gap-4">
          <p className="text-muted-foreground">Sign in to use AI Process Intelligence</p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <IntelligenceInner />
      </Authenticated>
    </>
  );
}
