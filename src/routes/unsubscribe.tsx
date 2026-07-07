import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

const searchSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({
    meta: [
      { title: "Unsubscribe | Pacific North Events & Tents" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: searchSchema,
  component: UnsubscribePage,
});

type State =
  | { kind: "loading" }
  | { kind: "confirm" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "success" }
  | { kind: "error"; message: string };

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
          setState({ kind: "invalid" });
          return;
        }
        if (body.valid) setState({ kind: "confirm" });
        else if (body.reason === "already_unsubscribed") setState({ kind: "already" });
        else setState({ kind: "invalid" });
      })
      .catch(() => setState({ kind: "invalid" }));
  }, [token]);

  async function confirm() {
    if (!token) return;
    setState({ kind: "loading" });
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.success) setState({ kind: "success" });
      else if (body.reason === "already_unsubscribed") setState({ kind: "already" });
      else setState({ kind: "error", message: body.error ?? "Something went wrong" });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Something went wrong" });
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="font-serif text-3xl text-primary">Unsubscribe</h1>
      {state.kind === "loading" && <p className="mt-4 text-muted-foreground">Loading…</p>}
      {state.kind === "confirm" && (
        <>
          <p className="mt-4 text-muted-foreground">
            Click below to stop receiving emails from Pacific North Events & Tents.
          </p>
          <button
            onClick={confirm}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Confirm unsubscribe
          </button>
        </>
      )}
      {state.kind === "already" && (
        <p className="mt-4 text-muted-foreground">You're already unsubscribed. No further emails will be sent.</p>
      )}
      {state.kind === "success" && (
        <p className="mt-4 text-muted-foreground">You've been unsubscribed. Sorry to see you go.</p>
      )}
      {state.kind === "invalid" && (
        <p className="mt-4 text-muted-foreground">This link is invalid or has expired.</p>
      )}
      {state.kind === "error" && (
        <p className="mt-4 text-destructive">{state.message}</p>
      )}
    </main>
  );
}
