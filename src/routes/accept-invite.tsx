import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/accept-invite")({
  head: () => ({ meta: [{ title: "Set your password | Pacific North Rentals" }] }),
  component: AcceptInvitePage,
});

export function AcceptInvitePage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<"invite" | "recovery" | "signup" | "other">("other");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Read link type from hash (#type=invite&access_token=...) or query (?type=...)
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);
    const type = (hashParams.get("type") || queryParams.get("type") || "") as string;
    if (type === "invite" || type === "recovery" || type === "signup") {
      setLinkType(type);
    }
    const hashError = hashParams.get("error_description") || queryParams.get("error_description");
    if (hashError) setError(decodeURIComponent(hashError.replace(/\+/g, " ")));

    // Supabase parses the hash and creates the session via onAuthStateChange
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) {
        setSessionEmail(s.user.email ?? null);
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setSessionEmail(data.session.user.email ?? null);
        setReady(true);
      } else {
        // Give Supabase a moment to process the hash, then flag if still empty
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: d2 }) => {
            if (!d2.session?.user) setReady(true); // ready=true but no email → show error UI
          });
        }, 800);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      // Decide destination based on admin role
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      let to = "/account";
      if (uid) {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: uid,
          _role: "admin",
        });
        if (isAdmin) to = "/admin";
      }
      setTimeout(() => navigate({ to }), 900);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const heading =
    linkType === "recovery"
      ? "Reset your password"
      : linkType === "invite"
        ? "Welcome — set your password"
        : "Set your password";

  return (
    <SiteLayout>
      <PageHero eyebrow="Account" title={heading} subtitle={sessionEmail ?? ""} />
      <section className="mx-auto max-w-md px-4 py-12 lg:px-8">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          {!ready ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !sessionEmail ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-destructive">
                {error ||
                  "This link is invalid or has expired. Ask an admin to resend the invitation, or request a new password reset."}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]"
              >
                Go to sign in
              </Link>
            </div>
          ) : done ? (
            <div className="space-y-3 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="font-serif text-lg text-primary">Password set</p>
              <p className="text-sm text-muted-foreground">Redirecting…</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">New password</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Confirm password</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {error && (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)] disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save password
              </button>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
