// Server-only helpers for the customers CRM entity.
// Uses supabaseAdmin — callers must be admin-gated OR this must be used
// in best-effort background paths on existing public endpoints.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type UpsertInput = {
  email: string;
  name?: string | null;
  phone?: string | null;
  user_id?: string | null;
  lifecycle_stage?: "lead" | "quoted" | "booked" | "repeat" | "archived";
};

/**
 * Find-or-create a customer by lower(email). Best-effort — returns null on
 * any failure so callers can safely ignore. When the customer exists, refreshes
 * name/phone (only if provided and current value is null) and always bumps
 * last_activity_at. Optionally promotes lifecycle_stage forward.
 */
export async function upsertCustomerByEmail(
  input: UpsertInput,
): Promise<string | null> {
  const email = (input.email ?? "").trim();
  if (!email) return null;
  const emailLc = email.toLowerCase();
  try {
    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id, name, phone, user_id, lifecycle_stage")
      .ilike("email", emailLc)
      .maybeSingle();

    if (existing?.id) {
      const patch: {
        last_activity_at: string;
        name?: string;
        phone?: string;
        user_id?: string;
        lifecycle_stage?: "lead" | "quoted" | "booked" | "repeat" | "archived";
      } = { last_activity_at: new Date().toISOString() };
      if (input.name && !existing.name) patch.name = input.name;
      if (input.phone && !existing.phone) patch.phone = input.phone;
      if (input.user_id && !existing.user_id) patch.user_id = input.user_id;
      if (input.lifecycle_stage) {
        const order = ["lead", "quoted", "booked", "repeat"];
        const cur = order.indexOf(existing.lifecycle_stage ?? "lead");
        const nxt = order.indexOf(input.lifecycle_stage);
        if (nxt > cur && existing.lifecycle_stage !== "archived") {
          patch.lifecycle_stage = input.lifecycle_stage;
        }
      }
      await supabaseAdmin.from("customers").update(patch).eq("id", existing.id);
      return existing.id;
    }

    const { data: created, error } = await supabaseAdmin
      .from("customers")
      .insert({
        email,
        name: input.name ?? null,
        phone: input.phone ?? null,
        user_id: input.user_id ?? null,
        lifecycle_stage: input.lifecycle_stage ?? "lead",
      })
      .select("id")
      .single();
    if (error) {
      // Unique-index race: someone inserted concurrently — re-read.
      const { data: raced } = await supabaseAdmin
        .from("customers")
        .select("id")
        .ilike("email", emailLc)
        .maybeSingle();
      return raced?.id ?? null;
    }
    return created.id;
  } catch (e) {
    console.warn("[upsertCustomerByEmail] failed", e);
    return null;
  }
}
