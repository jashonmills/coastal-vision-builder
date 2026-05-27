import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Sparkles, X } from "lucide-react";

const DISMISS_KEY = "pacificNorthTentPlannerPopupDismissed";
const VIDEO_SEEN_KEY = "pacificNorthIntroVideoSeen";
const POPUP_DELAY_MS = 3000;

export function AITentPlannerPopup() {
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    let timer: number | undefined;

    const schedule = () => {
      timer = window.setTimeout(() => setOpen(true), POPUP_DELAY_MS);
    };

    // If the intro video is still showing, wait for it to finish.
    const videoSeen = sessionStorage.getItem(VIDEO_SEEN_KEY);
    if (videoSeen) {
      schedule();
    } else {
      const onVideoDone = () => schedule();
      window.addEventListener("pn:intro-video-done", onVideoDone, { once: true });
      // Safety net: if no video event arrives in 15s, show anyway.
      timer = window.setTimeout(() => setOpen(true), 18000);
      return () => {
        window.removeEventListener("pn:intro-video-done", onVideoDone);
        if (timer) window.clearTimeout(timer);
      };
    }

    return () => { if (timer) window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setOpen(false);
  }

  if (!open) return null;

  const bullets = [
    "Tent size recommendation",
    "Tables, chairs, staging, lighting & extras",
    "Blueprint-style setup",
    "Quote-ready plan",
  ];

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-primary/70 p-4 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tent-planner-popup-title"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[color:var(--gold)]/30 bg-[#fbf6ee] shadow-2xl animate-in zoom-in-95 duration-300">
        <button
          ref={closeBtnRef}
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-7 pb-7 pt-9 text-center sm:px-9 sm:pt-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--seafoam,#9cc7bd)]/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-3 w-3" /> New Free Tool
          </span>

          <h2 id="tent-planner-popup-title" className="mt-5 font-serif text-3xl leading-[1.1] text-primary sm:text-[2rem]">
            Not Sure What Size<br />Tent You Need?
          </h2>

          <div className="mx-auto mt-4 h-px w-12 bg-[color:var(--gold)]/60" />

          <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Try our free AI Tent Planner and get a custom tent size recommendation, equipment checklist, and blueprint-style event layout in minutes.
          </p>

          <ul className="mx-auto mt-6 max-w-xs space-y-2.5 text-left">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-foreground">
                <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[color:var(--seafoam,#9cc7bd)]/40 text-primary">
                  <Check className="h-3 w-3" />
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col items-center gap-3">
            <Link
              to="/ai-tent-planner"
              onClick={dismiss}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg ring-1 ring-[color:var(--gold)]/40 transition-all hover:-translate-y-0.5 hover:bg-[color:var(--navy-soft,#1e293b)]"
            >
              <Sparkles className="h-4 w-4 text-[color:var(--gold)]" />
              Start My Free Tent Plan
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Maybe Later
            </button>
          </div>

          <div className="mx-auto mt-6 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[color:var(--gold)]">✦</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Perfect for weddings, fundraisers, festivals,<br />private parties, and corporate events.
          </p>
        </div>
      </div>
    </div>
  );
}
