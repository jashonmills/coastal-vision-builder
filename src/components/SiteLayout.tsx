import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/tent-rentals", label: "Tent Rentals" },
  { to: "/events", label: "Events" },
  { to: "/gallery", label: "Gallery" },
  { to: "/recommender", label: "Event Recommender" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

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

          <nav className="hidden items-center gap-7 lg:flex">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                activeProps={{ className: "text-primary" }}
                inactiveProps={{ className: "text-muted-foreground hover:text-primary" }}
                className="text-sm font-medium transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              to="/recommender"
              className="inline-flex items-center rounded-full border border-primary/20 bg-transparent px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
            >
              Find My Tent Size
            </Link>
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
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  activeOptions={{ exact: l.to === "/" }}
                  activeProps={{ className: "bg-secondary text-primary" }}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  {l.label}
                </Link>
              ))}
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

      <main className="flex-1">{children}</main>

      <SiteFooter />
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
            Find My Tent Size
          </Link>
        </div>
      </div>
    </section>
  );
}
