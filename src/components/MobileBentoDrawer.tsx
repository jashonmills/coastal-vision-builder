import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  X,
  Home,
  Tent,
  ListChecks,
  Sparkles,
  Calendar,
  Image as ImageIcon,
  Info,
  Phone,
  HardHat,
  Send,
  LayoutDashboard,
  Inbox,
  FileText,
  Boxes,
  Users,
  Tag,
  Upload,
  ExternalLink,
  ShieldCheck,
  LogOut,
  LogIn,
  UtensilsCrossed,
  Compass,
  CalendarDays,
  FileSignature,
  type LucideIcon,

} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Tile {
  to: string;
  label: string;
  icon: LucideIcon;
  tileBg: string;
  iconColor: string;
}

interface Center {
  to: string;
  label: string;
  icon: LucideIcon;
  bgClass: string;
}

// ----- Public tiles -----
const exploreTiles: Tile[] = [
  {
    to: "/",
    label: "Home",
    icon: Home,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.02_220)] to-[oklch(0.92_0.04_220)] border border-[oklch(0.85_0.04_220)]",
    iconColor: "text-primary",
  },
  {
    to: "/tent-rentals",
    label: "Tent Rentals",
    icon: Tent,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.97_0.02_85)] to-[oklch(0.93_0.04_80)] border border-[oklch(0.86_0.05_80)]",
    iconColor: "text-[color:var(--sand-deep)]",
  },
  {
    to: "/services",
    label: "Services",
    icon: HardHat,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.03_160)] to-[oklch(0.91_0.05_160)] border border-[oklch(0.84_0.06_160)]",
    iconColor: "text-[color:var(--forest)]",
  },
  {
    to: "/inventory",
    label: "Inventory",
    icon: ListChecks,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.03_55)] to-[oklch(0.91_0.06_55)] border border-[oklch(0.84_0.08_55)]",
    iconColor: "text-[color:var(--gold)]",
  },
];

const exploreCenter: Center = {
  to: "/ai-tent-planner",
  label: "Planner",
  icon: Sparkles,
  bgClass: "bg-primary",
};

const moreTiles: Tile[] = [
  {
    to: "/gallery",
    label: "Gallery",
    icon: ImageIcon,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.02_300)] to-[oklch(0.91_0.04_300)] border border-[oklch(0.84_0.05_300)]",
    iconColor: "text-[color:var(--navy-soft)]",
  },
  {
    to: "/beacon-on-broadway",
    label: "Beacon",
    icon: Calendar,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.03_25)] to-[oklch(0.91_0.05_25)] border border-[oklch(0.84_0.07_25)]",
    iconColor: "text-[color:var(--sand-deep)]",
  },

  {
    to: "/about",
    label: "About",
    icon: Info,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.02_200)] to-[oklch(0.91_0.04_200)] border border-[oklch(0.84_0.05_200)]",
    iconColor: "text-primary",
  },
  {
    to: "/contact",
    label: "Contact",
    icon: Phone,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.03_160)] to-[oklch(0.91_0.05_160)] border border-[oklch(0.84_0.06_160)]",
    iconColor: "text-[color:var(--forest)]",
  },
];

const moreCenter: Center = {
  to: "/contact",
  label: "Quote",
  icon: Send,
  bgClass: "bg-[color:var(--gold)] text-primary",
};

// ----- Services & Info tiles -----
const servicesTiles: Tile[] = [
  {
    to: "/catering",
    label: "Catering",
    icon: UtensilsCrossed,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.03_55)] to-[oklch(0.91_0.06_55)] border border-[oklch(0.84_0.08_55)]",
    iconColor: "text-[color:var(--gold)]",
  },
  {
    to: "/virtual-tour",
    label: "Virtual Tour",
    icon: Compass,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.02_220)] to-[oklch(0.92_0.04_220)] border border-[oklch(0.85_0.04_220)]",
    iconColor: "text-primary",
  },
  {
    to: "/events",
    label: "Events",
    icon: CalendarDays,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.03_25)] to-[oklch(0.91_0.05_25)] border border-[oklch(0.84_0.07_25)]",
    iconColor: "text-[color:var(--sand-deep)]",
  },
  {
    to: "/rental-contract",
    label: "Rental Contract",
    icon: FileSignature,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.03_160)] to-[oklch(0.91_0.05_160)] border border-[oklch(0.84_0.06_160)]",
    iconColor: "text-[color:var(--forest)]",
  },
];

