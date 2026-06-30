import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, X } from "lucide-react";
import type { RecommenderInput } from "@/lib/recommender";

const photoModules = import.meta.glob("@/assets/beacon/*.jpg.asset.json", {
  eager: true,
  import: "default",
}) as Record<string, { url: string }>;

const thumbUrl = Object.entries(photoModules).sort(([a], [b]) =>
  a.localeCompare(b),
)[11]?.[1]?.url ?? Object.values(photoModules)[0]?.url;

export function BeaconCallout({
  input,
  onDismiss,
}: {
  input: RecommenderInput;
  onDismiss: () => void;
}) {
  const loc = (input.location || "").toLowerCase();
  const recommended =
    loc.includes("seaside") ||
    (input.guestCount <= 150 && input.outdoor === "Indoors") ||
    (input.exposure === "Yes, very exposed" && input.guestCount <= 150);

  return (
    <div
      className={
        "relative mt-2 overflow-hidden rounded-2xl border bg-[color:var(--sand-soft)]/60 p-5 sm:p-6 " +
        (recommended
          ? "border-[color:var(--gold)] ring-2 ring-[color:var(--gold)]/40"
          : "border-border/60")
      }
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss Beacon suggestion"
        className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt="Beacon on Broadway event hall"
            className="h-28 w-full flex-none rounded-xl object-cover sm:h-24 sm:w-32"
            loading="lazy"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--forest)]">
            {recommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--gold)]/20 px-2 py-0.5 text-[10px] text-[color:var(--forest)]">
                <Sparkles className="h-3 w-3" /> Recommended for your event
              </span>
            )}
            Indoor venue option · Seaside, OR
          </p>
          <h3 className="mt-1.5 font-serif text-lg text-primary sm:text-xl">
            Hosting in Seaside? Consider Beacon on Broadway
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Our 2,800 sq ft indoor hall fits up to 150 guests — climate
            controlled, chairs and tables included.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              to="/beacon-on-broadway"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-[color:var(--navy-soft)]"
            >
              Explore the Beacon <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
            >
              Keep planning my tent
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            You can do both — we'll quote the venue and any tent or rentals
            together.
          </p>
        </div>
      </div>
    </div>
  );
}
