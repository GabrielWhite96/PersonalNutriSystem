import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const ProfileInput = z.object({
  name: z.string().min(1).max(100),
  age: z.number().int().min(1).max(130),
  sex: z.enum(["masculino", "feminino", "outro"]),
  height_cm: z.number().min(50).max(260),
  weight_kg: z.number().min(20).max(400),
  activity_level: z.enum(["sedentario", "leve", "moderado", "intenso", "muito_intenso"]),
  goal: z.enum(["emagrecer", "manter", "ganhar_massa", "outro"]).nullable().optional(),
  assistant_name: z.string().min(1).max(40).default("Nutri"),
  kcal_goal: z.number().int().min(500).max(8000).nullable().optional(),
  protein_g_goal: z.number().int().min(0).max(1000).nullable().optional(),
  carb_g_goal: z.number().int().min(0).max(2000).nullable().optional(),
  fat_g_goal: z.number().int().min(0).max(500).nullable().optional(),
  markOnboarded: z.boolean().optional(),
});

export const upsertProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileInput.parse(input))
  .handler(async ({ data, context }) => {
    const { markOnboarded, ...fields } = data;
    const onboardedAt = markOnboarded ? new Date().toISOString() : undefined;

    const { data: current } = await context.supabase
      .from("profiles")
      .select("weight_kg")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: updated, error } = await context.supabase
      .from("profiles")
      .upsert({
        id: context.userId,
        ...fields,
        ...(onboardedAt ? { onboarded_at: onboardedAt } : {}),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Log weight if changed
    if (!current || Number(current.weight_kg) !== Number(fields.weight_kg)) {
      await context.supabase.from("weight_logs").insert({
        user_id: context.userId,
        weight_kg: fields.weight_kg,
      });
    }
    return updated;
  });
