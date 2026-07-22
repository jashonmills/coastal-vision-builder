import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Check, Sparkles, X } from "lucide-react";

const DISMISS_KEY = "pacificNorthTentPlannerPopupDismissed";
const VIDEO_SEEN_KEY = "pacificNorthIntroVideoSeen";
const POPUP_DELAY_MS = 3000;

export function AITentPlannerPopup() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    let timer: number | undefined;
    let fallback: number | undefined;
    let triggered = false;

    const openOnce = () => {
      if (triggered) return;
      triggered = true;
      if (timer) window.clearTimeout(timer);
      if (fallback) window.clearTimeout(fallback);
      setOpen(true);
    };

    const schedule = (delay: number) => {
      if (triggered) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(openOnce, delay);
    };

    const videoSeen = sessionStorage.getItem(VIDEO_SEEN_KEY);
    if (videoSeen) {
      schedule(POPUP_DELAY_MS);
      return () => { if (timer) window.clearTimeout(timer); };
    }

    const onVideoDone = () => schedule(POPUP_DELAY_MS);
    window.addEventListener("pn:intro-video-done", onVideoDone, { once: true });
    fallback = window.setTimeout(openOnce, 18000);
    return () => {
      window.removeEventListener("pn:intro-video-done", onVideoDone);
      if (timer) window.clearTimeout(timer);
      if (fallback) window.clearTimeout(fallback);
    };
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

  const bulletKeys = ["tentSize", "equipment", "blueprint", "quote"];

  return (
    <div
      className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-primary/70 p-4 pt-16 backdrop-blur-sm animate-in fade-in duration-300 sm:items-center sm:pt-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tent-planner-popup-title"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div className="relative my-auto w-full max-w-sm overflow-hidden rounded-2xl border border-[color:var(--gold)]/30 bg-[#fbf6ee] shadow-2xl animate-in zoom-in-95 duration-300 sm:max-w-md sm:rounded-3xl">
        <button
          ref={closeBtnRef}
          type="button"
          onClick={dismiss}
          aria-label={t("plannerPopup.close")}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground sm:right-4 sm:top-4 sm:h-9 sm:w-9"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-5 pb-6 pt-7 text-center sm:px-9 sm:pb-7 sm:pt-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--seafoam,#9cc7bd)]/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-3 w-3" /> {t("plannerPopup.badge")}
          </span>

          <PopupIllustration />

          <h2 id="tent-planner-popup-title" className="mt-2 font-serif text-2xl leading-[1.1] text-primary sm:mt-3 sm:text-[2rem]">
            {t("plannerPopup.title")}
          </h2>

          <div className="mx-auto mt-4 h-px w-12 bg-[color:var(--gold)]/60" />

          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground sm:mt-5">
            {t("plannerPopup.body")}
          </p>

          <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left sm:mt-6 sm:space-y-2.5">
            {bulletKeys.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-foreground sm:gap-2.5">
                <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[color:var(--seafoam,#9cc7bd)]/40 text-primary">
                  <Check className="h-3 w-3" />
                </span>
                <span>{t(`plannerPopup.bullets.${b}`)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col items-center gap-2.5 sm:mt-7 sm:gap-3">
            <Link
              to="/ai-tent-planner"
              onClick={dismiss}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg ring-1 ring-[color:var(--gold)]/40 transition-all hover:-translate-y-0.5 hover:bg-[color:var(--navy-soft,#1e293b)] sm:px-7 sm:py-3.5"
            >
              <Sparkles className="h-4 w-4 text-[color:var(--gold)]" />
              {t("plannerPopup.primaryCta")}
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("plannerPopup.secondaryCta")}
            </button>
          </div>

          <div className="mx-auto mt-6 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[color:var(--gold)]">✦</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            {t("plannerPopup.note")}
          </p>
        </div>
      </div>
    </div>
  );
}

function PopupIllustration() {
  const navy = "#1e2a44";
  const navySoft = "#3a4a6b";
  const seafoam = "#9cc7bd";
  const sand = "#d9c8a3";
  const gold = "#c9a84c";
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto mt-4 h-[90px] w-full overflow-hidden rounded-lg bg-gradient-to-b from-[#f3ecdc]/60 to-transparent sm:mt-5 sm:h-[130px] sm:rounded-xl"
    >
      <svg
        viewBox="0 0 360 130"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="bpgrid" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M12 0H0V12" fill="none" stroke={navy} strokeOpacity="0.06" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="360" height="130" fill="url(#bpgrid)" />

        {/* Left: faded tree silhouette */}
        <g opacity="0.35">
          <ellipse cx="40" cy="60" rx="22" ry="32" fill={seafoam} opacity="0.5" />
          <ellipse cx="32" cy="50" rx="14" ry="20" fill={seafoam} opacity="0.4" />
          <rect x="38" y="80" width="3" height="28" fill={navySoft} opacity="0.6" />
        </g>

        {/* Center: line-art high-peak tent */}
        <g fill="none" stroke={navy} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          {/* Guy lines */}
          <line x1="90" y1="95" x2="115" y2="40" opacity="0.4" />
          <line x1="240" y1="95" x2="215" y2="40" opacity="0.4" />
          {/* Tent peaks */}
          <path d="M95 95 Q120 80 130 50 L130 35" />
          <path d="M130 35 Q150 22 165 35" />
          <path d="M165 35 L165 50 Q175 80 200 90" />
          <path d="M165 35 Q185 22 200 35" />
          <path d="M200 35 L200 50 Q210 80 235 95" />
          {/* Roof scallops */}
          <path d="M95 95 Q120 85 165 88 Q210 85 235 95" />
          {/* Base line */}
          <line x1="90" y1="95" x2="240" y2="95" strokeWidth="1.4" />
          {/* Support poles */}
          <line x1="110" y1="95" x2="110" y2="78" opacity="0.5" />
          <line x1="220" y1="95" x2="220" y2="78" opacity="0.5" />
          <line x1="165" y1="95" x2="165" y2="50" opacity="0.5" />
          {/* Flags */}
          <line x1="130" y1="35" x2="130" y2="22" />
          <path d="M130 22 L140 25 L130 28 Z" fill={gold} stroke="none" />
          <line x1="165" y1="22" x2="165" y2="10" />
          <path d="M165 10 L175 13 L165 16 Z" fill={gold} stroke="none" />
          <line x1="200" y1="35" x2="200" y2="22" />
          <path d="M200 22 L210 25 L200 28 Z" fill={gold} stroke="none" />
          {/* Tiny figures/tables inside */}
          <circle cx="135" cy="90" r="2" fill={navy} stroke="none" opacity="0.5" />
          <circle cx="160" cy="90" r="2" fill={navy} stroke="none" opacity="0.5" />
          <circle cx="190" cy="90" r="2" fill={navy} stroke="none" opacity="0.5" />
          <circle cx="215" cy="90" r="2" fill={navy} stroke="none" opacity="0.5" />
        </g>

        {/* Sand accent rule under tent */}
        <line x1="80" y1="105" x2="250" y2="105" stroke={sand} strokeWidth="0.8" opacity="0.7" />

        {/* Right: blueprint inset */}
        <g transform="translate(270, 28)" fill="none" stroke={navy} strokeWidth="0.9">
          <rect x="0" y="0" width="70" height="70" stroke={navy} strokeOpacity="0.6" />
          {/* Dimension top */}
          <line x1="0" y1="-6" x2="70" y2="-6" strokeOpacity="0.5" strokeWidth="0.6" />
          <path d="M0 -8 L0 -4 M70 -8 L70 -4" strokeOpacity="0.5" strokeWidth="0.6" />
          {/* Dimension right */}
          <line x1="76" y1="0" x2="76" y2="70" strokeOpacity="0.5" strokeWidth="0.6" />
          <path d="M74 0 L78 0 M74 70 L78 70" strokeOpacity="0.5" strokeWidth="0.6" />
          {/* 4 round tables */}
          {[
            [18, 18],
            [52, 18],
            [18, 52],
            [52, 52],
          ].map(([cx, cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="8" stroke={navy} strokeOpacity="0.7" />
              {[0, 60, 120, 180, 240, 300].map((deg) => {
                const r = (deg * Math.PI) / 180;
                const x1 = cx + Math.cos(r) * 9.5;
                const y1 = cy + Math.sin(r) * 9.5;
                const x2 = cx + Math.cos(r) * 11.5;
                const y2 = cy + Math.sin(r) * 11.5;
                return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={navy} strokeOpacity="0.55" strokeWidth="0.7" />;
              })}
            </g>
          ))}
        </g>
        {/* Inset label */}
        <text x="305" y="20" fontSize="6" fill={navy} fillOpacity="0.55" textAnchor="middle" fontFamily="ui-sans-serif, system-ui">
          20' × 20'
        </text>
      </svg>
    </div>
  );
}
