import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listWeightLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", context.userId)
      .order("logged_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const logWeight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ weight_kg: z.number().min(20).max(400) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error: insertError } = await context.supabase.from("weight_logs").insert({
      user_id: context.userId,
      weight_kg: data.weight_kg,
    });
    if (insertError) throw new Error(insertError.message);
    const { error: profileError } = await context.supabase
      .from("profiles")
      .upsert({ id: context.userId, weight_kg: data.weight_kg });
    if (profileError) throw new Error(profileError.message);
    return { ok: true };
  });
