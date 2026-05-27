import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const EVENT_TYPES = [
  "quote_request",
  "quote_follow_up",
  "quote_sent",
  "rental_reserved",
  "delivery",
  "pickup",
  "check_out",
  "check_in",
  "cleaning",
  "maintenance",
  "blocked_date",
  "internal_note",
] as const;

export const EVENT_STATUSES = [
  "pending",
  "scheduled",
  "completed",
  "cancelled",
  "missed",
  "needs_attention",
] as const;

export const EVENT_COLORS: Record<string, string> = {
  quote_request: "#d4a64a",
  quote_follow_up: "#d4a64a",
  quote_sent: "#3b82f6",
  rental_reserved: "#1e2a5e",
  delivery: "#10b981",
  pickup: "#14b8a6",
  check_out: "#0ea5e9",
  check_in: "#22c55e",
  cleaning: "#f97316",
  maintenance: "#ef4444",
  blocked_date: "#6b7280",
  internal_note: "#94a3b8",
};

const RangeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const listCalendarEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("rental_calendar_events")
      .select("*")
      .is("deleted_at", null)
      .gte("start_time", data.from)
      .lte("start_time", data.to)
      .order("start_time");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(300),
  event_type: z.enum(EVENT_TYPES),
  start_time: z.string(),
  end_time: z.string().nullable().optional(),
  all_day: z.boolean().optional(),
  status: z.enum(EVENT_STATUSES).optional(),
  location: z.string().max(500).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  quote_id: z.string().uuid().nullable().optional(),
  quote_request_id: z.string().uuid().nullable().optional(),
  saved_recommendation_id: z.string().uuid().nullable().optional(),
});

export const upsertCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      title: data.title,
      event_type: data.event_type,
      start_time: data.start_time,
      end_time: data.end_time ?? null,
      all_day: data.all_day ?? false,
      status: data.status ?? "scheduled",
      location: data.location ?? null,
      notes: data.notes ?? null,
      color: data.color ?? EVENT_COLORS[data.event_type] ?? null,
      quote_id: data.quote_id ?? null,
      quote_request_id: data.quote_request_id ?? null,
      saved_recommendation_id: data.saved_recommendation_id ?? null,
      created_by: context.userId,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("rental_calendar_events")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("rental_calendar_events")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("rental_calendar_events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markEventComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("rental_calendar_events")
      .update({ status: "completed" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upcomingTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    const { data, error } = await context.supabase
      .from("rental_calendar_events")
      .select("id, title, event_type, start_time, status, location")
      .is("deleted_at", null)
      .gte("start_time", now.toISOString())
      .lte("start_time", end.toISOString())
      .neq("status", "completed")
      .order("start_time")
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
