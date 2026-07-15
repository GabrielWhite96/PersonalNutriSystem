import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtNum } from "@/lib/format";

export type MealItemRow = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  kcal?: number | null;
  protein_g?: number | null;
  carb_g?: number | null;
  fat_g?: number | null;
};

export function parseMealItems(items: unknown): MealItemRow[] {
  if (!Array.isArray(items)) return [];
  return items.filter(
    (item): item is MealItemRow =>
      item != null &&
      typeof item === "object" &&
      typeof (item as MealItemRow).name === "string",
  );
}

function formatQuantity(item: MealItemRow): string {
  if (item.quantity == null || Number.isNaN(Number(item.quantity))) return "—";
  const amount = fmtNum(Number(item.quantity), Number(item.quantity) % 1 === 0 ? 0 : 1);
  return item.unit ? `${amount} ${item.unit}` : amount;
}

function sumField(items: MealItemRow[], key: keyof MealItemRow): number {
  return items.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
}

export function MealItemsTable({
  items,
  totals,
}: {
  items: MealItemRow[];
  totals?: {
    kcal: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
  };
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        Nenhum alimento detalhado foi salvo nesta refeição.
      </p>
    );
  }

  const footer = totals ?? {
    kcal: sumField(items, "kcal"),
    protein_g: sumField(items, "protein_g"),
    carb_g: sumField(items, "carb_g"),
    fat_g: sumField(items, "fat_g"),
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Alimento</TableHead>
            <TableHead>Qtd</TableHead>
            <TableHead className="text-right">kcal</TableHead>
            <TableHead className="text-right">Prot</TableHead>
            <TableHead className="text-right">Carbo</TableHead>
            <TableHead className="pr-4 text-right">Gord</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={`${item.name}-${index}`}>
              <TableCell className="pl-4 font-medium">{item.name}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatQuantity(item)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{fmtNum(Number(item.kcal) || 0)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtNum(Number(item.protein_g) || 0)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtNum(Number(item.carb_g) || 0)}</TableCell>
              <TableCell className="pr-4 text-right tabular-nums">{fmtNum(Number(item.fat_g) || 0)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell className="pl-4 font-semibold" colSpan={2}>
              Total
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {fmtNum(footer.kcal)}
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {fmtNum(footer.protein_g)}
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {fmtNum(footer.carb_g)}
            </TableCell>
            <TableCell className="pr-4 text-right font-semibold tabular-nums">
              {fmtNum(footer.fat_g)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
