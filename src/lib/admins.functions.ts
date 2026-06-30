import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id, created_at")
      .eq("role", "admin")
      .order("created_at");
    if (error) throw new Error(error.message);

    const results: Array<{
      id: string;
      user_id: string;
      email: string | null;
      display_name: string | null;
      created_at: string;
      is_self: boolean;
      active: boolean;
      last_sign_in_at: string | null;
    }> = [];
    for (const r of roles ?? []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      const meta = u?.user?.user_metadata as
        | { display_name?: string; full_name?: string }
        | undefined;
      const confirmedAt = u?.user?.email_confirmed_at ?? null;
      const lastSignIn = u?.user?.last_sign_in_at ?? null;
      results.push({
        id: r.id,
        user_id: r.user_id,
        email: u?.user?.email ?? null,
        display_name: meta?.display_name ?? meta?.full_name ?? null,
        created_at: r.created_at,
        is_self: r.user_id === context.userId,
        active: Boolean(confirmedAt || lastSignIn),
        last_sign_in_at: lastSignIn,
      });
    }
    return results;
  });


export const inviteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(255) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // Find existing user by email (paginate up to a reasonable cap)
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

    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: existingUserId, role: "admin" });
    if (insErr && !insErr.message.toLowerCase().includes("duplicate")) {
      throw new Error(insErr.message);
    }

    return { ok: true, invited, user_id: existingUserId };
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.user_id === context.userId) {
      throw new Error("You can't remove your own admin role.");
    }
    // Ensure at least one admin remains
    const { count, error: cErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) <= 1) throw new Error("At least one admin must remain.");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
