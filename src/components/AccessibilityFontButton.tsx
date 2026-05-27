import { useEffect, useId, useRef, useState } from "react";
import { Accessibility, RotateCcw, X } from "lucide-react";

const STORAGE_KEY = "pacificNorthPreferredFont";

type FontKey = "default" | "open-dyslexic" | "atkinson" | "lexend" | "verdana";

const FONT_STACKS: Record<FontKey, string> = {
  default: "",
  "open-dyslexic": '"OpenDyslexic", "Atkinson Hyperlegible", Verdana, sans-serif',
  atkinson: '"Atkinson Hyperlegible", Verdana, sans-serif',
  lexend: '"Lexend", Verdana, sans-serif',
  verdana: "Verdana, Geneva, sans-serif",
};

const OPTIONS: { key: FontKey; label: string }[] = [
  { key: "default", label: "Default" },
  { key: "open-dyslexic", label: "OpenDyslexic" },
  { key: "atkinson", label: "Atkinson Hyperlegible" },
  { key: "lexend", label: "Lexend" },
  { key: "verdana", label: "Verdana" },
];

function applyFont(key: FontKey) {
  const stack = FONT_STACKS[key];
  if (stack) {
    document.documentElement.style.setProperty("--accessibility-font", stack);
  } else {
    document.documentElement.style.removeProperty("--accessibility-font");
  }
}

export function AccessibilityFontButton() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FontKey>("default");
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  // Load saved preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as FontKey | null;
      if (saved && saved in FONT_STACKS) {
        setSelected(saved);
        applyFont(saved);
      }
    } catch {}
  }, []);

  // Focus panel on open, Escape to close
  useEffect(() => {
    if (!open) return;
    const firstRadio = panelRef.current?.querySelector<HTMLElement>('[role="radio"]');
    firstRadio?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current || !buttonRef.current) return;
      const t = e.target as Node;
      if (!panelRef.current.contains(t) && !buttonRef.current.contains(t)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  function choose(key: FontKey) {
    setSelected(key);
    applyFont(key);
    try { localStorage.setItem(STORAGE_KEY, key); } catch {}
  }

  function reset() {
    setSelected("default");
    applyFont("default");
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }


  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open accessibility font settings"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 left-6 z-[90] inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-[color:var(--sand)] shadow-lg ring-2 ring-transparent transition-all hover:-translate-y-0.5 hover:ring-[color:var(--gold)]/60 focus:outline-none focus-visible:ring-[color:var(--gold)] lg:bottom-6"
      >
        <Accessibility className="h-5 w-5" />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Text Accessibility"
          className="fixed bottom-40 left-6 z-[91] w-[320px] max-w-[calc(100vw-32px)] rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl lg:bottom-24"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-serif text-base text-primary">Text Accessibility</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Choose a font that feels easier to read.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close accessibility font settings"
              onClick={() => { setOpen(false); buttonRef.current?.focus(); }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div role="radiogroup" aria-label="Font choice" className="mt-3 space-y-1.5">
            {OPTIONS.map((opt) => {
              const isSel = selected === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="radio"
                  aria-checked={isSel}
                  onClick={() => choose(opt.key)}
                  style={{ fontFamily: FONT_STACKS[opt.key] || undefined }}
                  className={
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] " +
                    (isSel
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-secondary")
                  }
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={
                        "inline-block h-3 w-3 rounded-full border " +
                        (isSel ? "border-primary bg-primary" : "border-muted-foreground/50")
                      }
                    />
                    {opt.label}
                  </span>
                  {isSel && (
                    <span className="text-[10px] uppercase tracking-wider text-primary">Active</span>
                  )}
                </button>
              );
            })}
          </div>


          <button
            type="button"
            onClick={reset}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> Reset to Default
          </button>
        </div>
      )}
    </>
  );
}
