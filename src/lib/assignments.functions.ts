import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admins.functions";
import { ALLOWED_STAFF_ROLES } from "@/lib/staff.functions";

const RoleSchema = z.enum(ALLOWED_STAFF_ROLES).nullable().optional();

export const assignStaffToEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        event_id: z.string().uuid(),
        staff_id: z.string().uuid(),
        role: RoleSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("event_staff")
      .upsert(
        {
          event_id: data.event_id,
          staff_id: data.staff_id,
          role: data.role ?? null,
          created_by: context.userId,
        } as never,
        { onConflict: "event_id,staff_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Keep rental_calendar_events.assigned_to in sync as the primary assignee.
    const { data: ev } = await supabaseAdmin
      .from("rental_calendar_events")
      .select("assigned_to")
      .eq("id", data.event_id)
      .maybeSingle();
    if (!ev?.assigned_to) {
      await supabaseAdmin
        .from("rental_calendar_events")
        .update({ assigned_to: data.staff_id } as never)
        .eq("id", data.event_id);
    }

    return { id: row.id };
  });

export const unassignStaffFromEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look up the row so we can rebalance assigned_to afterwards.
    const { data: row } = await supabaseAdmin
      .from("event_staff")
      .select("event_id, staff_id")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("event_staff").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    if (row) {
      const { data: ev } = await supabaseAdmin
        .from("rental_calendar_events")
        .select("assigned_to")
        .eq("id", row.event_id)
        .maybeSingle();
      if (ev?.assigned_to === row.staff_id) {
        // Promote the next assignee (if any) to primary.
        const { data: next } = await supabaseAdmin
          .from("event_staff")
          .select("staff_id")
          .eq("event_id", row.event_id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        await supabaseAdmin
          .from("rental_calendar_events")
          .update({ assigned_to: next?.staff_id ?? null } as never)
          .eq("id", row.event_id);
      }
    }

    return { ok: true };
  });

export const listEventStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ event_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("event_staff")
      .select("id, role, created_at, staff:staff_id (id, name, color, roles)")
      .eq("event_id", data.event_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listMyAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ start_date: z.string(), end_date: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Look up caller's staff row (RLS allows self-read).
    const { data: me } = await context.supabase
      .from("staff")
      .select("id")
      .eq("user_id", context.userId)
      .eq("active", true)
      .maybeSingle();
    if (!me) return [];

    const { data: rows, error } = await context.supabase
      .from("event_staff")
      .select(
        "id, role, event:event_id (id, title, event_type, start_time, end_time, all_day, status, location, notes, color)",
      )
      .eq("staff_id", me.id);
    if (error) throw new Error(error.message);

    return (rows ?? [])
      .filter((r) => {
        const ev = r.event as { start_time?: string } | null;
        if (!ev?.start_time) return false;
        return ev.start_time >= data.start_date && ev.start_time <= data.end_date;
      })
      .sort((a, b) => {
        const av = (a.event as { start_time?: string } | null)?.start_time ?? "";
        const bv = (b.event as { start_time?: string } | null)?.start_time ?? "";
        return av.localeCompare(bv);
      });
  });

export const listEventStaffForEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ event_ids: z.array(z.string().uuid()).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.event_ids.length === 0) return [] as Array<{
      event_id: string;
      staff_id: string;
      role: string | null;
      name: string;
      color: string | null;
    }>;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("event_staff")
      .select("event_id, staff_id, role, staff:staff_id (name, color)")
      .in("event_id", data.event_ids);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => {
      const s = r.staff as { name?: string; color?: string | null } | null;
      return {
        event_id: r.event_id as string,
        staff_id: r.staff_id as string,
        role: (r.role as string | null) ?? null,
        name: s?.name ?? "",
        color: s?.color ?? null,
      };
    });
  });
