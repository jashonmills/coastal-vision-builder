import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import { listJobNotes } from "@/lib/notes.functions";

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function JobNotesList({ jobId }: { jobId: string }) {
  const fn = useServerFn(listJobNotes);
  const q = useQuery({
    queryKey: ["job-notes", jobId],
    queryFn: () => fn({ data: { job_id: jobId } as never }),
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <FileText className="h-3.5 w-3.5" /> Crew notes
      </div>
      {q.isLoading ? (
        <div className="py-4 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-primary" /></div>
      ) : (q.data ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card/60 p-3 text-xs text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {(q.data ?? []).map((n: any) => (
            <li key={n.id} className="rounded-lg border border-border bg-background p-3 text-sm">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">{n.staff?.name ?? "Crew"}</span> · {fmtDT(n.created_at)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-foreground">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
