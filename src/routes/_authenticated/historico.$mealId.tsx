import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { getMeal, updateMeal, deleteMeal } from "@/lib/meals.functions";
import { fromDateTimeLocalInputValue, toDateTimeLocalInputValue } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MEAL_LABEL } from "@/lib/format";

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
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Refeição atualizada");
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

  const items = Array.isArray(meal.items) ? (meal.items as Array<{ name: string; quantity?: number; unit?: string }>) : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <Link to="/historico" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h1 className="font-serif text-2xl font-semibold">Editar refeição</h1>

      {meal.original_message ? (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Você disse</p>
          <p className="mt-1">{meal.original_message}</p>
        </div>
      ) : null}

      {items.length ? (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Alimentos</p>
          <ul className="mt-2 space-y-1 text-sm">
            {items.map((it, i) => (
              <li key={i}>• {it.quantity ? `${it.quantity}${it.unit ?? ""} de ` : ""}{it.name}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <form onSubmit={form.handleSubmit((v) => updateMut.mutate(v))} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Título</Label>
            <Input {...form.register("title")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Refeição</Label>
            <Select value={form.watch("meal_type")} onValueChange={(v) => form.setValue("meal_type", v as FormValues["meal_type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MEAL_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
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
            <Input type="number" step="0.1" {...form.register("protein_g", { valueAsNumber: true })} />
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

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={updateMut.isPending} className="flex-1">
            {updateMut.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (confirm("Apagar esta refeição?")) deleteMut.mutate();
            }}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