const servicesCenter: Center = {
  to: "/contact",
  label: "Contact",
  icon: Phone,
  bgClass: "bg-primary",
};


// ----- Admin tiles -----
const adminOpsTiles: Tile[] = [
  {
    to: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.02_220)] to-[oklch(0.92_0.04_220)] border border-[oklch(0.85_0.04_220)]",
    iconColor: "text-primary",
  },
  {
    to: "/admin/quote-requests",
    label: "Requests",
    icon: Inbox,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.03_55)] to-[oklch(0.91_0.06_55)] border border-[oklch(0.84_0.08_55)]",
    iconColor: "text-[color:var(--gold)]",
  },
  {
    to: "/admin/quotes",
    label: "Quotes",
    icon: FileText,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.02_200)] to-[oklch(0.91_0.04_200)] border border-[oklch(0.84_0.05_200)]",
    iconColor: "text-primary",
  },
  {
    to: "/admin/scheduler",
    label: "Scheduler",
    icon: Calendar,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.03_25)] to-[oklch(0.91_0.05_25)] border border-[oklch(0.84_0.07_25)]",
    iconColor: "text-[color:var(--sand-deep)]",
  },
];

const adminOpsCenter: Center = {
  to: "/admin/quote-requests",
  label: "Inbox",
  icon: Inbox,
  bgClass: "bg-primary",
};

const adminManageTiles: Tile[] = [
  {
    to: "/admin/inventory",
    label: "Inventory",
    icon: Boxes,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.97_0.02_85)] to-[oklch(0.93_0.04_80)] border border-[oklch(0.86_0.05_80)]",
    iconColor: "text-[color:var(--sand-deep)]",
  },
  {
    to: "/admin/staff",
    label: "Staff",
    icon: Users,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.03_160)] to-[oklch(0.91_0.05_160)] border border-[oklch(0.84_0.06_160)]",
    iconColor: "text-[color:var(--forest)]",
  },
  {
    to: "/admin",
    label: "Pricing & Content",
    icon: Tag,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.02_300)] to-[oklch(0.91_0.04_300)] border border-[oklch(0.84_0.05_300)]",
    iconColor: "text-[color:var(--navy-soft)]",
  },
  {
    to: "/admin/data-import",
    label: "Data Import",
    icon: Upload,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.03_55)] to-[oklch(0.91_0.06_55)] border border-[oklch(0.84_0.08_55)]",
    iconColor: "text-[color:var(--gold)]",
  },
  {
    to: "/admin/admins",
    label: "Admins",
    icon: ShieldCheck,
    tileBg:
      "bg-gradient-to-br from-[oklch(0.96_0.03_30)] to-[oklch(0.91_0.05_30)] border border-[oklch(0.84_0.06_30)]",
    iconColor: "text-amber-700",
  },
];

const adminManageCenter: Center = {
  to: "/",
  label: "View Site",
  icon: ExternalLink,
  bgClass: "bg-[color:var(--gold)] text-primary",
};

function BentoTile({ tile, onClose }: { tile: Tile; onClose: () => void }) {
  const Icon = tile.icon;
  return (
    <Link
      to={tile.to}
      onClick={onClose}
      className={`rounded-2xl min-h-[100px] flex flex-col items-center justify-center gap-1.5 p-3 shadow-sm active:scale-[0.98] transition-all ${tile.tileBg}`}
      aria-label={tile.label}
    >
      <span className="w-10 h-10 rounded-xl bg-white/90 shadow-sm flex items-center justify-center">
        <Icon className={`w-5 h-5 ${tile.iconColor}`} />
      </span>
      <span className="text-sm font-bold text-foreground text-center leading-tight">
        {tile.label}
      </span>
    </Link>
  );
}

