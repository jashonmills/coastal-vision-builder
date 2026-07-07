import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2, Maximize2, Minimize2, RotateCcw } from "lucide-react";

type Props = {
  image: string;
  label: string;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export function FlatPanoramaViewer({ image, label }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // View state, held in refs so pointer/wheel handlers don't rebind constantly.
  const stateRef = useRef({
    natW: 0,
    natH: 0,
    frameW: 0,
    frameH: 0,
    baseScale: 1, // scale that makes image height fill the frame
    zoom: 1, // multiplier on baseScale; 1 = fit-height, MAX_ZOOM = zoomed in
    offsetX: 0,
    offsetY: 0,
  });

  // Reset load state whenever image src changes.
  useEffect(() => {
    setReady(false);
    setError(false);
  }, [image]);

  // Fullscreen tracking.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onFs = () =>
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Clamp offsets to keep the scaled image edges against/inside the frame.
  const clamp = () => {
    const s = stateRef.current;
    const scaledW = s.natW * s.baseScale * s.zoom;
    const scaledH = s.natH * s.baseScale * s.zoom;
    // Horizontal: image is at least as wide as frame at baseline (usually wider);
    // if narrower, center it.
    if (scaledW <= s.frameW) {
      s.offsetX = (s.frameW - scaledW) / 2;
    } else {
      const minX = s.frameW - scaledW;
      if (s.offsetX > 0) s.offsetX = 0;
      if (s.offsetX < minX) s.offsetX = minX;
    }
    // Vertical: at baseline zoom scaledH == frameH so this centers to 0.
    if (scaledH <= s.frameH) {
      s.offsetY = (s.frameH - scaledH) / 2;
    } else {
      const minY = s.frameH - scaledH;
      if (s.offsetY > 0) s.offsetY = 0;
      if (s.offsetY < minY) s.offsetY = minY;
    }
  };

  const applyTransform = () => {
    const img = imgRef.current;
    if (!img) return;
    const s = stateRef.current;
    const scale = s.baseScale * s.zoom;
    img.style.transform = `translate3d(${s.offsetX}px, ${s.offsetY}px, 0) scale(${scale})`;
    img.style.transformOrigin = "0 0";
  };

  const recomputeBase = () => {
    const s = stateRef.current;
    const el = containerRef.current;
    if (!el || !s.natW || !s.natH) return;
    s.frameW = el.clientWidth;
    s.frameH = el.clientHeight;
    // Base scale = fit the image to frame height (no black bars top/bottom).
    s.baseScale = s.frameH / s.natH;
    clamp();
    applyTransform();
  };

  // Recompute on resize.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => recomputeBase());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset view when scene changes.
  useEffect(() => {
    const s = stateRef.current;
    s.zoom = 1;
    s.offsetX = 0;
    s.offsetY = 0;
  }, [image]);

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const s = stateRef.current;
    s.natW = img.naturalWidth;
    s.natH = img.naturalHeight;
    s.zoom = 1;
    s.offsetX = 0;
    s.offsetY = 0;
    recomputeBase();
    setReady(true);
  };

  // Pointer drag.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const s = stateRef.current;
      s.offsetX += dx;
      s.offsetY += dy;
      clamp();
      applyTransform();
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      el.style.cursor = "grab";
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onUp);
    };
  }, []);

  // Wheel + pinch zoom (zoom around pointer).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const zoomAt = (clientX: number, clientY: number, factor: number) => {
      const rect = el.getBoundingClientRect();
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;
      const s = stateRef.current;
      const prev = s.zoom;
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * factor));
      if (next === prev) return;
      // Keep the pixel under (cx, cy) fixed.
      const ratio = next / prev;
      s.offsetX = cx - (cx - s.offsetX) * ratio;
      s.offsetY = cy - (cy - s.offsetY) * ratio;
      s.zoom = next;
      clamp();
      applyTransform();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
      zoomAt(e.clientX, e.clientY, factor);
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    // Pinch: track two touches.
    let pinchDist = 0;
    let pinchCx = 0;
    let pinchCy = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        pinchDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        pinchCx = (a.clientX + b.clientX) / 2;
        pinchCy = (a.clientY + b.clientY) / 2;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchDist > 0) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const factor = d / pinchDist;
        zoomAt(pinchCx, pinchCy, factor);
        pinchDist = d;
        pinchCx = (a.clientX + b.clientX) / 2;
        pinchCy = (a.clientY + b.clientY) / 2;
      }
    };
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const reset = () => {
    const s = stateRef.current;
    s.zoom = 1;
    s.offsetX = 0;
    s.offsetY = 0;
    clamp();
    applyTransform();
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full select-none overflow-hidden bg-[#0b1720]"
      style={{ cursor: "grab", touchAction: "none" }}
      role="img"
      aria-label={`Panorama: ${label}. Drag to pan, scroll to zoom.`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={image}
        alt={label}
        onLoad={onImgLoad}
        onError={() => setError(true)}
        draggable={false}
        loading="eager"
        decoding="async"
        className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
        style={{ transformOrigin: "0 0", willChange: "transform" }}
      />

      {!ready && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-white/85">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-xs font-medium uppercase tracking-widest">Loading view</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-destructive">
          Failed to load panorama image.
        </div>
      )}

      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          onClick={reset}
          aria-label="Reset view"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/65"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/65"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-white/90 backdrop-blur">
        Drag to pan • Scroll to zoom
      </div>
    </div>
  );
}
