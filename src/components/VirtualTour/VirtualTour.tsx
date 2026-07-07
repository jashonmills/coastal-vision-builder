import { useEffect, useRef } from "react";
import { Compass } from "lucide-react";

export function VirtualTour() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  return (
    <div className="w-full" ref={containerRef}>
      <div className="mb-4 flex items-center gap-2 text-primary">
        <Compass className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">Virtual tour</span>
      </div>

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
  );
}
