import { describe, expect, it } from "vitest";
import { estimateDailyGoalsLocally } from "@/lib/goals";

describe("estimateDailyGoalsLocally", () => {
  it("returns sensible macros for maintain goal", () => {
    const result = estimateDailyGoalsLocally({
      age: 30,
      sex: "masculino",
      height_cm: 175,
      weight_kg: 75,
      activity_level: "moderado",
      goal: "manter",
    });

    expect(result.kcal_goal).toBeGreaterThan(1800);
    expect(result.kcal_goal).toBeLessThan(3500);
    expect(result.protein_g_goal).toBeGreaterThan(100);
    expect(result.carb_g_goal).toBeGreaterThan(100);
    expect(result.fat_g_goal).toBeGreaterThan(40);
  });

  it("applies deficit when goal is lose weight", () => {
    const base = {
      age: 28,
      sex: "feminino" as const,
      height_cm: 165,
      weight_kg: 65,
      activity_level: "leve" as const,
    };
    const maintain = estimateDailyGoalsLocally({ ...base, goal: "manter" });
    const cut = estimateDailyGoalsLocally({ ...base, goal: "emagrecer" });
    expect(cut.kcal_goal).toBeLessThan(maintain.kcal_goal);
  });
});
