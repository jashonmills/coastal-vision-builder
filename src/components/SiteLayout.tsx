import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, ShieldCheck, User, Facebook } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import logoUrl from "@/assets/logo.png";
import { OpeningVideoSplash } from "./OpeningVideoSplash";
import { AITentPlannerPopup } from "./AITentPlannerPopup";
import { LanguageSelector } from "./LanguageSelector";
import { AccessibilityFontButton } from "./AccessibilityFontButton";
import { ChatWidget } from "./ChatWidget";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { useSlotImage } from "@/hooks/use-site-content";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileBentoDrawer } from "./MobileBentoDrawer";
import { MobileHelpButton } from "./MobileHelpButton";

type NavChild = { to: string; labelKey: string; descKey?: string };
type NavGroup = { labelKey: string; to?: string; children?: NavChild[] };

const navGroups: NavGroup[] = [
  { labelKey: "nav.home", to: "/" },
  {
    labelKey: "nav.rentals",
    children: [
      { to: "/tent-rentals", labelKey: "nav.tentRentals", descKey: "navDesc.tentRentals" },
      { to: "/inventory", labelKey: "nav.inventoryPricing", descKey: "navDesc.inventoryPricing" },
      { to: "/ai-tent-planner", labelKey: "nav.eventRecommender", descKey: "navDesc.eventRecommender" },
    ],
  },
  {
    labelKey: "nav.services",
    children: [
      { to: "/services", labelKey: "nav.allServices", descKey: "navDesc.allServices" },
      { to: "/events", labelKey: "nav.events", descKey: "navDesc.events" },
    ],
  },
  { labelKey: "nav.gallery", to: "/gallery" },
  {
    labelKey: "nav.about",
    children: [
      { to: "/about", labelKey: "nav.aboutUs", descKey: "navDesc.aboutUs" },
      { to: "/contact", labelKey: "nav.contact", descKey: "navDesc.contact" },
    ],
  },
];

