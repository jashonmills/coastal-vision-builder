import { useSyncExternalStore } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { session: Session | null; user: User | null; loading: boolean };

let state: AuthState = { session: null, user: null, loading: true };
const listeners = new Set<() => void>();
let initialized = false;

function setState(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  supabase.auth.onAuthStateChange((_e, s) => {
    setState({ session: s, user: s?.user ?? null, loading: false });
  });
  supabase.auth.getSession().then(({ data }) => {
    setState({ session: data.session, user: data.session?.user ?? null, loading: false });
  });
}

const serverSnapshot: AuthState = { session: null, user: null, loading: true };

export function useAuth() {
  init();
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => serverSnapshot,
  );
}
