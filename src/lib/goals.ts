export type GoalEstimateInput = {
  age: number;
  sex: "masculino" | "feminino" | "outro";
  height_cm: number;
  weight_kg: number;
  activity_level: "sedentario" | "leve" | "moderado" | "intenso" | "muito_intenso";
  goal?: "emagrecer" | "manter" | "ganhar_massa" | "outro" | null;
};

export type DailyGoalsEstimate = {
  kcal_goal: number;
  protein_g_goal: number;
  carb_g_goal: number;
  fat_g_goal: number;
  rationale: string;
};

const ACTIVITY_FACTOR: Record<GoalEstimateInput["activity_level"], number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  muito_intenso: 1.9,
};

/** Mifflin–St Jeor based estimate used as fallback (and AI guidance). */
export function estimateDailyGoalsLocally(input: GoalEstimateInput): DailyGoalsEstimate {
  const { age, height_cm, weight_kg, activity_level, goal } = input;
  const sexFactor = input.sex === "feminino" ? -161 : 5; // "outro" uses male formula as neutral default

  const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + sexFactor;
  const tdee = bmr * ACTIVITY_FACTOR[activity_level];

  let kcal = tdee;
  if (goal === "emagrecer") kcal = tdee - 400;
  if (goal === "ganhar_massa") kcal = tdee + 300;

  kcal = Math.round(clamp(kcal, 1200, 4500) / 10) * 10;

  // Protein ~1.6–2.2 g/kg depending on goal; carbs/fats fill the rest.
  const proteinPerKg = goal === "ganhar_massa" ? 2.0 : goal === "emagrecer" ? 1.8 : 1.6;
  const protein_g_goal = Math.round(weight_kg * proteinPerKg);
  const fat_g_goal = Math.round((kcal * 0.28) / 9);
  const carb_g_goal = Math.max(
    50,
    Math.round((kcal - protein_g_goal * 4 - fat_g_goal * 9) / 4),
  );

  return {
    kcal_goal: kcal,
    protein_g_goal,
    carb_g_goal,
    fat_g_goal,
    rationale:
      "Estimativa com base em gasto energético (Mifflin–St Jeor), nível de atividade e objetivo.",
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
