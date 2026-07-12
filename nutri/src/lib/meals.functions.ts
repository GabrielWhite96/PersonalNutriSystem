import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getLocalDayBounds } from "@/lib/datetime";
import { z } from "zod";

const MealItem = z.object({
  name: z.string(),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  kcal: z.number().nullable().optional(),
  protein_g: z.number().nullable().optional(),
  carb_g: z.number().nullable().optional(),
  fat_g: z.number().nullable().optional(),
});

const SaveMealInput = z.object({
  meal_type: z.enum(["cafe_manha", "almoco", "lanche", "jantar", "outro"]),
  title: z.string().min(1).max(200),
  eaten_at: z.string().optional(),
  kcal: z.number().min(0),
  protein_g: z.number().min(0),
  carb_g: z.number().min(0),
  fat_g: z.number().min(0),
  original_message: z.string().optional().nullable(),
  items: z.array(MealItem),
});

export const saveMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveMealInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("meals")
      .insert({
        user_id: context.userId,
        meal_type: data.meal_type,
        title: data.title,
        eaten_at: data.eaten_at ?? new Date().toISOString(),
        kcal: data.kcal,
        protein_g: data.protein_g,
        carb_g: data.carb_g,
        fat_g: data.fat_g,
        original_message: data.original_message ?? null,
        items: data.items,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await persistFoodPreferences(context.supabase, context.userId, data.items);
    return row;
  });

export const listMeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("meals")
      .select("*")
      .eq("user_id", context.userId)
      .order("eaten_at", { ascending: false });
    if (data.from) q = q.gte("eaten_at", data.from);
    if (data.to) q = q.lte("eaten_at", data.to);
    if (data.limit) q = q.limit(data.limit);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getMeal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("meals")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const UpdateMealInput = SaveMealInput.partial().extend({ id: z.string().uuid() });

export const updateMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateMealInput.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    const { data: row, error } = await context.supabase
      .from("meals")
      .update(fields)
      .eq("id", id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("meals")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDailyTotals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ date: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { startIso, endIso } = getLocalDayBounds(data.date);
    const { data: rows, error } = await context.supabase
      .from("meals")
      .select("kcal, protein_g, carb_g, fat_g, meal_type, title, eaten_at, id")
      .eq("user_id", context.userId)
      .gte("eaten_at", startIso)
      .lte("eaten_at", endIso);
    if (error) throw new Error(error.message);
    const totals = (rows ?? []).reduce(
      (acc, r) => ({
        kcal: acc.kcal + Number(r.kcal),
        protein_g: acc.protein_g + Number(r.protein_g),
        carb_g: acc.carb_g + Number(r.carb_g),
        fat_g: acc.fat_g + Number(r.fat_g),
      }),
      { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
    );
    return { totals, meals: rows ?? [] };
  });

export const findSimilarMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        meal_type: z.enum(["cafe_manha", "almoco", "lanche", "jantar", "outro"]).optional(),
        query: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("meals")
      .select("*")
      .eq("user_id", context.userId)
      .order("eaten_at", { ascending: false })
      .limit(5);
    if (data.meal_type) q = q.eq("meal_type", data.meal_type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

type SupabaseClient = Parameters<
  Parameters<typeof saveMeal.handler>[0]["context"]["supabase"]["from"]
>[0] extends never
  ? never
  : ReturnType<typeof requireSupabaseAuth["_types"]["server"]>["context"]["supabase"];

function normalizePreferenceKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildPreferenceSummary(item: z.infer<typeof MealItem>): string {
  if (item.quantity != null) {
    const amount = item.unit ? `${item.quantity} ${item.unit}` : `${item.quantity}`;
    return `Voce costuma registrar ${item.name} como ${amount}.`;
  }
  return `Voce costuma registrar ${item.name} sem quantidade especifica.`;
}

async function persistFoodPreferences(
  supabase: SupabaseClient,
  userId: string,
  items: z.infer<typeof MealItem>[],
) {
  const preferences = items
    .map((item) => ({
      item,
      key: normalizePreferenceKey(item.name),
    }))
    .filter(({ item, key }) => item.name.trim().length > 0 && key.length > 0);

  for (const { item, key } of preferences) {
    const { data: existing, error: selectError } = await supabase
      .from("user_food_preferences")
      .select("id")
      .eq("user_id", userId)
      .eq("key", `item:${key}`)
      .maybeSingle();
    if (selectError) throw new Error(selectError.message);

    const payload = {
      key: `item:${key}`,
      summary: buildPreferenceSummary(item),
      items: [item],
      user_id: userId,
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from("user_food_preferences")
        .update({
          items: payload.items,
          summary: payload.summary,
        })
        .eq("id", existing.id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabase
        .from("user_food_preferences")
        .insert(payload);
      if (insertError) throw new Error(insertError.message);
    }
  }
}
