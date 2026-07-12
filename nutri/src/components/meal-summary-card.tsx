import { Button } from "@/components/ui/button";
import { fmtNum, MEAL_LABEL } from "@/lib/format";
import { Check } from "lucide-react";

type Item = {
  name: string;
  quantity?: number;
  unit?: string;
};
type Estimate = {
  meal_type: string;
  title: string;
  items: Item[];
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
    <div className="my-2 rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {MEAL_LABEL[estimate.meal_type] ?? estimate.meal_type}
        </p>
      </div>
      <h3 className="font-serif text-lg font-semibold">{estimate.title}</h3>

      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {estimate.items.map((it, idx) => (
          <li key={idx}>
            • {it.quantity ? `${fmtNum(it.quantity, 0)}${it.unit ? " " + it.unit : ""} de ` : ""}
            {it.name}
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-muted/50 p-3 text-center">
        <Macro label="kcal" value={fmtNum(estimate.kcal)} />
        <Macro label="prot" value={`${fmtNum(estimate.protein_g)}g`} />
        <Macro label="carbo" value={`${fmtNum(estimate.carb_g)}g`} />
        <Macro label="gord" value={`${fmtNum(estimate.fat_g)}g`} />
      </div>

      <Button onClick={onSave} disabled={saving} className="mt-4 w-full gap-2" size="sm">
        <Check className="h-4 w-4" />
        {saving ? "Salvando..." : "Salvar esta refeição"}
      </Button>
    </div>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-serif text-base font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
