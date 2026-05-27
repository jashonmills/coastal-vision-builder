import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
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

type NavChild = { to: string; label: string; description?: string };
type NavGroup = { label: string; to?: string; children?: NavChild[] };

const navGroups: NavGroup[] = [
  { label: "Home", to: "/" },
  {
    label: "Rentals",
    children: [
      { to: "/tent-rentals", label: "Tent Rentals", description: "Frame, pole, and hexagon tents" },
      { to: "/inventory", label: "Inventory & Pricing", description: "Full catalog with sample layouts" },
      { to: "/recommender", label: "Event Recommender", description: "AI-built setup for your event" },
    ],
  },
  {
    label: "Services",
    children: [
      { to: "/services", label: "All Services", description: "Weddings, festivals, corporate" },
      { to: "/events", label: "Events", description: "Past events and case studies" },
    ],
  },
  { label: "Gallery", to: "/gallery" },
  {
    label: "About",
    children: [
      { to: "/about", label: "About Us", description: "Coastal team, our story" },
      { to: "/contact", label: "Contact", description: "Get in touch" },
    ],
  },
];

function isGroupActive(group: NavGroup, pathname: string): boolean {
  if (group.to) return group.to === "/" ? pathname === "/" : pathname.startsWith(group.to);
  return group.children?.some((c) => pathname.startsWith(c.to)) ?? false;
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 lg:px-8">
          <Link to="/" className="flex flex-col leading-tight">
            <span className="font-serif text-lg font-semibold text-primary sm:text-xl">
              Pacific North
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:text-xs">
              Events &amp; Tents
            </span>
          </Link>

          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList className="gap-1">
              {navGroups.map((group) => {
                const active = isGroupActive(group, pathname);
                if (!group.children) {
                  return (
                    <NavigationMenuItem key={group.label}>
                      <NavigationMenuLink asChild className={navigationMenuTriggerStyle() + " !bg-transparent"}>
                        <Link
                          to={group.to!}
                          className={
                            "text-sm font-medium transition-colors " +
                            (active ? "text-primary" : "text-muted-foreground hover:text-primary")
                          }
                        >
                          {group.label}
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  );
                }
                return (
                  <NavigationMenuItem key={group.label}>
                    <NavigationMenuTrigger
                      className={
                        "!bg-transparent text-sm font-medium " +
                        (active ? "text-primary" : "text-muted-foreground hover:text-primary")
                      }
                    >
                      {group.label}
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
                                <div className="text-sm font-medium text-foreground">{child.label}</div>
                                {child.description && (
                                  <p className="mt-0.5 text-xs text-muted-foreground">{child.description}</p>
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
            <Link
              to="/contact"
              className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-[color:var(--navy-soft)]"
            >
              Request a Quote
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-primary lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-border/60 bg-background lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
              {navGroups.map((group) => {
                if (!group.children) {
                  return (
                    <Link
                      key={group.label}
                      to={group.to!}
                      onClick={() => setOpen(false)}
                      activeOptions={{ exact: group.to === "/" }}
                      activeProps={{ className: "bg-secondary text-primary" }}
                      className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                    >
                      {group.label}
                    </Link>
                  );
                }
                const expanded = openGroup === group.label;
                return (
                  <div key={group.label}>
                    <button
                      type="button"
                      onClick={() => setOpenGroup(expanded ? null : group.label)}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                    >
                      {group.label}
                      <ChevronDown className={"h-4 w-4 transition-transform " + (expanded ? "rotate-180" : "")} />
                    </button>
                    {expanded && (
                      <div className="ml-3 flex flex-col gap-1 border-l border-border/60 pl-3 py-1">
                        {group.children.map((child) => (
                          <Link
                            key={child.to}
                            to={child.to}
                            onClick={() => setOpen(false)}
                            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <Link
                to="/contact"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
              >
                Request a Quote
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pb-24 lg:pb-0">{children}</main>

      <SiteFooter />

      <MobileBottomNav onMenu={() => setOpen(true)} />
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-24 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <h3 className="font-serif text-xl">Pacific North Events &amp; Tents</h3>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">
            Event tent rentals and coastal event support for weddings, festivals, private parties, and corporate gatherings.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--gold)]">Services</h4>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
            <li><Link to="/services" className="hover:text-[color:var(--gold)]">Wedding Tents</Link></li>
            <li><Link to="/services" className="hover:text-[color:var(--gold)]">Festival Tents</Link></li>
            <li><Link to="/services" className="hover:text-[color:var(--gold)]">Private Parties</Link></li>
            <li><Link to="/services" className="hover:text-[color:var(--gold)]">Corporate Events</Link></li>
            <li><Link to="/tent-rentals" className="hover:text-[color:var(--gold)]">Vendor Tents</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--gold)]">Quick Links</h4>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
            <li><Link to="/" className="hover:text-[color:var(--gold)]">Home</Link></li>
            <li><Link to="/services" className="hover:text-[color:var(--gold)]">Services</Link></li>
            <li><Link to="/tent-rentals" className="hover:text-[color:var(--gold)]">Tent Rentals</Link></li>
            <li><Link to="/gallery" className="hover:text-[color:var(--gold)]">Gallery</Link></li>
            <li><Link to="/about" className="hover:text-[color:var(--gold)]">About</Link></li>
            <li><Link to="/contact" className="hover:text-[color:var(--gold)]">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--gold)]">Contact</h4>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
            <li><Link to="/contact" className="hover:text-[color:var(--gold)]">Request a Quote</Link></li>
            <li>Serving the Oregon Coast</li>
            <li>Follow us on Facebook</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-primary-foreground/65 lg:px-8">
          © 2026 Pacific North Events &amp; Tents. Your Event. Your Vision. We Make It Happen.
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
  return (
    <section className="bg-sand-gradient">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center lg:px-8">
        <h2 className="font-serif text-3xl text-primary sm:text-4xl">
          Ready to Bring Your Event to Life?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Tell us about your date, location, guest count, and vision. We'll help you choose the right tent setup for your event.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/contact"
            className="inline-flex items-center rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-[color:var(--navy-soft)]"
          >
            Request a Quote
          </Link>
          <Link
            to="/recommender"
            className="inline-flex items-center rounded-full border border-primary/25 bg-transparent px-7 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            Event Recommender
          </Link>
        </div>
      </div>
    </section>
  );
}
