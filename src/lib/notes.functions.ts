import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getMyStaffId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("staff")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  return data?.id ?? null;
}

export const addStaffNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        job_id: z.string().uuid().nullable().optional(),
        body: z.string().trim().min(1).max(5000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const staffId = await getMyStaffId(context.supabase, context.userId);
    if (!staffId) throw new Error("You are not an active staff member.");

    const { data: row, error } = await context.supabase
      .from("staff_notes")
      .insert({
        staff_id: staffId,
        job_id: data.job_id ?? null,
        body: data.body,
      } as never)
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const staffId = await getMyStaffId(context.supabase, context.userId);
    if (!staffId) return [];
    const { data, error } = await context.supabase
      .from("staff_notes")
      .select("id, job_id, body, created_at, jobs:job_id(id,title,event_date)")
      .eq("staff_id", staffId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listJobNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS: admins read all, authors read own, assigned staff read job notes.
    const { data: rows, error } = await context.supabase
      .from("staff_notes")
      .select("id, body, created_at, staff_id, staff:staff_id(id,name)")
      .eq("job_id", data.job_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
