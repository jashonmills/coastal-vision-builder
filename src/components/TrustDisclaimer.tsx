import { Info } from "lucide-react";

export function TrustDisclaimer({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "compact" | "quote";
  className?: string;
}) {
  const text =
    variant === "quote"
      ? "This is a planning estimate, not a final quote. Final pricing, availability, setup, and anchoring depend on event date, location, weather, surface conditions, access, and inventory availability at the time of booking."
      : variant === "compact"
      ? "Planning estimate only — final pricing depends on date, location, weather, access, and availability."
      : "This recommendation is a planning estimate. Final pricing, availability, setup, and anchoring depend on event date, location, weather, surface, access, and inventory availability.";

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] leading-snug text-muted-foreground ${className}`}
      role="note"
    >
      <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-[color:var(--gold)]" />
      <span>{text}</span>
    </div>
  );
}
