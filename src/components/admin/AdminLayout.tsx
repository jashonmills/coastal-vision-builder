import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Inbox,
  FileText,
  CalendarDays,
  Truck,
  Boxes,
  Tag,
  FileSpreadsheet,
  FolderOpen,
  Users,
  UserSquare2,
  ShieldCheck,
  Clock,
  Menu,
  ExternalLink,
  LogOut,
  Loader2,
} from "lucide-react";
import logoUrl from "@/assets/logo.png";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AdminBell } from "@/components/AdminBell";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { useSlotImage } from "@/hooks/use-site-content";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { to: string; label: string; icon: typeof Inbox };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/quote-requests", label: "Quote Requests", icon: Inbox },
      { to: "/admin/quotes", label: "Quotes", icon: FileText },
      { to: "/admin/customers", label: "Customers", icon: UserSquare2 },
      { to: "/admin/scheduler", label: "Scheduler", icon: CalendarDays },
      { to: "/admin/jobs", label: "Jobs", icon: Truck },
      { to: "/admin/inventory", label: "Inventory", icon: Boxes },
    ],
  },
  {
    label: "Catalog & Pricing",
    items: [{ to: "/admin/pricing", label: "Pricing", icon: Tag }],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/content", label: "Site Content", icon: FolderOpen },
      { to: "/admin/data-import", label: "Data Import", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Team",
    items: [
      { to: "/admin/staff", label: "Staff", icon: Users },
      { to: "/admin/timesheets", label: "Timesheets", icon: Clock },
      { to: "/admin/expenses", label: "Expenses", icon: DollarSign },
      { to: "/admin/admins", label: "Admins", icon: ShieldCheck },

    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function isItemActive(itemTo: string, pathname: string): boolean {
  return pathname === itemTo || pathname.startsWith(itemTo + "/");
}

function currentTitle(pathname: string): string {
  const match = ALL_ITEMS.find((i) => isItemActive(i.to, pathname));
  if (match) return match.label;
  if (pathname.startsWith("/admin/quotes")) return "Quotes";
  if (pathname.startsWith("/admin/quote-requests")) return "Quote Requests";
  if (pathname.startsWith("/admin/inventory")) return "Inventory";
  if (pathname.startsWith("/admin/content") || pathname.startsWith("/admin/site-images")) return "Site Content";
  return "Admin";
}

function NavBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Admin sections">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/50">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isItemActive(item.to, pathname);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to as never}
                    onClick={onNavigate}
                    className={`group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-[color:var(--gold)]/15 font-semibold text-[color:var(--gold)]"
                        : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4 flex-none" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarBrand() {
  const logo = useSlotImage("site.logo", logoUrl);
  return (
    <Link to="/admin/dashboard" className="flex items-center gap-2.5 border-b border-primary-foreground/10 px-5 py-4">
      <img src={logo} alt="" className="h-9 w-9 rounded bg-primary-foreground/10 object-contain p-1" />
      <div className="min-w-0">
        <p className="truncate font-serif text-sm font-bold text-primary-foreground">Pacific North</p>
        <p className="truncate text-[10px] uppercase tracking-wider text-[color:var(--gold)]">Admin Console</p>
      </div>
    </Link>
  );
}

function AccountControl() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }
  return (
    <div className="flex items-center gap-2">
      <div className="hidden text-right sm:block">
        <p className="max-w-[160px] truncate text-xs font-medium text-foreground">{user?.email ?? ""}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin</p>
      </div>
      <button
        onClick={signOut}
        disabled={busy}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60"
        aria-label="Sign out"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login", search: { next: pathname } as never });
    }
  }, [authLoading, user, navigate, pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const title = currentTitle(pathname);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-primary text-primary-foreground shadow-xl lg:flex"
        aria-label="Admin navigation"
      >
        <SidebarBrand />
        <NavBody pathname={pathname} />
        <div className="border-t border-primary-foreground/10 px-5 py-3 text-[10px] text-primary-foreground/50">
          © Pacific North Events & Tents
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-0 bg-primary p-0 text-primary-foreground">
          <SheetHeader className="sr-only">
            <SheetTitle>Admin navigation</SheetTitle>
          </SheetHeader>
          <SidebarBrand />
          <NavBody pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-8 print:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-secondary lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <h1 className="min-w-0 flex-1 truncate font-serif text-lg font-semibold text-foreground">{title}</h1>
          <Link
            to="/"
            className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary sm:inline-flex"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View site
          </Link>
          {isAdmin && <AdminBell />}
          <AccountControl />
        </header>

        <main className="flex-1">
          {authLoading || roleLoading ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !user ? null : (
            <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
          )}
        </main>
      </div>
    </div>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--gold)]">
            {eyebrow}
          </p>
        )}
        <h2 className="truncate font-serif text-2xl font-bold text-foreground sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

// Compatibility aliases so existing route files that import { SiteLayout, PageHero }
// from this module keep working after a mechanical import-path swap.
export const SiteLayout = AdminLayout;
export const PageHero = AdminPageHeader;
