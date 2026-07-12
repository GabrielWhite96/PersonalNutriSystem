import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPastDaysBounds } from "@/lib/datetime";
import { z } from "zod";

export const getReportData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(input ?? { days: 30 }),
  )
  .handler(async ({ data, context }) => {
    const { startIso, endIso } = getPastDaysBounds(data.days);
    const { data: rows, error } = await context.supabase
      .from("meals")
      .select("id, eaten_at, kcal, protein_g, carb_g, fat_g")
      .eq("user_id", context.userId)
      .gte("eaten_at", startIso)
      .lte("eaten_at", endIso)
      .order("eaten_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
