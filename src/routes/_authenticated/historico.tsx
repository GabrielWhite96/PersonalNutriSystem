import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ptBR } from "date-fns/locale";
import { formatDateValue, getLocalDateKey } from "@/lib/datetime";
import { listMeals } from "@/lib/meals.functions";
import { MEAL_LABEL, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/historico")({
  component: HistoricoPage,
});

function HistoricoPage() {
  const listMealsFn = useServerFn(listMeals);
  const { data: meals } = useQuery({
    queryKey: ["meals", "all"],
    queryFn: () => listMealsFn({ data: { limit: 200 } }),
  });

  const grouped = groupByDay(meals ?? []);
  const days = Object.keys(grouped);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <h1 className="font-serif text-3xl font-semibold">Histórico</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Suas refeições, agrupadas por dia.
      </p>

      {days.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma refeição registrada ainda.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {days.map((day) => {
            const items = grouped[day];
            const total = items.reduce((s, m) => s + Number(m.kcal), 0);
            return (
              <section key={day}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="font-serif text-lg font-semibold">
                    {formatDateValue(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </h2>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {fmtNum(total)} kcal
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((m) => (
                    <Link
                      key={m.id}
                      to="/historico/$mealId"
                      params={{ mealId: m.id }}
                      className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/40"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {MEAL_LABEL[m.meal_type] ?? m.meal_type} ·{" "}
                          {formatDateValue(m.eaten_at, "HH:mm")}
                        </p>
                        <p className="mt-1 font-medium">{m.title}</p>
                      </div>
                      <div className="text-right">
                        <p className="tabular-nums font-serif text-lg font-semibold">
                          {fmtNum(Number(m.kcal))}
                        </p>
                        <p className="text-xs text-muted-foreground">kcal</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function groupByDay<T extends { eaten_at: string }>(rows: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const r of rows) {
    const day = getLocalDateKey(r.eaten_at);
    (out[day] ??= []).push(r);
  }
  return out;
}
