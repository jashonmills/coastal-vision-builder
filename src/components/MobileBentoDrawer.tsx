import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
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
  type LucideIcon,
} from "lucide-react";

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

const exploreTiles: Tile[] = [
  { to: "/", label: "Home", icon: Home,
    tileBg: "bg-gradient-to-br from-[oklch(0.96_0.02_220)] to-[oklch(0.92_0.04_220)] border border-[oklch(0.85_0.04_220)]", iconColor: "text-primary" },
  { to: "/tent-rentals", label: "Tent Rentals", icon: Tent,
    tileBg: "bg-gradient-to-br from-[oklch(0.97_0.02_85)] to-[oklch(0.93_0.04_80)] border border-[oklch(0.86_0.05_80)]", iconColor: "text-[color:var(--sand-deep)]" },
  { to: "/services", label: "Services", icon: HardHat,
    tileBg: "bg-gradient-to-br from-[oklch(0.96_0.03_160)] to-[oklch(0.91_0.05_160)] border border-[oklch(0.84_0.06_160)]", iconColor: "text-[color:var(--forest)]" },
  { to: "/inventory", label: "Inventory", icon: ListChecks,
    tileBg: "bg-gradient-to-br from-[oklch(0.96_0.03_55)] to-[oklch(0.91_0.06_55)] border border-[oklch(0.84_0.08_55)]", iconColor: "text-[color:var(--gold)]" },
];

const exploreCenter: Center = {
  to: "/recommender",
  label: "Recommender",
  icon: Sparkles,
  bgClass: "bg-primary",
};

const moreTiles: Tile[] = [
  { to: "/gallery", label: "Gallery", icon: ImageIcon,
    tileBg: "bg-gradient-to-br from-[oklch(0.96_0.02_300)] to-[oklch(0.91_0.04_300)] border border-[oklch(0.84_0.05_300)]", iconColor: "text-[color:var(--navy-soft)]" },
  { to: "/events", label: "Events", icon: Calendar,
    tileBg: "bg-gradient-to-br from-[oklch(0.96_0.03_25)] to-[oklch(0.91_0.05_25)] border border-[oklch(0.84_0.07_25)]", iconColor: "text-[color:var(--sand-deep)]" },
  { to: "/about", label: "About", icon: Info,
    tileBg: "bg-gradient-to-br from-[oklch(0.96_0.02_200)] to-[oklch(0.91_0.04_200)] border border-[oklch(0.84_0.05_200)]", iconColor: "text-primary" },
  { to: "/contact", label: "Contact", icon: Phone,
    tileBg: "bg-gradient-to-br from-[oklch(0.96_0.03_160)] to-[oklch(0.91_0.05_160)] border border-[oklch(0.84_0.06_160)]", iconColor: "text-[color:var(--forest)]" },
];

const moreCenter: Center = {
  to: "/contact",
  label: "Quote",
  icon: Send,
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
      <span className="text-sm font-bold text-foreground">{tile.label}</span>
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
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 border-background shadow-lg active:scale-95 transition-all z-10 text-primary-foreground ${center.bgClass}`}
        >
          <CenterIcon className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5 uppercase tracking-wide">
            {center.label}
          </span>
        </Link>
      </div>
    </section>
  );
}

export function MobileBentoDrawer({ open, onClose }: Props) {
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

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — sits below bottom nav (z-30), bottom nav is z-40 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
          />
          {/* Drawer — slides up from below; bottom-nav (~76px) stays on top */}
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
            {/* Grab handle + header */}
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
              <h2 className="font-serif text-xl text-primary">Menu</h2>
              <p className="text-xs text-muted-foreground">Pacific North Event &amp; Tent Rentals</p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
              <BentoBlock title="Explore" tiles={exploreTiles} center={exploreCenter} onClose={onClose} />
              <BentoBlock title="More" tiles={moreTiles} center={moreCenter} onClose={onClose} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
