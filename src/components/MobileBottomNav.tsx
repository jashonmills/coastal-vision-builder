import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Tent,
  Send,
  Sparkles,
  Menu,
  LayoutDashboard,
  FileText,
  Inbox,
  Calendar,
  FilePlus,
  User as UserIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";

interface Props {
  onMenu: () => void;
}

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
  highlight?: boolean;
};

type NavSet = {
  left: [NavItem, NavItem];
  right: [NavItem, NavItem];
  center: { to: string; label: string; icon: LucideIcon; ariaLabel: string };
};

export function MobileBottomNav({ onMenu }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const publicSet: NavSet = {
    left: [
      { to: "/", label: t("nav.home", { defaultValue: "Home" }), icon: Home, exact: true },
      {
        to: user ? "/account" : "/login",
        label: user ? "Account" : "Sign In",
        icon: UserIcon,
        exact: false,
      },
    ],
    center: {
      to: "/contact",
      label: t("nav.quote", { defaultValue: "Quote" }),
      icon: Send,
      ariaLabel: "Request a quote",
    },
    right: [
      {
        to: "/ai-tent-planner",
        label: t("nav.plannerShort", { defaultValue: "Planner" }),
        icon: Sparkles,
        exact: false,
        highlight: true,
      },
    ] as unknown as [NavItem, NavItem],
  };
  // pad right to 2 with a placeholder slot handled below
  const publicRight: NavItem[] = [publicSet.right[0]];

  const adminSet: NavSet = {
    left: [
      { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: false },
      { to: "/admin/quotes", label: "Quotes", icon: FileText, exact: false },
    ],
    center: {
      to: "/admin/quote-requests",
      label: "Requests",
      icon: Inbox,
      ariaLabel: "Quote requests",
    },
    right: [
      { to: "/admin/scheduler", label: "Schedule", icon: Calendar, exact: false },
    ] as unknown as [NavItem, NavItem],
  };
  const adminRight: NavItem[] = [adminSet.right[0]];

  const accountSet: NavSet = {
    left: [
      { to: "/", label: t("nav.home", { defaultValue: "Home" }), icon: Home, exact: true },
      { to: "/account", label: "My Quotes", icon: UserIcon, exact: false },
    ],
    center: {
      to: "/contact",
      label: "New Quote",
      icon: FilePlus,
      ariaLabel: "Start a new quote",
    },
    right: [
      {
        to: "/tent-rentals",
        label: t("nav.rentals", { defaultValue: "Rentals" }),
        icon: Tent,
        exact: false,
      },
    ] as unknown as [NavItem, NavItem],
  };
  const accountRight: NavItem[] = [accountSet.right[0]];

  let set: NavSet;
  let rightItems: NavItem[];
  const inAdmin = pathname.startsWith("/admin");

  if (inAdmin) {
    set = adminSet;
    rightItems = adminRight;
  } else if (user && !isAdmin) {
    set = accountSet;
    rightItems = accountRight;
  } else {
    set = publicSet;
    rightItems = publicRight;
  }

  // Always expose the Menu button so the bento drawer (with full public + admin
  // navigation) is reachable from every screen. Admins can still jump to the
  // admin area via the drawer or the header shield.
  void isAdmin;

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.to, item.exact);
    return (
      <Link
        key={item.to}
        to={item.to}
        className={`flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <span
          className={item.highlight ? "text-[color:var(--gold)]" : ""}
          style={
            item.highlight ? { animation: "ai-sparkle-pulse 2s ease-in-out infinite" } : undefined
          }
        >
          <Icon className="h-5 w-5" />
        </span>
        <span>{item.label}</span>
      </Link>
    );
  };

  const CenterIcon = set.center.icon;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-[color:var(--sand)] shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)] rounded-t-2xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-2xl grid-cols-5 items-end px-2 py-2">
        {set.left.map(renderItem)}

        <Link
          to={set.center.to}
          className="-mt-6 mx-auto flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full bg-primary text-[color:var(--sand)] shadow-lg ring-2 ring-[color:var(--gold)]/70 ring-offset-2 ring-offset-[color:var(--sand)]"
          aria-label={set.center.ariaLabel}
        >
          <CenterIcon className="h-5 w-5" />
          <span className="text-[9px] font-semibold uppercase tracking-wide">
            {set.center.label}
          </span>
        </Link>

        {rightItems.map(renderItem)}

        <button
          type="button"
          onClick={onMenu}
          className="flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span>{t("nav.menu", { defaultValue: "Menu" })}</span>
        </button>
      </div>
    </div>
  );
}
