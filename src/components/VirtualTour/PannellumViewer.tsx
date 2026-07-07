import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Scene } from "./scenes";

const PANNELLUM_JS = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
const PANNELLUM_CSS = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";

let loaderPromise: Promise<void> | null = null;

function loadPannellum(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.pannellum) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    // CSS
    if (!document.querySelector(`link[data-pannellum]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = PANNELLUM_CSS;
      link.setAttribute("data-pannellum", "");
      document.head.appendChild(link);
    }
    // JS
    const existing = document.querySelector<HTMLScriptElement>(`script[data-pannellum]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load pannellum")));
      return;
    }
    const script = document.createElement("script");
    script.src = PANNELLUM_JS;
    script.async = true;
    script.setAttribute("data-pannellum", "");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load pannellum"));
    document.head.appendChild(script);
  });

  return loaderPromise;
}

export function PannellumViewer({ scene }: { scene: Scene }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let destroyed = false;
    let viewer: { destroy: () => void } | null = null;
    setReady(false);
    setError(null);

    loadPannellum()
      .then(() => {
        if (destroyed || !containerRef.current || !window.pannellum) return;
        // Clear any previous viewer DOM
        containerRef.current.innerHTML = "";
        viewer = window.pannellum.viewer(containerRef.current, {
          type: "equirectangular",
          panorama: scene.image,
          autoLoad: true,
          showControls: true,
          showFullscreenCtrl: true,
          showZoomCtrl: true,
          compass: false,
          haov: scene.haov,
          vaov: scene.vaov,
          yaw: scene.yaw,
          pitch: scene.pitch,
          hfov: scene.hfov,
          minHfov: 50,
          maxHfov: 120,
        });
        viewer.on("load", () => {
          if (!destroyed) setReady(true);
        });
        viewer.on("error", (msg: unknown) => {
          if (!destroyed) setError(typeof msg === "string" ? msg : "Failed to load panorama");
        });
      })
      .catch((e: Error) => {
        if (!destroyed) setError(e.message);
      });

    return () => {
      destroyed = true;
      try {
        viewer?.destroy();
      } catch {
        /* ignore */
      }
    };
  }, [scene.id, scene.image, scene.haov, scene.vaov, scene.yaw, scene.pitch, scene.hfov]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="img"
        aria-label={`360 degree view: ${scene.label}. ${scene.description}`}
      />
      {!ready && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-primary/5">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-xs font-medium uppercase tracking-widest">Loading view</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 p-6 text-center text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
