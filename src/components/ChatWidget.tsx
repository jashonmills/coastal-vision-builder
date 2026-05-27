import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MessageCircle, X, Send, Phone } from "lucide-react";
import {
  PAGE_HINTS,
  QUICK_STARTS,
  type ChatAction,
} from "@/data/chatKnowledgeBase";
import {
  parseUserMessage,
  generateScriptedResponse,
  respondByIntent,
  type ScriptedIntent,
} from "@/data/chatEngine";
import { useAuth } from "@/hooks/use-auth";

type Msg = {
  id: string;
  role: "bot" | "user";
  text: string;
  actions?: ChatAction[];
};

const uid = () => Math.random().toString(36).slice(2, 10);

export function ChatWidget() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Page-aware opening message
  const pageHintKey = useMemo(() => {
    const hit = PAGE_HINTS.find((h) => h.match(router));
    return hit?.bodyKey;
  }, [router]);

  // Seed conversation when first opened
  useEffect(() => {
    if (!open || messages.length > 0) return;
    const seed: Msg[] = [
      { id: uid(), role: "bot", text: t("chat.opening") },
    ];
    if (pageHintKey) {
      seed.push({ id: uid(), role: "bot", text: t(pageHintKey) });
    }
    if (user) {
      seed.push({ id: uid(), role: "bot", text: t("chat.welcomeBack") });
    }
    setMessages(seed);
  }, [open, messages.length, pageHintKey, t, user]);

  // Auto-scroll on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  function botFromResponse(text: string, actions: ChatAction[]): Msg {
    // Inject saved-plans shortcut for logged-in users on quote/saved intents
    return { id: uid(), role: "bot", text, actions };
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Msg = { id: uid(), role: "user", text: trimmed };
    const parsed = parseUserMessage(trimmed);
    const resp = generateScriptedResponse(parsed);
    let actions = resp.actions;
    if (user && (parsed.intent === "quote_request" || parsed.intent === "saved_plans")) {
      actions = [{ label: "View My Plans", to: "/account" }, ...actions];
    }
    setMessages((m) => [...m, userMsg, botFromResponse(resp.text, actions)]);
    setInput("");
  }

  function handleQuick(intent: ScriptedIntent, label: string) {
    const resp = respondByIntent(intent);
    setMessages((m) => [
      ...m,
      { id: uid(), role: "user", text: label },
      botFromResponse(resp.text, resp.actions),
    ]);
  }

  return (
    <>
      {/* Floating button — bottom-right (accessibility uses bottom-left) */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("chat.buttonLabel")}
          className="fixed bottom-24 right-6 z-[90] inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-[color:var(--sand)] shadow-xl ring-2 ring-transparent transition-all hover:-translate-y-0.5 hover:ring-[color:var(--gold)]/60 focus:outline-none focus-visible:ring-[color:var(--gold)] lg:bottom-6"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden text-sm font-medium sm:inline">{t("chat.buttonLabel")}</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label={t("chat.header")}
          className="fixed bottom-24 right-4 z-[91] flex h-[min(560px,calc(100vh-140px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl lg:bottom-6 lg:right-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border bg-primary px-4 py-3 text-[color:var(--sand)]">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[color:var(--gold)]" />
                <h2 className="text-sm font-semibold">{t("chat.header")}</h2>
              </div>
              <p className="mt-0.5 text-xs text-[color:var(--sand)]/80">{t("chat.subheader")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("chat.close")}
              className="rounded-md p-1 text-[color:var(--sand)]/80 transition hover:bg-white/10 hover:text-[color:var(--sand)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
          </div>

          {/* Quick starts (always visible above input) */}
          <div className="flex flex-wrap gap-1.5 border-t border-border bg-muted/40 px-3 py-2">
            {QUICK_STARTS.map((q) => {
              const label = t(q.labelKey);
              const intent = (q.intent === "plan_event" ? "generic_event" : q.intent) as ScriptedIntent;
              return (
                <button
                  key={q.intent}
                  type="button"
                  onClick={() => handleQuick(intent, label)}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-foreground/80 transition hover:border-[color:var(--gold)] hover:text-foreground"
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 border-t border-border bg-background px-3 py-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chat.inputPlaceholder")}
              className="flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--gold)]"
            />
            <button
              type="submit"
              aria-label={t("chat.send")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[color:var(--sand)] transition hover:opacity-90 disabled:opacity-50"
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const { t } = useTranslation();
  const isBot = msg.role === "bot";
  return (
    <div className={isBot ? "flex justify-start" : "flex justify-end"}>
      <div
        className={
          isBot
            ? "max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm leading-relaxed text-foreground"
            : "max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm leading-relaxed text-[color:var(--sand)]"
        }
      >
        <p className="whitespace-pre-line">{msg.text}</p>
        {isBot && msg.actions && msg.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {msg.actions.map((a, i) => {
              const label = a.label ?? (a.labelKey ? t(a.labelKey) : "");
              const isTel = a.href?.startsWith("tel:");
              const cls =
                "inline-flex items-center gap-1 rounded-full border border-[color:var(--gold)]/40 bg-background px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:border-[color:var(--gold)] hover:bg-[color:var(--gold)]/10";
              if (a.href) {
                return (
                  <a key={i} href={a.href} className={cls}>
                    {isTel && <Phone className="h-3 w-3" />} {label}
                  </a>
                );
              }
              if (a.to) {
                return (
                  <Link key={i} to={a.to} className={cls}>
                    {label}
                  </Link>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Map intent → quick label key suffix used in i18n
function quickLabelKey(intent: string): string {
  switch (intent) {
    case "tent_size":     return "tentSize";
    case "plan_event":    return "planEvent";
    case "inventory":     return "rentals";
    case "beach_event":   return "beach";
    case "quote_request": return "quote";
    case "contact":       return "contact";
    default:              return intent;
  }
}
