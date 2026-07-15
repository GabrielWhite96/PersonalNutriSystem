import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getReportData } from "@/lib/reports.functions";
import { getProfile } from "@/lib/profile.functions";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { ptBR } from "date-fns/locale";
import { formatDateValue, getLocalDateKey } from "@/lib/datetime";
import { fmtNum } from "@/lib/format";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
});

type Row = {
  eaten_at: string;
  kcal: number | string;
  protein_g: number | string;
  carb_g: number | string;
  fat_g: number | string;
};

function RelatoriosPage() {
  const getReportsFn = useServerFn(getReportData);
  const getProfileFn = useServerFn(getProfile);
  const [days, setDays] = useState<number>(7);

  const { data: rows } = useQuery({
    queryKey: ["reports", days],
    queryFn: () => getReportsFn({ data: { days } }),
  });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getProfileFn() });

  const daily = aggregateByDay((rows ?? []) as Row[]);
  const totalMeals = rows?.length ?? 0;
  const maxKcal = [...daily].sort((a, b) => b.kcal - a.kcal)[0];
  const minKcal = [...daily].sort((a, b) => a.kcal - b.kcal)[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-3xl font-semibold">Relatórios</h1>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? "default" : "outline"}
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {/* Goal comparison */}
      {profile?.kcal_goal ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-serif text-lg font-semibold">Média x metas</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Compare label="kcal" avg={avg(daily, "kcal")} goal={profile.kcal_goal} />
            <Compare label="proteína" avg={avg(daily, "protein_g")} goal={profile.protein_g_goal} unit="g" />
            <Compare label="carbo" avg={avg(daily, "carb_g")} goal={profile.carb_g_goal} unit="g" />
            <Compare label="gordura" avg={avg(daily, "fat_g")} goal={profile.fat_g_goal} unit="g" />
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold">Calorias por dia</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="kcalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              <Area type="monotone" dataKey="kcal" stroke="var(--color-primary)" fill="url(#kcalFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold">Macros por dia</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              <Bar dataKey="protein_g" name="Proteína" fill="var(--macro-protein)" />
              <Bar dataKey="carb_g" name="Carbo" fill="var(--macro-carb)" />
              <Bar dataKey="fat_g" name="Gordura" fill="var(--macro-fat)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card title="Refeições registradas" value={fmtNum(totalMeals)} sub={`nos últimos ${days} dias`} />
        <Card
          title="Dia com mais calorias"
          value={maxKcal ? fmtNum(maxKcal.kcal) + " kcal" : "—"}
          sub={maxKcal ? maxKcal.dateLabel : ""}
        />
        <Card
          title="Dia com menos calorias"
          value={minKcal && minKcal.kcal > 0 ? fmtNum(minKcal.kcal) + " kcal" : "—"}
          sub={minKcal ? minKcal.dateLabel : ""}
        />
      </section>
    </div>
  );
}

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 font-serif text-2xl font-semibold tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function Compare({ label, avg, goal, unit }: { label: string; avg: number; goal?: number | null; unit?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-lg tabular-nums">
        {fmtNum(avg)}
        <span className="text-sm text-muted-foreground"> / {goal ? fmtNum(goal) : "—"}{unit ? " " + unit : ""}</span>
      </p>
    </div>
  );
}

function avg<K extends "kcal" | "protein_g" | "carb_g" | "fat_g">(rows: DailyRow[], key: K): number {
  if (!rows.length) return 0;
  return rows.reduce((s, r) => s + r[key], 0) / rows.length;
}

type DailyRow = { date: string; dateLabel: string; kcal: number; protein_g: number; carb_g: number; fat_g: number };

function aggregateByDay(rows: Row[]): DailyRow[] {
  const map = new Map<string, DailyRow>();
  for (const r of rows) {
    const date = getLocalDateKey(r.eaten_at);
    const entry = map.get(date) ?? {
      date,
      dateLabel: formatDateValue(date, "dd/MM", { locale: ptBR }),
      kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0,
    };
    entry.kcal += Number(r.kcal);
    entry.protein_g += Number(r.protein_g);
    entry.carb_g += Number(r.carb_g);
    entry.fat_g += Number(r.fat_g);
    map.set(date, entry);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
