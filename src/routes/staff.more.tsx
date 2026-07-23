import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, DollarSign, FileText, LogOut, Mail, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsStaff } from "@/hooks/use-staff";

export const Route = createFileRoute("/staff/more")({
  component: MorePage,
});

function MorePage() {
  const { user } = useAuth();
  const { staff } = useIsStaff();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const signOut = async () => {
    try {
      await qc.cancelQueries(); qc.clear();
      await supabase.auth.signOut();
      navigate({ to: "/login", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign out failed");
    }
  };

  const roles = (staff?.roles as string[] | null) ?? (staff?.role ? [staff.role] : []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Crew</p>
        <h1 className="mt-1 text-2xl font-serif text-primary sm:text-3xl">More</h1>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">{staff?.name ?? user?.email ?? "Crew"}</p>
            {roles.length > 0 && (
              <p className="mt-0.5 flex flex-wrap gap-1">
                {roles.map((r) => (
                  <span key={r} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-primary">{r}</span>
                ))}
              </p>
            )}
          </div>
        </div>
        <ul className="mt-4 space-y-1.5 text-sm">
          {staff?.email && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" /> <span className="truncate">{staff.email}</span>
            </li>
          )}
          {staff?.phone && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" /> <span>{staff.phone}</span>
            </li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tools</h2>
        <ul className="space-y-2">
          <SoonRow icon={Clock} label="Clock in / out" desc="Track hours for each job" />
          <SoonRow icon={DollarSign} label="Expenses" desc="Submit reimbursements with photos" />
          <SoonRow icon={FileText} label="Notes & handoffs" desc="Leave notes for the next crew" />
        </ul>
      </section>

      <button
        onClick={signOut}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-rose-300 bg-white text-sm font-semibold text-rose-700 hover:bg-rose-50"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}

function SoonRow({ icon: Icon, label, desc }: { icon: typeof Clock; label: string; desc: string }) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-dashed border-border bg-card/60 p-3">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{desc}</p>
      </div>
      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Soon</span>
    </li>
  );
}
