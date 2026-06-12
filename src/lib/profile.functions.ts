import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const baseSchema = z.object({
  display_name: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  company: z.string().trim().max(160).optional().nullable(),
});

const adminSchema = z.object({
  internal_title: z.string().trim().max(120).optional().nullable(),
  admin_notes: z.string().trim().max(2000).optional().nullable(),
});

export type ProfileRow = {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  company: string | null;
  avatar_url: string | null;
  internal_title: string | null;
  admin_notes: string | null;
  is_admin: boolean;
};

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileRow> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, phone, company, avatar_url, internal_title, admin_notes")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (!data) {
      // create empty row on first visit
      const { data: ins, error: insErr } = await supabase
        .from("profiles")
        .insert({ user_id: userId })
        .select("user_id, display_name, phone, company, avatar_url, internal_title, admin_notes")
        .single();
      if (insErr) throw insErr;
      return { ...(ins as any), is_admin: !!isAdmin };
    }
    return { ...(data as any), is_admin: !!isAdmin };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => baseSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: data.display_name ?? null,
        phone: data.phone ?? null,
        company: data.company ?? null,
      })
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const updateMyAdminProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adminSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await supabase
      .from("profiles")
      .update({
        internal_title: data.internal_title ?? null,
        admin_notes: data.admin_notes ?? null,
      })
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });
