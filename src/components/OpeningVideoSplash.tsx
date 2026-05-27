import { useEffect, useRef, useState } from "react";
import openingVideo from "@/assets/opening-video.mp4";

const FALLBACK_MS = 15000;

export function OpeningVideoSplash() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const fallback = window.setTimeout(() => finish(), FALLBACK_MS);

    // Try unmuted first, fallback to muted if autoplay policy blocks it
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {
        window.setTimeout(() => finish(), 1200);
      });
    });

    return () => window.clearTimeout(fallback);
  }, []);

  function finish() {
    if (exiting) return;
    
    setExiting(true);
    window.setTimeout(() => setVisible(false), 900);
  }

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-primary transition-opacity duration-700 ${
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-label="Opening video"
    >
      <video
        ref={videoRef}
        src={openingVideo}
        className="h-full w-full object-cover"
        autoPlay
        playsInline
        preload="auto"
        onEnded={finish}
      />
    </div>
  );
}