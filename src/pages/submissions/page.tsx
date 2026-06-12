/**
 * MySubmissionsPage — Authenticated user's submission history.
 * Route: /submissions (inside app shell)
 */
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useNavigate } from "react-router-dom";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { format } from "date-fns";
import {
  CheckCircle2, Clock, XCircle, AlertCircle, RotateCcw, Search,
  FileText, ExternalLink,
} from "lucide-react";

const STATUS_META: Record<string, { label: string; badgeClass: string; icon: React.ElementType }> = {
  submitted:    { label: "Submitted",     badgeClass: "bg-blue-100 text-blue-800 border-blue-200",     icon: Clock },
  under_review: { label: "Under Review",  badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Search },
  approved:     { label: "Approved",      badgeClass: "bg-green-100 text-green-800 border-green-200",  icon: CheckCircle2 },
  rejected:     { label: "Rejected",      badgeClass: "bg-red-100 text-red-800 border-red-200",        icon: XCircle },
  returned:     { label: "Returned",      badgeClass: "bg-orange-100 text-orange-800 border-orange-200", icon: RotateCcw },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.submitted;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${m.badgeClass}`}>
      <Icon className="size-3" />
      {m.label}
    </span>
  );
}

type Submission = {
  _id: Id<"submissions">;
  formId: Id<"forms">;
  formName: string;
  referenceNumber: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
};

function SubmissionRow({ sub }: { sub: Submission }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-4 hover:border-primary/30 transition-all hover:shadow-sm">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <FileText className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{sub.formName}</span>
          <StatusBadge status={sub.status} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span className="font-mono">{sub.referenceNumber}</span>
          <span>·</span>
          <span>Submitted {format(new Date(sub.submittedAt), "MMM d, yyyy")}</span>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="shrink-0"
        onClick={() => navigate(`/track?ref=${sub.referenceNumber}`)}
      >
        <ExternalLink className="size-3.5 mr-1.5" />
        Track
      </Button>
    </div>
  );
}

function MySubmissionsInner() {
  const subs = useQuery(api.submissions.listMySubmissions, {});
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              My Submissions
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {subs ? `${subs.length} submission${subs.length !== 1 ? "s" : ""}` : "Loading…"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/track")}>
            <Search className="size-4 mr-1.5" /> Track by Reference
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!subs ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
            ))}
          </div>
        ) : subs.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><FileText /></EmptyMedia>
              <EmptyTitle>No submissions yet</EmptyTitle>
              <EmptyDescription>Forms you submit will appear here for easy status tracking</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            {subs.map((sub) => (
              <SubmissionRow key={sub._id} sub={sub} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MySubmissionsPage() {
  return (
    <>
      <AuthLoading>
        <div className="p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <p className="text-muted-foreground">Please sign in to view your submissions.</p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <MySubmissionsInner />
      </Authenticated>
    </>
  );
}