function BentoBlock({
  title,
  tiles,
  center,
  onClose,
}: {
  title: string;
  tiles: Tile[];
  center: Center;
  onClose: () => void;
}) {
  const CenterIcon = center.icon;
  return (
    <section className="mb-2">
      <h3 className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground px-2 pb-2 uppercase">
        {title}
      </h3>
      <div className="relative w-full max-w-md mx-auto">
        <div className="grid grid-cols-2 grid-rows-2 gap-3">
          {tiles.map((tile) => (
            <BentoTile key={tile.label} tile={tile} onClose={onClose} />
          ))}
        </div>
        <Link
          to={center.to}
          onClick={onClose}
          aria-label={center.label}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full flex flex-col items-center justify-center px-1.5 border-4 border-background shadow-lg active:scale-95 transition-all z-10 text-primary-foreground ${center.bgClass}`}
        >
          <CenterIcon className="w-5 h-5" />
          <span
            className={`${center.label.length > 7 ? "text-[9px]" : "text-[10px]"} font-semibold mt-0.5 uppercase tracking-wide leading-[1.05] text-center break-words max-w-[68px]`}
          >
            {center.label}
          </span>
        </Link>
      </div>
    </section>
  );
}

export function MobileBentoDrawer({ open, onClose }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof window === "undefined") return null;

  // The drawer must follow the admin route context immediately. Role lookup can
  // briefly lag behind the page render, which was causing the public menu to
  // appear inside admin screens.
  const inAdmin = pathname.startsWith("/admin");

  const title = inAdmin ? "Admin Tools" : "Menu";
  const subtitle = inAdmin ? "Operations & management" : "Pacific North Event & Tent Rentals";

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed left-0 right-0 z-30 lg:hidden bg-background rounded-t-3xl shadow-2xl flex flex-col"
            style={{
              bottom: "calc(76px + env(safe-area-inset-bottom))",
              maxHeight: "calc(100vh - 76px - env(safe-area-inset-bottom) - 16px)",
            }}
          >
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <div className="flex-1 flex justify-center">
                <span className="block h-1.5 w-12 rounded-full bg-border" />
              </div>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="absolute right-4 top-3 p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="px-5 pt-1 pb-2">
              <h2 className="font-serif text-xl text-primary">{title}</h2>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
              {inAdmin ? (
                <>
                  <BentoBlock
                    title="Operations"
                    tiles={adminOpsTiles}
                    center={adminOpsCenter}
                    onClose={onClose}
                  />
                  <BentoBlock
                    title="Manage"
                    tiles={adminManageTiles}
                    center={adminManageCenter}
                    onClose={onClose}
                  />
                </>
              ) : (
                <>
                  <BentoBlock
                    title="Explore"
                    tiles={exploreTiles}
                    center={exploreCenter}
                    onClose={onClose}
                  />
                  <BentoBlock
                    title="More"
                    tiles={moreTiles}
                    center={moreCenter}
                    onClose={onClose}
                  />
                  <BentoBlock
                    title="Services & Info"
                    tiles={servicesTiles}
                    center={servicesCenter}
                    onClose={onClose}
                  />

                  {isAdmin && (
                    <div className="mt-3 px-2">
                      <Link
                        to="/admin/dashboard"
                        onClick={onClose}
                        className="flex items-center justify-center gap-2 rounded-full border border-amber-500/40 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Go to Admin
                      </Link>
                    </div>
                  )}
                </>
              )}
              {user ? (
                <div className="mt-3 space-y-2 px-2">
                  <Link
                    to="/profile"
                    onClick={onClose}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/30 bg-background px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
                  >
                    Edit profile
                  </Link>
                  {inAdmin && (
                    <p className="text-center text-[11px] text-muted-foreground">
                      Signed in as {user.email}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      onClose();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="mt-3 px-2">
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign in / Sign up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
