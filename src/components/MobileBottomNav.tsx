import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Tent, Send, Sparkles, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  onMenu: () => void;
}

const items = [
  { to: "/", labelKey: "nav.home", icon: Home, exact: true },
  { to: "/tent-rentals", labelKey: "nav.rentals", icon: Tent, exact: false },
  { to: "/ai-tent-planner", labelKey: "nav.plannerShort", icon: Sparkles, exact: false },
] as const;

export function MobileBottomNav({ onMenu }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useTranslation();

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-[color:var(--sand)] shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)] rounded-t-2xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-2xl grid-cols-5 items-end px-2 py-2">
        {items.slice(0, 2).map((item) => {
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
              <Icon className="h-5 w-5" />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}

        {/* Center prominent CTA */}
        <Link
          to="/contact"
          className="-mt-6 mx-auto flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full bg-primary text-[color:var(--sand)] shadow-lg ring-2 ring-[color:var(--gold)]/70 ring-offset-2 ring-offset-[color:var(--sand)]"
          aria-label="Request a quote"
        >
          <Send className="h-5 w-5" />
          <span className="text-[9px] font-semibold uppercase tracking-wide">{t("nav.quote")}</span>
        </Link>

        {items.slice(2).map((item) => {
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
              <span className={item.to === "/ai-tent-planner" ? "text-[color:var(--gold)]" : ""} style={item.to === "/ai-tent-planner" ? { animation: 'ai-sparkle-pulse 2s ease-in-out infinite' } : undefined}>
                <Icon className="h-5 w-5" />
              </span>
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onMenu}
          className="flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span>{t("nav.menu")}</span>
        </button>
      </div>
    </div>
  );
}
