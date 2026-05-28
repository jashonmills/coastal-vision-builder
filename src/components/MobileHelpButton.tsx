import { useEffect, useId, useRef, useState } from "react";
import { HelpCircle, ChevronRight, MessageCircle } from "lucide-react";

/**
 * Mobile-only floating Help button that opens a small menu with two actions:
 *  - Text Accessibility (opens the existing AccessibilityFontButton panel)
 *  - Planning Help Chat (opens the existing ChatWidget)
 *
 * Communicates with those existing components via window CustomEvents
 * ("open-accessibility-panel", "open-chat-widget").
 *
 * Hidden on lg+ — desktop continues to show the original two floating buttons.
 */
export function MobileHelpButton() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
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

  function openAccessibility() {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("open-accessibility-panel"));
  }

  function openChat() {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("open-chat-widget"));
  }

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open help and accessibility options"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="fixed left-4 z-[90] inline-flex h-11 min-w-[44px] items-center gap-1.5 rounded-full bg-primary px-3.5 text-[color:var(--sand)] shadow-lg ring-1 ring-[color:var(--gold)]/30 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
        style={{ bottom: "calc(92px + env(safe-area-inset-bottom))" }}
      >
        <HelpCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Help</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Help and accessibility menu"
          className="fixed left-4 z-[91] w-[320px] max-w-[calc(100vw-32px)] rounded-2xl border border-border bg-[color:var(--sand)] p-3 shadow-2xl"
          style={{ bottom: "calc(148px + env(safe-area-inset-bottom))" }}
        >
          <div className="px-2 pt-1 pb-2">
            <h2 className="font-serif text-base text-primary">Need help?</h2>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={openAccessibility}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--seafoam,#9cc7bd)]/30 font-serif text-base font-semibold text-primary"
              >
                Aa
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-primary">Text Accessibility</span>
                <span className="block text-xs text-muted-foreground">Choose an easier-to-read font</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            <div className="mx-2 h-px bg-border/60" />

            <button
              type="button"
              onClick={openChat}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--seafoam,#9cc7bd)]/30 text-primary"
              >
                <MessageCircle className="h-5 w-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-primary">Planning Help Chat</span>
                <span className="block text-xs text-muted-foreground">Ask questions about tents, rentals, and quotes</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </div>

          {/* Pointer triangle connecting to button */}
          <div
            aria-hidden="true"
            className="absolute h-3 w-3 rotate-45 border-b border-r border-border bg-[color:var(--sand)]"
            style={{ left: "28px", bottom: "-7px" }}
          />
        </div>
      )}
    </div>
  );
}
