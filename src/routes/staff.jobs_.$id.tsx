import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft, Car, Check, ClipboardList, Clock, Info, KeyRound, Loader2,
  MapPin, Navigation, Phone, Truck, Wine, Wrench, X,
} from "lucide-react";
import { toast } from "sonner";
import { acknowledgeAssignment, getMyJob } from "@/lib/jobs.functions";
import { addStaffNote } from "@/lib/notes.functions";
import { JobNotesList } from "@/components/JobNotesList";
import { StatusPill } from "./staff.index";


export const Route = createFileRoute("/staff/jobs_/$id")({
  component: StaffJobDetail,
});

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function StaffJobDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getMyJob);
  const ackFn = useServerFn(acknowledgeAssignment);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-job", id],
    queryFn: () => getFn({ data: { id } as never }),
  });

  const ack = useMutation({
    mutationFn: (input: { assignment_id: string; ack_status: "accepted" | "declined"; reason?: string }) =>
      ackFn({
        data: {
          event_staff_id: input.assignment_id,
          ack_status: input.ack_status,
          decline_reason: input.reason ?? null,
        } as never,
      }),
    onSuccess: () => {
      toast.success("Response saved");
      qc.invalidateQueries({ queryKey: ["my-job", id] });
      qc.invalidateQueries({ queryKey: ["my-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (error || !data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Job not found or not assigned to you.</p>
        <Link to="/staff/jobs" className="mt-4 inline-block text-primary underline">Back to My Jobs</Link>
      </div>
    );
  }

  const { job, assignments } = data as unknown as {
    job: {
      id: string; title: string | null; event_date: string | null; status: string;
      site_address: string | null; site_contact_name: string | null; site_contact_phone: string | null;
      gate_code: string | null; parking_notes: string | null; access_notes: string | null; notes: string | null;
    };
    assignments: Array<{
      id: string; role: string | null; ack_status: string;
      event: { id: string; title: string | null; start_time: string | null; end_time: string | null; event_type: string | null; location: string | null } | null;
    }>;
  };

  const roles = Array.from(new Set(assignments.map((a) => (a.role ?? "").trim()).filter(Boolean)));
  const currentAck = assignments[0]?.ack_status ?? "assigned";
  const mapsUrl = job.site_address ? `https://maps.google.com/?q=${encodeURIComponent(job.site_address)}` : null;
  const telUrl = job.site_contact_phone ? `tel:${job.site_contact_phone.replace(/[^\d+]/g, "")}` : null;

  const respondAll = async (status: "accepted" | "declined", reason?: string) => {
    for (const a of assignments) {
      await ack.mutateAsync({ assignment_id: a.id, ack_status: status, reason });
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/staff/jobs" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> My Jobs
      </Link>

      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-serif text-primary sm:text-2xl">{job.title ?? "Job"}</h1>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
            {job.event_date ? new Date(job.event_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "No date"}
          </p>
        </div>
        <StatusPill status={job.status} />
      </header>

      {/* Events / times */}
      {assignments.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your schedule</h2>
          <ul className="space-y-2 text-sm">
            {assignments.map((a) => (
              <li key={a.id} className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {a.event?.title ?? a.event?.event_type ?? "Shift"}
                    {a.role && <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-primary">· {a.role}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.event?.start_time ? fmtTime(a.event.start_time) : "—"}
                    {a.event?.end_time ? ` – ${fmtTime(a.event.end_time)}` : ""}
                    {a.event?.location ? ` · ${a.event.location}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Site block */}
      <section className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Site logistics</h2>
        {job.site_address && (
          <Row icon={MapPin} label="Address">
            <span className="break-words">{job.site_address}</span>
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer"
                className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <Navigation className="h-3.5 w-3.5" /> Directions
              </a>
            )}
          </Row>
        )}
        {job.site_contact_name && <Row icon={Info} label="Contact">{job.site_contact_name}</Row>}
        {telUrl && (
          <Row icon={Phone} label="Phone">
            <a href={telUrl} className="font-semibold text-primary underline-offset-2 hover:underline">{job.site_contact_phone}</a>
          </Row>
        )}
        {job.gate_code && (
          <Row icon={KeyRound} label="Gate code">
            <code className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">{job.gate_code}</code>
          </Row>
        )}
        {job.parking_notes && <Row icon={Car} label="Parking"><span className="whitespace-pre-wrap">{job.parking_notes}</span></Row>}
        {job.access_notes && <Row icon={Info} label="Access"><span className="whitespace-pre-wrap">{job.access_notes}</span></Row>}
        {job.notes && <Row icon={Info} label="Notes"><span className="whitespace-pre-wrap">{job.notes}</span></Row>}
      </section>

      {/* Accept / Decline */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        {roles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <span key={r} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-primary">{r}</span>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => respondAll("accepted")}
            disabled={ack.isPending || currentAck === "accepted"}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition ${
              currentAck === "accepted" ? "bg-emerald-600 text-white" : "border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            } disabled:opacity-60`}
          >
            <Check className="h-4 w-4" /> {currentAck === "accepted" ? "Accepted" : "Accept"}
          </button>
          <button
            onClick={() => setDeclineOpen((v) => !v)}
            disabled={ack.isPending}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition ${
              currentAck === "declined" ? "bg-rose-600 text-white" : "border border-rose-600 text-rose-700 hover:bg-rose-50"
            } disabled:opacity-60`}
          >
            <X className="h-4 w-4" /> {currentAck === "declined" ? "Declined" : "Decline"}
          </button>
        </div>
        {declineOpen && (
          <div className="mt-2 space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason (optional)</label>
            <textarea rows={2} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeclineOpen(false)} className="rounded-full border border-border px-3 py-1.5 text-xs">Cancel</button>
              <button
                onClick={async () => { await respondAll("declined", declineReason || undefined); setDeclineOpen(false); setDeclineReason(""); }}
                className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
              >Confirm decline</button>
            </div>
          </div>
        )}
      </section>

      {/* Crew notes on this job */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <AddJobNote jobId={job.id} />
        <div className="mt-4">
          <JobNotesList jobId={job.id} />
        </div>
      </section>

      {/* Pull list — available to everyone on the job */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next actions</h2>
        <Link
          to="/staff/jobs/$id/pull"
          params={{ id: job.id }}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <ClipboardList className="h-5 w-5" /> Open pull list
        </Link>
        {roles.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {roles
              .map((r) => actionForRole(r))
              .filter((cfg): cfg is { label: string; icon: typeof ClipboardList } => !!cfg && cfg.label !== "Pull list")
              .map((cfg) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={cfg.label}
                    disabled
                    title="Coming soon"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/60 text-xs font-semibold text-muted-foreground"
                  >
                    <Icon className="h-4 w-4" /> {cfg.label}
                    <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] uppercase tracking-wider">Soon</span>
                  </button>
                );
              })}
          </div>
        )}
      </section>

    </div>
  );
}

function AddJobNote({ jobId }: { jobId: string }) {
  const qc = useQueryClient();
  const addFn = useServerFn(addStaffNote);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const mut = useMutation({
    mutationFn: () => addFn({ data: { job_id: jobId, body } as never }),
    onSuccess: () => {
      toast.success("Note added");
      setBody(""); setOpen(false);
      qc.invalidateQueries({ queryKey: ["job-notes", jobId] });
      qc.invalidateQueries({ queryKey: ["my-notes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold text-primary hover:bg-secondary"
      >
        + Add note
      </button>
    );
  }
  return (
    <div className="space-y-2">
      <textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What should the team or admin know?"
        className="w-full rounded-md border border-border bg-background p-3 text-sm"
      />
      <div className="flex justify-end gap-2">
        <button onClick={() => { setOpen(false); setBody(""); }} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">Cancel</button>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !body.trim()}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {mut.isPending ? "Saving…" : "Save note"}
        </button>
      </div>
    </div>
  );
}


function actionForRole(role: string): { label: string; icon: typeof ClipboardList } | null {
  const r = role.toLowerCase();
  if (r === "assembler" || r === "puller" || r === "setup") return { label: "Pull list", icon: ClipboardList };
  if (r === "driver") return { label: "Start trip", icon: Truck };
  if (r === "coordinator") return { label: "Setup checklist", icon: Wrench };
  if (r === "bartender" || r === "server" || r === "chef") return { label: "Shift details", icon: Wine };
  return { label: "Job details", icon: Info };
}

function Row({ icon: Icon, label, children }: { icon: typeof Info; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-label={label} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
