import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const MAX_ACTIVE_PLANS = 3;

const SaveSchema = z.object({
  title: z.string().min(1).max(200),
  event_date: z.string().optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  input: z.unknown(),
  recommendation: z.unknown(),
  blueprint_image: z.string().nullable().optional(),
  perspective_image: z.string().nullable().optional(),
  contact: z.unknown().optional(),
});

export const saveRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Enforce 3-active-plan cap server-side.
    const { count, error: countErr } = await supabase
      .from("saved_recommendations")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) >= MAX_ACTIVE_PLANS) {
      throw new Error(
        `You already have ${MAX_ACTIVE_PLANS} saved plans. Please delete one before creating another.`
      );
    }

    const { data: row, error } = await supabase
      .from("saved_recommendations")
      .insert({
        user_id: userId,
        title: data.title,
        event_date: data.event_date ?? null,
        location: data.location ?? null,
        input: data.input as never,
        recommendation: data.recommendation as never,
        blueprint_image: data.blueprint_image ?? null,
        perspective_image: data.perspective_image ?? null,
        contact: (data.contact ?? null) as never,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Admin email notification for a new saved AI plan (best-effort)
    try {
      const { sendAdminEmail } = await import("@/lib/email/send-admin.server");
      const rec = data.recommendation as
        | {
            headline?: string;
            tent_size?: string;
            layout_caption?: string;
            picks?: Array<{ category: string; item_name: string; quantity: number; reason?: string }>;
            weather_notes?: string[];
          }
        | null
        | undefined;
      const input = data.input as
        | { eventType?: string; guestCount?: number }
        | null
        | undefined;
      const contact = data.contact as
        | { name?: string; email?: string }
        | null
        | undefined;
      const recommendedTent =
        rec?.picks?.find((p) => p.category === "Canopy")?.item_name ?? null;
      await sendAdminEmail({
        templateName: "admin-planner-submission",
        idempotencyKey: `planner-submission-${row.id}`,
        templateData: {
          recommendationId: row.id,
          title: data.title,
          customerName: contact?.name ?? null,
          customerEmail: contact?.email ?? null,
          eventType: input?.eventType ?? null,
          eventDate: data.event_date ?? null,
          eventLocation: data.location ?? null,
          guestCount: input?.guestCount ?? null,
          headline: rec?.headline ?? null,
          recommendedTent,
          tentSize: rec?.tent_size ?? null,
          layoutCaption: rec?.layout_caption ?? null,
          picks: rec?.picks ?? [],
          weatherNotes: rec?.weather_notes ?? [],
          blueprintImage: data.blueprint_image ?? null,
          perspectiveImage: data.perspective_image ?? null,
        },
      });
    } catch (e) {
      console.error("[saveRecommendation] admin email failed", e);
    }

    return { id: row.id };
  });


export const listMyRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("saved_recommendations")
      .select("id, title, event_date, location, created_at, status, quote_requested_at")
      .is("deleted_at", null)
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
      .is("deleted_at", null)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("saved_recommendations")
      .update({ deleted_at: new Date().toISOString(), status: "archived" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const requestQuoteForRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      note: z.string().max(2000).optional().nullable(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: existing, error: readErr } = await supabase
      .from("saved_recommendations")
      .select("id, status, quote_requested_at")
      .eq("id", data.id)
      .is("deleted_at", null)
      .single();
    if (readErr) throw new Error(readErr.message);
    if (existing.quote_requested_at || existing.status === "quote_requested" || existing.status === "quote_sent" || existing.status === "booked") {
      throw new Error("This plan has already been sent for a quote.");
    }
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("saved_recommendations")
      .update({
        status: "quote_requested",
        quote_requested_at: now,
        quote_request_note: data.note ?? null,
        quote_request_email_sent_at: now,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, quote_requested_at: now };
  });
