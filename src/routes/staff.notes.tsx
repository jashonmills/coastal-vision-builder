import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addStaffNote, listMyNotes } from "@/lib/notes.functions";
import { listMyJobs } from "@/lib/jobs.functions";

export const Route = createFileRoute("/staff/notes")({
  head: () => ({ meta: [{ title: "Notes | Crew" }, { name: "robots", content: "noindex" }] }),
  component: NotesPage,
});

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function NotesPage() {
  const qc = useQueryClient();
  const addFn = useServerFn(addStaffNote);
  const listFn = useServerFn(listMyNotes);
  const jobsFn = useServerFn(listMyJobs);

  const [body, setBody] = useState("");
  const [jobId, setJobId] = useState<string>("");

  const jobsQ = useQuery({
    queryKey: ["my-jobs", "notes-picker"],
    queryFn: () => {
      const s = new Date(); s.setDate(s.getDate() - 30);
      const e = new Date(); e.setDate(e.getDate() + 60);
      return jobsFn({ data: { start_date: s.toISOString(), end_date: e.toISOString() } as never });
    },
  });
  const listQ = useQuery({ queryKey: ["my-notes"], queryFn: () => listFn() });

  const submit = useMutation({
    mutationFn: () => addFn({ data: { body, job_id: jobId || null } as never }),
    onSuccess: () => {
      toast.success("Note saved");
      setBody(""); setJobId("");
      qc.invalidateQueries({ queryKey: ["my-notes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const jobs = ((jobsQ.data ?? []) as Array<{ job: { id: string; title: string | null; event_date: string | null } }>);

  return (
    <div className="space-y-6">
      <header>
        <Link to="/staff/more" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> More
        </Link>
        <h1 className="mt-1 text-2xl font-serif text-primary sm:text-3xl">Notes</h1>
        <p className="text-sm text-muted-foreground">Leave a note for yourself, admins, or the next crew.</p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Add note</h2>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attach to job (optional)</span>
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="mt-1 h-12 w-full rounded-md border border-border bg-background px-3 text-base"
          >
            <option value="">— No job —</option>
            {jobs.map((j) => (
              <option key={j.job.id} value={j.job.id}>
                {j.job.title ?? "Job"}{j.job.event_date ? ` · ${j.job.event_date}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Note</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-border bg-background p-3 text-sm"
            placeholder="What happened, what should the next person know?"
          />
        </label>
        <button
          onClick={() => submit.mutate()}
          disabled={submit.isPending || !body.trim()}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save note
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">My notes</h2>
        {listQ.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (listQ.data ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {(listQ.data ?? []).map((n: any) => (
              <li key={n.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <p className="text-xs text-muted-foreground">
                  {fmtDT(n.created_at)}
                  {n.jobs?.title ? <> · Job: <span className="font-semibold text-foreground">{n.jobs.title}</span></> : null}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
