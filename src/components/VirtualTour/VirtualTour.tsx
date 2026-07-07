import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Compass, Maximize2, X } from "lucide-react";
import pano1 from "@/assets/tour/mobile-pano-1.jpg.asset.json";
import pano2 from "@/assets/tour/mobile-pano-2.jpg.asset.json";
import pano3 from "@/assets/tour/mobile-pano-3.jpg.asset.json";
import pano4 from "@/assets/tour/mobile-pano-4.jpg.asset.json";

const mobilePanoramas = [
  { url: pano1.url, label: "Main Hall — Wide View" },
  { url: pano2.url, label: "Main Hall — Beams & Stair Landing" },
  { url: pano3.url, label: "South End — Window Wall & Bar" },
  { url: pano4.url, label: "Side Bar & Built-Ins" },
];

export function VirtualTour() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const panoramaScrollerRef = useRef<HTMLDivElement>(null);

  const closePanorama = useCallback(() => setActiveIndex(null), []);
  const showPrevious = useCallback(() => {
    setActiveIndex((current) =>
      current === null ? current : (current - 1 + mobilePanoramas.length) % mobilePanoramas.length,
    );
  }, []);
  const showNext = useCallback(() => {
    setActiveIndex((current) =>
      current === null ? current : (current + 1) % mobilePanoramas.length,
    );
  }, []);

  useEffect(() => {
    // Desktop-only: forward devicemotion to the Panoee iframe.
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;

    function handleDeviceMotion(e: DeviceMotionEvent) {
      const iframe = document.getElementById("tour-embeded") as HTMLIFrameElement | null;
      if (!iframe || !iframe.contentWindow) return;
      iframe.contentWindow.postMessage(
        {
          type: "devicemotion",
          deviceMotionEvent: {
            acceleration: {
              x: e.acceleration?.x,
              y: e.acceleration?.y,
              z: e.acceleration?.z,
            },
            accelerationIncludingGravity: {
              x: e.accelerationIncludingGravity?.x,
              y: e.accelerationIncludingGravity?.y,
              z: e.accelerationIncludingGravity?.z,
            },
            rotationRate: {
              alpha: e.rotationRate?.alpha,
              beta: e.rotationRate?.beta,
              gamma: e.rotationRate?.gamma,
            },
            interval: e.interval,
            timeStamp: e.timeStamp,
          },
        },
        "*",
      );
    }
    window.addEventListener("devicemotion", handleDeviceMotion);
    return () => window.removeEventListener("devicemotion", handleDeviceMotion);
  }, []);

  useEffect(() => {
    if (activeIndex === null || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeIndex]);

  useEffect(() => {
    if (activeIndex === null || typeof window === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanorama();
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, closePanorama, showNext, showPrevious]);

  useEffect(() => {
    if (activeIndex === null || typeof window === "undefined") return;

    const frame = window.requestAnimationFrame(() => {
      const scroller = panoramaScrollerRef.current;
      if (!scroller) return;
      scroller.scrollLeft = Math.max(0, (scroller.scrollWidth - scroller.clientWidth) / 2);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeIndex]);

  const activePanorama = activeIndex === null ? null : mobilePanoramas[activeIndex];

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center gap-2 text-primary">
        <Compass className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">Virtual tour</span>
      </div>

      {/* Mobile + tablet: raw panorama stack */}
      <div className="lg:hidden">
        <div className="flex flex-col gap-4">
          {mobilePanoramas.map((p, index) => (
            <figure key={p.url} className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                className="group relative block w-full overflow-hidden rounded-xl border border-border bg-primary text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Open panorama: ${p.label}`}
              >
                <img
                  src={p.url}
                  alt={p.label}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full cursor-zoom-in transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <span className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary-foreground/25 bg-primary/80 text-primary-foreground shadow-sm backdrop-blur">
                  <Maximize2 className="h-4 w-4" />
                </span>
              </button>
              <figcaption className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                {p.label}
              </figcaption>
            </figure>
          ))}
          <p className="mt-1 text-sm text-muted-foreground">
            Pinch to zoom or rotate your phone sideways to view each panorama full-width.
          </p>
        </div>
      </div>

      {/* Desktop: Panoee 360° embed */}
      <div className="hidden lg:block">
        <div
          className="relative overflow-hidden rounded-2xl border border-border bg-[#0b1720] shadow-lg"
          style={{ aspectRatio: "16 / 9", minHeight: "min(70vh, 520px)" }}
        >
          <iframe
            id="tour-embeded"
            name="The beacon"
            title="Beacon on Broadway — 360° virtual tour"
            src="https://tour.panoee.net/iframe/6a4d4f8af55d20ee5d2688de"
            frameBorder={0}
            scrolling="no"
            loading="lazy"
            allow="vr; xr; accelerometer; gyroscope; autoplay;"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Drag to look around the main hall, use the on-screen controls to move between viewpoints, or press fullscreen for the full effect.
        </p>
      </div>

      {activePanorama && activeIndex !== null && (
        <div
          className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-primary text-primary-foreground lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={activePanorama.label}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-primary-foreground/15 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
            <button
              type="button"
              onClick={closePanorama}
              aria-label="Close panorama"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0 text-center">
              <p className="truncate text-sm font-semibold">{activePanorama.label}</p>
              <p className="text-xs text-primary-foreground/70">
                {activeIndex + 1} / {mobilePanoramas.length}
              </p>
            </div>
            <span className="h-10 w-10 shrink-0" aria-hidden="true" />
          </header>

          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              ref={panoramaScrollerRef}
              className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [touch-action:pan-x_pinch-zoom]"
            >
              <div className="flex h-full min-w-max items-center px-4 py-5">
                <img
                  src={activePanorama.url}
                  alt={activePanorama.label}
                  draggable={false}
                  className="h-[min(70vh,640px)] max-h-full w-auto max-w-none select-none rounded-xl border border-primary-foreground/20 bg-primary shadow-2xl"
                />
              </div>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-primary-foreground/15 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
              <button
                type="button"
                onClick={showPrevious}
                aria-label="Previous panorama"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-primary-foreground/20">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${((activeIndex + 1) / mobilePanoramas.length) * 100}%` }}
                />
              </div>
              <button
                type="button"
                onClick={showNext}
                aria-label="Next panorama"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
