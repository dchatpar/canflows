/**
 * VersionHistory — side sheet showing all saved versions with restore.
 */
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { format } from "date-fns";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

type Props = {
  formId: Id<"forms">;
  currentDraftVersion: number;
  publishedVersion?: number;
  onClose: () => void;
  onRestored: () => void;
};

export default function VersionHistory({
  formId,
  currentDraftVersion,
  publishedVersion,
  onClose,
  onRestored,
}: Props) {
  const versions = useQuery(api.forms.getVersionHistory, { formId });
  const restoreVersion = useMutation(api.forms.restoreVersion);
  const [restoring, setRestoring] = useState<Id<"formVersions"> | null>(null);

  const handleRestore = async (versionId: Id<"formVersions">, versionNumber: number) => {
    if (!confirm(`Restore version ${versionNumber}? This will create a new draft based on that version.`)) return;
    setRestoring(versionId);
    try {
      await restoreVersion({ formId, versionId });
      toast.success(`Restored to version ${versionNumber}`);
      onRestored();
      onClose();
    } catch {
      toast.error("Failed to restore version");
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="flex h-full w-72 flex-col border-l bg-background shadow-lg">
      <div className="flex items-center justify-between border-b px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Version History</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y">
        {!versions ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : versions.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">No versions saved yet.</p>
        ) : (
          versions.map((v) => {
            const isCurrent = v.version === currentDraftVersion;
            const isPublished = v.version === publishedVersion;
            return (
              <div key={v._id} className="flex items-start gap-3 px-3 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium">v{v.version}</span>
                    {isCurrent && <Badge variant="default" className="text-[10px] py-0 px-1.5">Current</Badge>}
                    {isPublished && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Published</Badge>}
                  </div>
                  {v.label && <p className="text-xs text-muted-foreground truncate">{v.label}</p>}
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {format(new Date(v.createdAt), "MMM d, yyyy h:mm a")}
                    {v.createdByName && ` · ${v.createdByName}`}
                  </p>
                </div>
                {!isCurrent && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs shrink-0"
                    disabled={restoring === v._id}
                    onClick={() => handleRestore(v._id, v.version)}
                  >
                    <RotateCcw className="size-3 mr-1" />
                    Restore
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
