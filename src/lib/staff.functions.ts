import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Coerce empty strings to null so optional fields don't trip Zod validators.
const emptyToNull = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), z.string().max(max).nullable().optional());

const StaffSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  email: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.string().email().max(255).nullable().optional(),
  ),
  phone: emptyToNull(50),
  role: emptyToNull(100),
  color: emptyToNull(20),
  notes: emptyToNull(2000),
  active: z.boolean().optional(),
});

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("staff")
      .select("*")
      .order("active", { ascending: false })
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StaffSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      role: data.role ?? null,
      color: data.color ?? null,
      notes: data.notes ?? null,
      active: data.active ?? true,
    };
    if (data.id) {
      const { error } = await context.supabase.from("staff").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("staff")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("staff").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
