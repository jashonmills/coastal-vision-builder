import { useEffect, useRef, useState } from "react";
import { Compass } from "lucide-react";
import { scenes, type Scene } from "./scenes";
import { CylindricalViewer } from "./CylindricalViewer";

export function VirtualTour() {
  const [activeId, setActiveId] = useState<string>(scenes[0].id);
  const [mounted, setMounted] = useState(false);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => setMounted(true), []);

  const active: Scene = scenes.find((s) => s.id === activeId) ?? scenes[0];

  function onTabKey(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = scenes[(idx + dir + scenes.length) % scenes.length];
    setActiveId(next.id);
    tabRefs.current[next.id]?.focus();
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center gap-2 text-primary">
        <Compass className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">Virtual tour</span>
      </div>

      <div
        role="tablist"
        aria-label="Virtual tour scenes"
        className="mb-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]"
      >
        {scenes.map((s, idx) => {
          const isActive = s.id === activeId;
          return (
            <button
              key={s.id}
              ref={(el) => {
                tabRefs.current[s.id] = el;
              }}
              role="tab"
              aria-selected={isActive}
              aria-controls="virtual-tour-viewer"
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(e) => onTabKey(e, idx)}
              onClick={() => setActiveId(s.id)}
              className={
                "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors " +
                (isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary")
              }
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div
        id="virtual-tour-viewer"
        role="tabpanel"
        aria-label={active.label}
        className="relative overflow-hidden rounded-2xl border border-border bg-[#0b1720] shadow-lg"
        style={{ aspectRatio: "16 / 9", minHeight: "min(70vh, 520px)" }}
      >
        {mounted ? (
          <PannellumViewer scene={active} />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <noscript>
              <img
                src={active.image}
                alt={active.label}
                className="h-full w-full object-cover"
              />
            </noscript>
          </div>
        )}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{active.label}.</span> {active.description} Click and drag to look
        around, pinch or scroll to zoom, or press fullscreen for the full effect.
      </p>
    </div>
  );
}
