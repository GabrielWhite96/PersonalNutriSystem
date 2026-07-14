import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getTodayDateKey } from "@/lib/datetime";
import { getProfile } from "@/lib/profile.functions";
import { getDailyTotals } from "@/lib/meals.functions";
import { MacroRing, MacroBar } from "@/components/macro-ring";
import { Button } from "@/components/ui/button";
import { MessageCircle, Plus } from "lucide-react";
import { MEAL_LABEL, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

function HomePage() {
  const getProfileFn = useServerFn(getProfile);
  const getDailyFn = useServerFn(getDailyTotals);
  const today = getTodayDateKey();

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getProfileFn() });
  const { data: daily } = useQuery({
    queryKey: ["daily-totals", today],
    queryFn: () => getDailyFn({ data: { date: today } }),
  });

  const totals = daily?.totals ?? { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 };
  const meals = daily?.meals ?? [];
  const hasGoals = profile?.kcal_goal || profile?.protein_g_goal;
  const firstName = profile?.name?.split(" ")[0] ?? "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold">
            Oi{firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
      </header>

      {/* Today card */}
      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          <MacroRing
            value={totals.kcal}
            goal={profile?.kcal_goal ?? null}
            label="kcal"
          />
          <div className="w-full flex-1 space-y-4">
            <MacroBar
              name="Proteínas"
              value={totals.protein_g}
              goal={profile?.protein_g_goal ?? null}
              color="var(--color-macro-protein)"
            />
            <MacroBar
              name="Carboidratos"
              value={totals.carb_g}
              goal={profile?.carb_g_goal ?? null}
              color="var(--color-macro-carb)"
            />
            <MacroBar
              name="Gorduras"
              value={totals.fat_g}
              goal={profile?.fat_g_goal ?? null}
              color="var(--color-macro-fat)"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/chat" className="flex-1">
            <Button size="lg" className="w-full gap-2">
              <MessageCircle className="h-5 w-5" /> Registrar refeição
            </Button>
          </Link>
          {hasGoals ? (
            <Link to="/relatorios">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Comparar com metas
              </Button>
            </Link>
          ) : null}
        </div>
      </section>

      {/* Recent meals */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-xl font-semibold">Hoje</h2>
          <span className="text-xs text-muted-foreground">
            {meals.length} {meals.length === 1 ? "refeição" : "refeições"}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {meals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nada por aqui ainda. Comece contando o que você comeu hoje.
              </p>
              <Link to="/chat">
                <Button variant="outline" size="sm" className="mt-4 gap-2">
                  <Plus className="h-4 w-4" /> Registrar agora
                </Button>
              </Link>
            </div>
          ) : (
            meals.map((m) => (
              <Link
                key={m.id}
                to="/historico/$mealId"
                params={{ mealId: m.id }}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/40"
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {MEAL_LABEL[m.meal_type] ?? m.meal_type} ·{" "}
                    {format(new Date(m.eaten_at), "HH:mm")}
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
            ))
          )}
        </div>
      </section>
    </div>
  );
}
