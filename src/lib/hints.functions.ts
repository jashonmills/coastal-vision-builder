import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyDismissedHints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_dismissed_hints")
      .select("hint_key")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: { hint_key: string }) => r.hint_key);
  });

export const dismissHint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { hint_key: string }) => {
    if (!v?.hint_key || typeof v.hint_key !== "string") throw new Error("hint_key required");
    return { hint_key: v.hint_key.slice(0, 120) };
  })
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("user_dismissed_hints")
      .upsert({ user_id: context.userId, hint_key: data.hint_key }, { onConflict: "user_id,hint_key" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
