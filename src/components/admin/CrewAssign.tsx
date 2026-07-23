import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { listStaff, ALLOWED_STAFF_ROLES, type StaffRole } from "@/lib/staff.functions";
import {
  assignStaffToEvent,
  unassignStaffFromEvent,
  listEventStaff,
} from "@/lib/assignments.functions";

type Assignment = {
  id: string;
  role: string | null;
  staff: { id: string; name: string; color: string | null; roles?: string[] | null } | null;
};

export function CrewAssign({ eventId, compact = false }: { eventId: string; compact?: boolean }) {
  const qc = useQueryClient();
  const listAssignedFn = useServerFn(listEventStaff);
  const listStaffFn = useServerFn(listStaff);
  const assignFn = useServerFn(assignStaffToEvent);
  const unassignFn = useServerFn(unassignStaffFromEvent);

  const key = ["event-staff", eventId];
  const staffKey = ["admin-staff"];

  const { data: assigned = [], isLoading: al } = useQuery({
    queryKey: key,
    queryFn: async () => (await listAssignedFn({ data: { event_id: eventId } })) as Assignment[],
  });

  const { data: staffList = [], isLoading: sl } = useQuery({
    queryKey: staffKey,
    queryFn: () => listStaffFn(),
    staleTime: 60_000,
  });

  const [pickStaff, setPickStaff] = useState("");
  const [pickRole, setPickRole] = useState<StaffRole | "">("");
  const [search, setSearch] = useState("");

  const assignedIds = useMemo(() => new Set(assigned.map((a) => a.staff?.id).filter(Boolean) as string[]), [assigned]);
  const options = useMemo(() => {
    return (staffList as Array<{ id: string; name: string; active: boolean; color?: string | null; roles?: string[] | null }>)
      .filter((s) => s.active && !assignedIds.has(s.id))
      .filter((s) => !search.trim() || s.name.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [staffList, assignedIds, search]);

  const assign = useMutation({
    mutationFn: (v: { staff_id: string; role: StaffRole | null }) =>
      assignFn({ data: { event_id: eventId, staff_id: v.staff_id, role: v.role } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["event-staff-bulk"] });
      setPickStaff("");
      setPickRole("");
      setSearch("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unassign = useMutation({
    mutationFn: (id: string) => unassignFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["event-staff-bulk"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex flex-wrap items-center gap-1.5">
        {al ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : assigned.length === 0 ? (
          <span className="text-xs text-muted-foreground">No crew assigned yet.</span>
        ) : (
          assigned.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-xs"
              title={a.staff?.name}
            >
              <span
                className="h-2.5 w-2.5 flex-none rounded-full"
                style={{ background: a.staff?.color ?? "#94a3b8" }}
              />
              <span className="font-medium">{a.staff?.name ?? "—"}</span>
              {a.role && <span className="text-muted-foreground">· {a.role}</span>}
              <button
                type="button"
                onClick={() => unassign.mutate(a.id)}
                disabled={unassign.isPending}
                className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>

      <div className="grid gap-2 rounded-lg border border-dashed border-border bg-secondary/30 p-2 sm:grid-cols-[1fr_140px_auto]">
        <div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff…"
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
          />
          <select
            value={pickStaff}
            onChange={(e) => setPickStaff(e.target.value)}
            size={compact ? 3 : 4}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs"
          >
            {sl && <option value="">Loading…</option>}
            {!sl && options.length === 0 && <option value="">No matching staff</option>}
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.roles && s.roles.length ? ` — ${s.roles.join(", ")}` : ""}
              </option>
            ))}
          </select>
        </div>
        <select
          value={pickRole}
          onChange={(e) => setPickRole(e.target.value as StaffRole | "")}
          className="rounded border border-border bg-background px-2 py-1 text-xs"
        >
          <option value="">Role (optional)</option>
          {ALLOWED_STAFF_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() =>
            assign.mutate({ staff_id: pickStaff, role: (pickRole || null) as StaffRole | null })
          }
          disabled={!pickStaff || assign.isPending}
          className="inline-flex items-center justify-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          {assign.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Add
        </button>
      </div>
    </div>
  );
}

/** Compact color-dot row for calendars/lists. */
export function StaffDots({
  entries,
  max = 4,
}: {
  entries: Array<{ staff_id: string; name: string; color: string | null }>;
  max?: number;
}) {
  if (!entries || entries.length === 0) return null;
  const shown = entries.slice(0, max);
  const extra = entries.length - shown.length;
  return (
    <div className="flex items-center gap-0.5" title={entries.map((e) => e.name).join(", ")}>
      {shown.map((e) => (
        <span
          key={e.staff_id}
          className="h-2 w-2 rounded-full ring-1 ring-white/70"
          style={{ background: e.color ?? "#94a3b8" }}
        />
      ))}
      {extra > 0 && <span className="ml-0.5 text-[9px] font-medium text-muted-foreground">+{extra}</span>}
    </div>
  );
}
