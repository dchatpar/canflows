/**
 * TrackSubmissionPage — Public status tracker by reference number.
 * Route: /track
 */
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { format } from "date-fns";
import { Search, CheckCircle2, Clock, XCircle, AlertCircle, RotateCcw, FileText, Minus } from "lucide-react";

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  submitted:    { label: "Submitted",     color: "text-blue-600",   icon: Clock },
  under_review: { label: "Under Review",  color: "text-yellow-600", icon: Search },
  approved:     { label: "Approved",      color: "text-green-600",  icon: CheckCircle2 },
  rejected:     { label: "Rejected",      color: "text-red-600",    icon: XCircle },
  returned:     { label: "Returned",      color: "text-orange-600", icon: RotateCcw },
};

export default function TrackSubmissionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState(searchParams.get("ref") ?? "");
  const [queried, setQueried] = useState(searchParams.get("ref") ?? "");

  const result = useQuery(
    api.submissions.getByReference,
    queried ? { referenceNumber: queried.trim().toUpperCase() } : "skip",
  );

  const handleSearch = () => {
    const val = input.trim().toUpperCase();
    setQueried(val);
    setSearchParams(val ? { ref: val } : {});
  };

  const meta = result ? STATUS_META[result.status] : null;
  const Icon = meta?.icon ?? AlertCircle;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* GC Header */}
      <header>
        <div className="bg-[#1C2540] text-white text-xs flex items-center gap-2 px-4 py-1.5">
          <span className="text-[11px]">🇨🇦</span>
          <span>An official website of the Government of Canada</span>
          <div className="ml-auto flex items-center gap-2">
            <Minus className="size-3 opacity-40" />
            <span className="opacity-70 cursor-pointer hover:opacity-100">Français</span>
          </div>
        </div>
        <div className="border-b bg-background px-4 py-3 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded bg-primary text-primary-foreground text-sm font-bold">C</div>
          <span className="font-semibold text-sm">CanFlow.ai</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Track Your Submission</h1>
          <p className="text-muted-foreground">Enter your reference number to check the status of your submission.</p>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 mb-8">
          <Input
            placeholder="e.g. CF-2026-A1B2C3"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="font-mono text-base h-11"
          />
          <Button onClick={handleSearch} className="h-11 px-5">
            <Search className="size-4 mr-2" /> Track
          </Button>
        </div>

        {/* Result */}
        {queried && result === undefined && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        )}

        {queried && result === null && (
          <div className="text-center py-12 rounded-xl border border-border bg-muted/20">
            <AlertCircle className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No submission found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Reference <span className="font-mono">{queried}</span> was not found. Check for typos.
            </p>
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-border bg-background overflow-hidden">
            {/* Status banner */}
            <div className={`px-6 py-4 border-b bg-muted/30 flex items-center gap-3`}>
              <Icon className={`size-6 ${meta?.color}`} />
              <div>
                <p className="font-semibold">{meta?.label}</p>
                <p className="text-xs text-muted-foreground">Last updated {format(new Date(result.updatedAt), "MMM d, yyyy 'at' h:mm a")}</p>
              </div>
            </div>

            {/* Details */}
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Reference Number</p>
                  <p className="font-mono font-bold text-primary">{result.referenceNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Form</p>
                  <p className="font-medium">{result.formName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p>{format(new Date(result.submittedAt), "MMMM d, yyyy 'at' h:mm a")}</p>
                </div>
                {result.contactName && (
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted By</p>
                    <p>{result.contactName}</p>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="border-t pt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Status Timeline</p>
                <div className="space-y-2">
                  {(["submitted", "under_review", "approved"] as const).map((s) => {
                    const statuses = ["submitted", "under_review", "approved", "rejected", "returned"];
                    const currentIdx = statuses.indexOf(result.status);
                    const stepIdx = statuses.indexOf(s);
                    const done = stepIdx <= currentIdx;
                    const StepIcon = STATUS_META[s].icon;
                    return (
                      <div key={s} className={`flex items-center gap-3 text-sm ${done ? "" : "opacity-40"}`}>
                        <StepIcon className={`size-4 shrink-0 ${done ? STATUS_META[s].color : "text-muted-foreground"}`} />
                        <span className={done ? "font-medium" : "text-muted-foreground"}>{STATUS_META[s].label}</span>
                        {s === result.status && (
                          <span className="ml-auto text-xs text-muted-foreground">Current</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
