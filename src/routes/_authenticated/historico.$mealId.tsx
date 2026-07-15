import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ptBR } from "date-fns/locale";
import { getMeal, updateMeal, deleteMeal } from "@/lib/meals.functions";
import {
  formatDateValue,
  fromDateTimeLocalInputValue,
  toDateTimeLocalInputValue,
} from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { MealItemsTable, parseMealItems } from "@/components/meal-items-table";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MEAL_LABEL, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/historico/$mealId")({
  component: MealDetailPage,
});

type FormValues = {
  title: string;
  meal_type: "cafe_manha" | "almoco" | "lanche" | "jantar" | "outro";
  eaten_at: string;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

function MealDetailPage() {
  const { mealId } = Route.useParams();
  const getMealFn = useServerFn(getMeal);
  const updateFn = useServerFn(updateMeal);
  const deleteFn = useServerFn(deleteMeal);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: meal, isLoading } = useQuery({
    queryKey: ["meal", mealId],
    queryFn: () => getMealFn({ data: { id: mealId } }),
  });

  const form = useForm<FormValues>();

  useEffect(() => {
    if (!meal) return;
    form.reset({
      title: meal.title,
      meal_type: meal.meal_type,
      eaten_at: toDateTimeLocalInputValue(meal.eaten_at),
      kcal: Number(meal.kcal),
      protein_g: Number(meal.protein_g),
      carb_g: Number(meal.carb_g),
      fat_g: Number(meal.fat_g),
    });
  }, [meal, form]);

  const updateMut = useMutation({
    mutationFn: async (v: FormValues) =>
      updateFn({
        data: {
          id: mealId,
          title: v.title,
          meal_type: v.meal_type,
          eaten_at: fromDateTimeLocalInputValue(v.eaten_at),
          kcal: Number(v.kcal),
          protein_g: Number(v.protein_g),
          carb_g: Number(v.carb_g),
          fat_g: Number(v.fat_g),
          // Keep the detailed foods already saved with the meal.
          items: parseMealItems(meal?.items),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Refeição atualizada");
      setEditing(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async () => deleteFn({ data: { id: mealId } }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Refeição apagada");
      navigate({ to: "/historico" });
    },
  });

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Carregando...</div>;
  if (!meal) return <div className="p-8 text-sm text-muted-foreground">Refeição não encontrada.</div>;

  const items = parseMealItems(meal.items);
  const totals = {
    kcal: Number(meal.kcal) || 0,
    protein_g: Number(meal.protein_g) || 0,
    carb_g: Number(meal.carb_g) || 0,
    fat_g: Number(meal.fat_g) || 0,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <Link to="/historico" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar ao histórico
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {MEAL_LABEL[meal.meal_type] ?? meal.meal_type} ·{" "}
            {formatDateValue(meal.eaten_at, "EEEE, d 'de' MMMM · HH:mm", { locale: ptBR })}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold">{meal.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setEditing((v) => !v)}
          >
            <Pencil className="h-4 w-4" />
            {editing ? "Cancelar" : "Editar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => {
              if (confirm("Apagar esta refeição?")) deleteMut.mutate();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {meal.original_message ? (
        <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Você disse</p>
          <p className="mt-1 text-sm leading-relaxed">{meal.original_message}</p>
        </div>
      ) : null}

      <section className="mt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-xl font-semibold">O que você comeu</h2>
          <span className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "itens"}
          </span>
        </div>
        <MealItemsTable items={items} totals={totals} />
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MacroStat label="Calorias" value={`${fmtNum(totals.kcal)} kcal`} />
        <MacroStat label="Proteínas" value={`${fmtNum(totals.protein_g)} g`} />
        <MacroStat label="Carboidratos" value={`${fmtNum(totals.carb_g)} g`} />
        <MacroStat label="Gorduras" value={`${fmtNum(totals.fat_g)} g`} />
      </section>

      {editing ? (
        <form
          onSubmit={form.handleSubmit((v) => updateMut.mutate(v))}
          className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-5"
        >
          <h2 className="font-serif text-lg font-semibold">Editar refeição</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Título</Label>
              <Input {...form.register("title")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Refeição</Label>
              <Select
                value={form.watch("meal_type")}
                onValueChange={(v) => form.setValue("meal_type", v as FormValues["meal_type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEAL_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Data e hora</Label>
              <Input type="datetime-local" {...form.register("eaten_at")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Calorias</Label>
              <Input type="number" step="0.1" {...form.register("kcal", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Proteínas (g)</Label>
              <Input
                type="number"
                step="0.1"
                {...form.register("protein_g", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Carboidratos (g)</Label>
              <Input type="number" step="0.1" {...form.register("carb_g", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Gorduras (g)</Label>
              <Input type="number" step="0.1" {...form.register("fat_g", { valueAsNumber: true })} />
            </div>
          </div>

          <Button type="submit" disabled={updateMut.isPending} className="w-full sm:w-auto">
            {updateMut.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function MacroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
