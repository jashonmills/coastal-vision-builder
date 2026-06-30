import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, MapPin } from "lucide-react";
import { pickPhoto } from "@/lib/site-images";

const photoModules = import.meta.glob("@/assets/beacon/*.jpg.asset.json", {
  eager: true,
  import: "default",
}) as Record<string, { url: string }>;

const beaconThumbUrl = Object.entries(photoModules)
  .sort(([a], [b]) => a.localeCompare(b))[11]?.[1]?.url ??
  Object.values(photoModules)[0]?.url;

export function ServicesCallouts() {
  const cateringPhoto = pickPhoto("catering-callout");

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Beacon callout */}
      <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md">
        <div className="aspect-[16/10] overflow-hidden">
          {beaconThumbUrl ? (
            <img
              src={beaconThumbUrl}
              alt="Beacon on Broadway event hall"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <MapPin className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gold)]">
            Event Venue
          </p>
          <h3 className="mt-2 font-serif text-2xl text-primary">
            Beacon on Broadway
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Hosting in Seaside? Our 2,800 sq ft climate-controlled hall holds up to 150 guests with chairs, tables, and a built-in bar included.
          </p>
          <Link
            to="/beacon-on-broadway"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--forest)] transition hover:text-[color:var(--gold)]"
          >
            Explore the venue <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Catering callout */}
      <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md">
        <div className="aspect-[16/10] overflow-hidden">
          <img
            src={cateringPhoto.url}
            alt="Catering buffet spread"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        </div>
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gold)]">
            Full-Service Catering
          </p>
          <h3 className="mt-2 font-serif text-2xl text-primary">
            Pacific North Catering
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            From buffet and pasta bars to chef-attended stations and bartending, we bring the food, drinks, and service to your tent or venue.
          </p>
          <Link
            to="/catering"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--forest)] transition hover:text-[color:var(--gold)]"
          >
            See catering menus <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