function isGroupActive(group: NavGroup, pathname: string): boolean {
  if (group.to) return group.to === "/" ? pathname === "/" : pathname.startsWith(group.to);
  return group.children?.some((c) => pathname.startsWith(c.to)) ?? false;
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const dynamicLogo = useSlotImage("site.logo", logoUrl);
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {pathname === "/" && <OpeningVideoSplash />}
      {pathname === "/" && <AITentPlannerPopup />}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="relative mx-auto flex max-w-7xl items-center justify-center lg:justify-between gap-6 px-4 py-4 lg:px-8">
          <Link to="/" className="flex items-center" aria-label="Pacific North Event & Tent Rentals">
            <img
              src={dynamicLogo}
              alt="Pacific North Event & Tent Rentals"
              className="h-12 w-auto sm:h-14"
            />
          </Link>

          <div className="absolute right-4 top-1/2 -translate-y-1/2 lg:hidden">
            <LanguageSelector variant="header" />
          </div>

          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList className="gap-1">
              {navGroups.map((group) => {
                const active = isGroupActive(group, pathname);
                if (!group.children) {
                  return (
                    <NavigationMenuItem key={group.labelKey}>
                      <NavigationMenuLink asChild className={navigationMenuTriggerStyle() + " !bg-transparent"}>
                        <Link
                          to={group.to!}
                          className={
                            "text-sm font-medium transition-colors " +
                            (active ? "text-primary" : "text-muted-foreground hover:text-primary")
                          }
                        >
                          {t(group.labelKey)}
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  );
                }
                return (
                  <NavigationMenuItem key={group.labelKey}>
                    <NavigationMenuTrigger
                      className={
                        "!bg-transparent text-sm font-medium " +
                        (active ? "text-primary" : "text-muted-foreground hover:text-primary")
                      }
                    >
                      {t(group.labelKey)}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="w-[280px] p-2">
                        {group.children.map((child) => (
                          <li key={child.to}>
                            <NavigationMenuLink asChild>
                              <Link
                                to={child.to}
                                className="block rounded-md px-3 py-2 hover:bg-secondary"
                              >
                                <div className="text-sm font-medium text-foreground">{t(child.labelKey)}</div>
                                {child.descKey && (
                                  <p className="mt-0.5 text-xs text-muted-foreground">{t(child.descKey)}</p>
                                )}
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>

          <div className="hidden items-center gap-2 lg:flex">
            <LanguageSelector variant="header" />
            <Link
              to="/ai-tent-planner"
              className="inline-flex items-center gap-2 rounded-full border border-primary/25 px-5 py-2 text-sm font-medium text-primary transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <span className="relative inline-flex h-6 w-6 items-center justify-center">
                {/* Four-point corner border */}
                <span className="absolute left-0 top-0 h-1.5 w-1.5 border-l-2 border-t-2 border-[color:var(--gold)]" style={{ animation: 'ai-corner-shimmer 2.5s ease-in-out infinite' }} />
                <span className="absolute right-0 top-0 h-1.5 w-1.5 border-r-2 border-t-2 border-[color:var(--gold)]" style={{ animation: 'ai-corner-shimmer 2.5s ease-in-out 0.6s infinite' }} />
                <span className="absolute bottom-0 left-0 h-1.5 w-1.5 border-b-2 border-l-2 border-[color:var(--gold)]" style={{ animation: 'ai-corner-shimmer 2.5s ease-in-out 1.2s infinite' }} />
                <span className="absolute bottom-0 right-0 h-1.5 w-1.5 border-b-2 border-r-2 border-[color:var(--gold)]" style={{ animation: 'ai-corner-shimmer 2.5s ease-in-out 1.8s infinite' }} />
                <Sparkles className="h-4 w-4 text-[color:var(--gold)]" style={{ animation: 'ai-sparkle-pulse 2s ease-in-out infinite' }} />
              </span>
              {t("nav.eventRecommender")}
            </Link>
            <Link
              to={user ? "/account" : "/login"}
              className="inline-flex items-center gap-1 rounded-full border border-primary/25 px-4 py-2 text-sm font-medium text-primary transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <User className="h-4 w-4" />
              {user ? t("nav.myAccount") : t("nav.signIn")}
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 transition-all hover:border-amber-500 hover:bg-amber-100"
              >
                <ShieldCheck className="h-4 w-4" />
                {t("nav.admin")}
              </Link>
            )}
            <Link
              to="/contact"
              className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-[color:var(--navy-soft)]"
            >
              {t("cta.requestQuote")}
            </Link>
          </div>

        </div>
      </header>

      <main
        className="flex-1 lg:pb-0"
        style={{ paddingBottom: "calc(110px + env(safe-area-inset-bottom))" }}
      >
        <div className="lg:[padding-bottom:0]">{children}</div>
      </main>

      <SiteFooter />

      <MobileBottomNav onMenu={() => setOpen(true)} />
      <MobileBentoDrawer open={open} onClose={() => setOpen(false)} />
      <MobileHelpButton />
      <AccessibilityFontButton />
      <ChatWidget />
    </div>
  );
}

function SiteFooter() {
  const footerLogo = useSlotImage("site.logo", logoUrl);
  const { t } = useTranslation();
  return (
    <footer className="mt-24 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <img src={footerLogo} alt="Pacific North Events & Tents" className="mb-4 h-16 w-auto" />
          <h3 className="font-serif text-xl text-primary-foreground">Pacific North Events &amp; Tents</h3>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">
            {t("footer.tagline")}
          </p>
          <div className="mt-5">
            <LanguageSelector variant="footer" />
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--gold)]">{t("footer.servicesHeading")}</h4>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
            <li><Link to="/services" className="hover:text-[color:var(--gold)]">{t("footer.weddingTents")}</Link></li>
            <li><Link to="/services" className="hover:text-[color:var(--gold)]">{t("footer.festivalTents")}</Link></li>
            <li><Link to="/services" className="hover:text-[color:var(--gold)]">{t("footer.privateParties")}</Link></li>
            <li><Link to="/services" className="hover:text-[color:var(--gold)]">{t("footer.corporateEvents")}</Link></li>
            <li><Link to="/tent-rentals" className="hover:text-[color:var(--gold)]">{t("footer.vendorTents")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--gold)]">{t("footer.quickLinks")}</h4>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
            <li><Link to="/" className="hover:text-[color:var(--gold)]">{t("nav.home")}</Link></li>
            <li><Link to="/services" className="hover:text-[color:var(--gold)]">{t("nav.services")}</Link></li>
            <li><Link to="/tent-rentals" className="hover:text-[color:var(--gold)]">{t("nav.tentRentals")}</Link></li>
            <li><Link to="/gallery" className="hover:text-[color:var(--gold)]">{t("nav.gallery")}</Link></li>
            <li><Link to="/about" className="hover:text-[color:var(--gold)]">{t("nav.about")}</Link></li>
            <li><Link to="/contact" className="hover:text-[color:var(--gold)]">{t("nav.contact")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--gold)]">{t("footer.contact")}</h4>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
            <li><Link to="/contact" className="hover:text-[color:var(--gold)]">{t("cta.requestQuote")}</Link></li>
            <li>{t("footer.servingOregon")}</li>
            <li>
              <a
                href="https://www.facebook.com/profile.php?id=100090833605671"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-[color:var(--gold)]"
              >
                <Facebook className="h-4 w-4" />
                {t("footer.followFacebook")}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-primary-foreground/65 lg:px-8">
          {t("footer.copyright")}
        </div>
      </div>
    </footer>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
  image,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      {image && (
        <>
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-hero-overlay" />
        </>
      )}
      <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:py-28 lg:px-8">
        {eyebrow && (
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--gold)]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-balance font-serif text-4xl font-medium leading-[1.05] sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-primary-foreground/85 sm:text-lg">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}

export function CTASection() {
  const { t } = useTranslation();
  return (
    <section className="bg-sand-gradient">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center lg:px-8">
        <h2 className="font-serif text-3xl text-primary sm:text-4xl">
          {t("cta.readyTitle")}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          {t("cta.readyDesc")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/contact"
            className="inline-flex items-center rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-[color:var(--navy-soft)]"
          >
            {t("cta.requestQuote")}
          </Link>
          <Link
            to="/ai-tent-planner"
            className="inline-flex items-center rounded-full border border-primary/25 bg-transparent px-7 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            {t("nav.eventRecommender")}
          </Link>
        </div>
      </div>
    </section>
  );
}
