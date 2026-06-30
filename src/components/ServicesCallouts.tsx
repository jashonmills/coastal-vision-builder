import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, MapPin } from "lucide-react";
import { cateringCalloutImage } from "@/lib/site-images";

const photoModules = import.meta.glob("@/assets/beacon/*.jpg.asset.json", {
  eager: true,
  import: "default",
}) as Record<string, { url: string }>;

const beaconThumbUrl = Object.entries(photoModules)
  .sort(([a], [b]) => a.localeCompare(b))[11]?.[1]?.url ??
  Object.values(photoModules)[0]?.url;

export function ServicesCallouts() {
  const { t } = useTranslation();
  const cateringPhoto = pickPhoto("catering-callout");

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Beacon callout */}
      <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md">
        <div className="aspect-[16/10] overflow-hidden">
          {beaconThumbUrl ? (
            <img
              src={beaconThumbUrl}
              alt={t("services.callouts.beacon.alt")}
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
            {t("services.callouts.beacon.eyebrow")}
          </p>
          <h3 className="mt-2 font-serif text-2xl text-primary">
            {t("services.callouts.beacon.title")}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("services.callouts.beacon.copy")}
          </p>
          <Link
            to="/beacon-on-broadway"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--forest)] transition hover:text-[color:var(--gold)]"
          >
            {t("services.callouts.beacon.cta")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Catering callout */}
      <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md">
        <div className="aspect-[16/10] overflow-hidden">
          <img
            src={cateringPhoto.url}
            alt={t("services.callouts.catering.alt")}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        </div>
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gold)]">
            {t("services.callouts.catering.eyebrow")}
          </p>
          <h3 className="mt-2 font-serif text-2xl text-primary">
            {t("services.callouts.catering.title")}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("services.callouts.catering.copy")}
          </p>
          <Link
            to="/catering"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--forest)] transition hover:text-[color:var(--gold)]"
          >
            {t("services.callouts.catering.cta")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
