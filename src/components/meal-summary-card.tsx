import { Button } from "@/components/ui/button";
import { MealItemsTable, type MealItemRow } from "@/components/meal-items-table";
import { MEAL_LABEL } from "@/lib/format";
import { Check } from "lucide-react";

type Estimate = {
  meal_type: string;
  title: string;
  items: MealItemRow[];
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

export function MealSummaryCard({
  estimate,
  onSave,
  saving,
}: {
  estimate: Estimate;
  onSave: () => void;
  saving?: boolean;
}) {
  return (
    <div className="my-2 space-y-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {MEAL_LABEL[estimate.meal_type] ?? estimate.meal_type}
        </p>
        <h3 className="mt-1 font-serif text-lg font-semibold">{estimate.title}</h3>
      </div>

      <MealItemsTable
        items={estimate.items}
        totals={{
          kcal: estimate.kcal,
          protein_g: estimate.protein_g,
          carb_g: estimate.carb_g,
          fat_g: estimate.fat_g,
        }}
      />

      <Button onClick={onSave} disabled={saving} className="w-full gap-2" size="sm">
        <Check className="h-4 w-4" />
        {saving ? "Salvando..." : "Salvar esta refeição"}
      </Button>
    </div>
  );
}
