import { useEffect, useRef, useState } from "react";
import openingVideo from "@/assets/opening-video.mp4";

const FALLBACK_MS = 15000;
const MAX_PLAY_MS = 10000;
const VIDEO_SEEN_KEY = "pacificNorthIntroVideoSeen";

export function OpeningVideoSplash() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishedRef = useRef(false);
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return !sessionStorage.getItem(VIDEO_SEEN_KEY);
  });
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!visible) {
      // Notify popup that video phase is "done" immediately.
      window.dispatchEvent(new Event("pn:intro-video-done"));
      return;
    }
    const video = videoRef.current;
    if (!video) return;

    const fallback = window.setTimeout(() => finish(), FALLBACK_MS);
    const maxPlay = window.setTimeout(() => finish(), MAX_PLAY_MS);

    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {
        window.setTimeout(() => finish(), 1200);
      });
    });

    return () => {
      window.clearTimeout(fallback);
      window.clearTimeout(maxPlay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try { sessionStorage.setItem(VIDEO_SEEN_KEY, "1"); } catch {}
    setExiting(true);
    window.setTimeout(() => {
      setVisible(false);
      window.dispatchEvent(new Event("pn:intro-video-done"));
    }, 700);
  }

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary/95 transition-opacity duration-700 ${
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Opening video"
      onClick={(e) => {
        // Tap on backdrop (anywhere outside the video) dismisses on mobile.
        if (e.target === e.currentTarget) finish();
      }}
      style={{ height: "100svh" }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pb-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80 sm:text-xs">
          Pacific North Events &amp; Tents
        </div>
        <button
          type="button"
          onClick={finish}
          aria-label="Skip intro video"
          className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur transition-all hover:bg-black/60"
        >
          Skip
        </button>
      </div>
      <video
        ref={videoRef}
        src={openingVideo}
        className="h-auto w-full max-h-[100svh] object-contain sm:rounded-2xl sm:max-h-[90vh] sm:max-w-[90vw]"
        autoPlay
        playsInline
        preload="auto"
        onEnded={finish}
      />
    </div>
  );
}
