import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SaveSchema = z.object({
  title: z.string().min(1).max(200),
  event_date: z.string().optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  input: z.unknown(),
  recommendation: z.unknown(),
  blueprint_image: z.string().nullable().optional(),
  contact: z.unknown().optional(),
});

export const saveRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("saved_recommendations")
      .insert({
        user_id: userId,
        title: data.title,
        event_date: data.event_date ?? null,
        location: data.location ?? null,
        input: data.input as object,
        recommendation: data.recommendation as object,
        blueprint_image: data.blueprint_image ?? null,
        contact: (data.contact ?? null) as object | null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listMyRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("saved_recommendations")
      .select("id, title, event_date, location, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const getRecommendation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("saved_recommendations")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("saved_recommendations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
