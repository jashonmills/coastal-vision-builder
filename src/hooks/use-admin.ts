import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export function useIsAdmin() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["is-admin", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  useEffect(() => {
    if (!user) qc.removeQueries({ queryKey: ["is-admin"] });
  }, [user, qc]);

  return { isAdmin: !!q.data, loading: loading || q.isLoading };
}
