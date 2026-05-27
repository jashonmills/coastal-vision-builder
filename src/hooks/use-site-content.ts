import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Row = { key: string; value: { text?: string; url?: string } };

export function useAllSiteContent() {
  return useQuery({
    queryKey: ["site-content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_content").select("key,value");
      if (error) throw error;
      const map: Record<string, { text?: string; url?: string }> = {};
      for (const r of (data ?? []) as Row[]) map[r.key] = r.value ?? {};
      return map;
    },
    staleTime: 30_000,
  });
}

export function useSlotText(key: string, fallback: string) {
  const { data } = useAllSiteContent();
  return data?.[key]?.text ?? fallback;
}

export function useSlotImage(key: string, fallback?: string) {
  const { data } = useAllSiteContent();
  return data?.[key]?.url ?? fallback;
}

export function useSaveSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: { text?: string; url?: string } }) => {
      const { error } = await supabase.from("site_content").upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-content"] }),
  });
}
