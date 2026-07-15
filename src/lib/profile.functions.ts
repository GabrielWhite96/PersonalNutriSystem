import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createGeminiProvider } from "@/lib/gemini.server";
import {
  estimateDailyGoalsLocally,
  type DailyGoalsEstimate,
  type GoalEstimateInput,
} from "@/lib/goals";
import { generateObject } from "ai";
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
  age: z.coerce.number().int().min(1).max(130),
  sex: z.enum(["masculino", "feminino", "outro"]),
  height_cm: z.coerce.number().min(50).max(260),
  weight_kg: z.coerce.number().min(20).max(400),
  activity_level: z.enum(["sedentario", "leve", "moderado", "intenso", "muito_intenso"]),
  goal: z.enum(["emagrecer", "manter", "ganhar_massa", "outro"]).nullable().optional(),
  assistant_name: z.string().min(1).max(40).default("Nutri"),
  kcal_goal: z.coerce.number().int().min(500).max(8000).nullable().optional(),
  protein_g_goal: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  carb_g_goal: z.coerce.number().int().min(0).max(2000).nullable().optional(),
  fat_g_goal: z.coerce.number().int().min(0).max(500).nullable().optional(),
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

    if (!current || Number(current.weight_kg) !== Number(fields.weight_kg)) {
      await context.supabase.from("weight_logs").insert({
        user_id: context.userId,
        weight_kg: fields.weight_kg,
      });
    }
    return updated;
  });

const EstimateGoalsInput = z.object({
  age: z.coerce.number().int().min(1).max(130),
  sex: z.enum(["masculino", "feminino", "outro"]),
  height_cm: z.coerce.number().min(50).max(260),
  weight_kg: z.coerce.number().min(20).max(400),
  activity_level: z.enum(["sedentario", "leve", "moderado", "intenso", "muito_intenso"]),
  goal: z.enum(["emagrecer", "manter", "ganhar_massa", "outro"]).nullable().optional(),
});

const GoalsObjectSchema = z.object({
  kcal_goal: z.number().int().min(1200).max(4500),
  protein_g_goal: z.number().int().min(40).max(300),
  carb_g_goal: z.number().int().min(50).max(600),
  fat_g_goal: z.number().int().min(20).max(200),
  rationale: z.string().min(1).max(280),
});

export const estimateDailyGoals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EstimateGoalsInput.parse(input))
  .handler(async ({ data }): Promise<DailyGoalsEstimate & { source: "ai" | "formula" }> => {
    const input = data as GoalEstimateInput;
    const fallback = estimateDailyGoalsLocally(input);

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
    if (!GEMINI_API_KEY) {
      return { ...fallback, source: "formula" };
    }

    try {
      const gemini = createGeminiProvider(GEMINI_API_KEY);
      const { object } = await generateObject({
        model: gemini(GEMINI_MODEL),
        schema: GoalsObjectSchema,
        prompt: `Você é uma nutricionista brasileira. Estime metas diárias realistas e seguras para um adulto com estes dados:

- Idade: ${input.age} anos
- Sexo: ${input.sex}
- Altura: ${input.height_cm} cm
- Peso: ${input.weight_kg} kg
- Atividade: ${input.activity_level}
- Objetivo: ${input.goal ?? "manter"}

Use Mifflin–St Jeor (ou similar) + fator de atividade como base.
Para emagrecer: déficit moderado (~300–500 kcal).
Para ganhar massa: superávit moderado (~200–400 kcal).
Distribua macros de forma prática (proteína adequada ao peso/objetivo).
Responda só com os números das metas e uma rationale curta em português do Brasil (1 frase).

Referência local (pode ajustar levemente): ${JSON.stringify(fallback)}`,
      });

      return { ...object, source: "ai" };
    } catch (error) {
      console.error("[estimateDailyGoals] Gemini failed, using formula", error);
      return { ...fallback, source: "formula" };
    }
  });
