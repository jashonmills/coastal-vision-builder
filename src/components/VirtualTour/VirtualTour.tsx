import { useEffect, useRef, useState } from "react";
import { Compass } from "lucide-react";
import pano1 from "@/assets/tour/mobile-pano-1.jpg.asset.json";
import pano2 from "@/assets/tour/mobile-pano-2.jpg.asset.json";
import pano3 from "@/assets/tour/mobile-pano-3.jpg.asset.json";
import pano4 from "@/assets/tour/mobile-pano-4.jpg.asset.json";

const TABLET_BREAKPOINT = 1024;

function useIsMobileOrTablet() {
  const [matches, setMatches] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setMatches(window.innerWidth < TABLET_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setMatches(window.innerWidth < TABLET_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!matches;
}


const mobilePanoramas = [
  { url: pano1.url, label: "Main Hall — Wide View" },
  { url: pano2.url, label: "Main Hall — Beams & Stair Landing" },
  { url: pano3.url, label: "South End — Window Wall & Bar" },
  { url: pano4.url, label: "Side Bar & Built-Ins" },
];

export function VirtualTour() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobileOrTablet = useIsMobileOrTablet();

  useEffect(() => {
    if (isMobileOrTablet) return;
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
  }, [isMobileOrTablet]);

  return (
    <div className="w-full" ref={containerRef}>
      <div className="mb-4 flex items-center gap-2 text-primary">
        <Compass className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">Virtual tour</span>
      </div>

      {isMobileOrTablet ? (
        <div className="flex flex-col gap-4">
          {mobilePanoramas.map((p) => (
            <figure key={p.url} className="flex flex-col gap-2">
              <img
                src={p.url}
                alt={p.label}
                loading="lazy"
                decoding="async"
                className="w-full h-auto rounded-xl border border-border bg-[#0b1720]"
              />
              <figcaption className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                {p.label}
              </figcaption>
            </figure>
          ))}
          <p className="mt-1 text-sm text-muted-foreground">
            Pinch to zoom or rotate your phone sideways to view each panorama full-width.
          </p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

