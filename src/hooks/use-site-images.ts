import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SiteImage } from "./site-images";

export type SiteImageRow = {
  id: string;
  category: string;
  url: string;
  alt: string;
  caption: string | null;
  sort_order: number;
};

/**
 * Fetches all non-archived admin-managed site images grouped by category.
 * Used to overlay/replace the static defaults exported from `site-images.ts`.
 */
export function useSiteImagesByCategory() {
  return useQuery({
    queryKey: ["site-images-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_images")
        .select("id,category,url,alt,caption,sort_order")
        .eq("archived", false)
        .order("category")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const map: Record<string, SiteImageRow[]> = {};
      for (const r of (data ?? []) as SiteImageRow[]) {
        (map[r.category] ??= []).push(r);
      }
      return map;
    },
    staleTime: 30_000,
  });
}

/** Convert admin rows into the SiteImage shape used by pages. */
export function rowsToSiteImages(rows: SiteImageRow[] | undefined): SiteImage[] {
  if (!rows) return [];
  return rows.map((r) => ({
    file: r.id,
    url: r.url,
    alt: r.alt || "",
    caption: r.caption ?? undefined,
  }));
}

/**
 * Merge admin-managed rows with static defaults. If admin has ANY rows for a
 * category, those replace the defaults entirely (admin has full control).
 * Otherwise the defaults are returned unchanged.
 */
export function mergeCategory(defaults: SiteImage[], rows: SiteImageRow[] | undefined): SiteImage[] {
  if (!rows || rows.length === 0) return defaults;
  return rowsToSiteImages(rows);
}
