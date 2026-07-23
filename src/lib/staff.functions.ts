import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admins.functions";

// Coerce empty strings to null so optional fields don't trip Zod validators.
const emptyToNull = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), z.string().max(max).nullable().optional());

export const ALLOWED_STAFF_ROLES = [
  "driver",
  "assembler",
  "bartender",
  "server",
  "chef",
  "coordinator",
  "other",
] as const;
export type StaffRole = (typeof ALLOWED_STAFF_ROLES)[number];

const StaffSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  email: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.string().email().max(255).nullable().optional(),
  ),
  phone: emptyToNull(50),
  role: emptyToNull(100),
  roles: z.array(z.enum(ALLOWED_STAFF_ROLES)).optional(),
  color: emptyToNull(20),
  notes: emptyToNull(2000),
  active: z.boolean().optional(),
});

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
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
    await assertAdmin(context.userId);
    const payload: Record<string, unknown> = {
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      role: data.role ?? null,
      color: data.color ?? null,
      notes: data.notes ?? null,
      active: data.active ?? true,
    };
    if (data.roles) payload.roles = data.roles;
    if (data.id) {
      const { error } = await context.supabase.from("staff").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("staff")
      .insert(payload as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await context.supabase.from("staff").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Staff-self reads (not admin-gated) ----------

export const getMyStaffProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("staff")
      .select("*")
      .eq("user_id", context.userId)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  });

// ---------- Invite / link a staff user ----------

export const inviteStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        staff_id: z.string().uuid(),
        email: z.string().trim().toLowerCase().email().max(255),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find existing user by email
    let existingUserId: string | null = null;
    for (let page = 1; page <= 20 && !existingUserId; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw new Error(error.message);
      const match = list.users.find((u) => u.email?.toLowerCase() === data.email);
      if (match) existingUserId = match.id;
      if (!list.users.length || list.users.length < 200) break;
    }

    let invited = false;
    if (!existingUserId) {
      const siteUrl =
        process.env.SITE_URL ||
        process.env.PUBLIC_SITE_URL ||
        "https://www.pacificnorthrentals.com";
      const redirectTo = `${siteUrl.replace(/\/$/, "")}/accept-invite`;
      const { data: inv, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        data.email,
        { redirectTo },
      );
      if (error) throw new Error(error.message);
      existingUserId = inv.user?.id ?? null;
      invited = true;
      if (!existingUserId) throw new Error("Failed to create invited user");
    }

    const { error: updErr } = await supabaseAdmin
      .from("staff")
      .update({ user_id: existingUserId, email: data.email })
      .eq("id", data.staff_id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true, invited, user_id: existingUserId };
  });
