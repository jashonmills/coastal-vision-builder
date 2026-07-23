import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { CalendarDays, ClipboardList, Clock, Home, LogOut, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import logoUrl from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsStaff } from "@/hooks/use-staff";
import { useIsAdmin } from "@/hooks/use-admin";
import { Loader2 } from "lucide-react";

type Tab = { to: string; label: string; icon: LucideIcon; exact?: boolean };
const TABS: Tab[] = [
  { to: "/staff", label: "Home", icon: Home, exact: true },
  { to: "/staff/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/staff/jobs", label: "Jobs", icon: ClipboardList },
  { to: "/staff/clock", label: "Clock", icon: Clock },
  { to: "/staff/more", label: "More", icon: MoreHorizontal },
];

export function StaffLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading: authLoading } = useAuth();
  const { isStaff, staff, loading: staffLoading } = useIsStaff();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const loading = authLoading || staffLoading || adminLoading;
  const allowed = !!user && (isStaff || isAdmin);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) {
    if (typeof window !== "undefined") {
      navigate({ to: "/login", search: { next: pathname } as never });
    }
    return null;
  }
  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Staff access required</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This area is for crew. Ask an admin to invite your account from the Staff console.
        </p>
        <Link to="/" className="mt-6 text-primary underline">Back to home</Link>
      </div>
    );
  }

  const displayName =
    staff?.name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "there";

  const handleSignOut = async () => {
    try {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      navigate({ to: "/login", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign out failed");
    }
  };

  const isActive = (t: Tab) =>
    t.exact ? pathname === t.to : pathname === t.to || pathname.startsWith(t.to + "/");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/staff" className="flex items-center gap-2">
            <img src={logoUrl} alt="" className="h-8 w-8 rounded-md object-contain" />
            <span className="text-sm font-semibold text-foreground">Crew · {displayName}</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-semibold text-muted-foreground hover:bg-secondary"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 pb-[calc(88px+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:py-6">{children}</div>
      </main>

      {/* Fixed bottom nav (mobile-first, works on desktop too) */}
      <nav
        aria-label="Staff navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-3xl items-stretch justify-between">
          {TABS.map((t) => {
            const active = isActive(t);
            const Icon = t.icon;
            return (
              <li key={t.to} className="flex-1">
                <Link
                  to={t.to}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-6 w-6 ${active ? "" : "opacity-80"}`} />
                  <span>{t.label}</span>
                  {active && <span className="h-0.5 w-8 rounded-full bg-primary" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
