import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getProfile, upsertProfile } from "@/lib/profile.functions";
import { listWeightLogs, logWeight } from "@/lib/weight.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { toast } from "sonner";
import { ACTIVITY_LABEL, GOAL_LABEL, SEX_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  const getProfileFn = useServerFn(getProfile);
  const upsertFn = useServerFn(upsertProfile);
  const listWeightsFn = useServerFn(listWeightLogs);
  const logWeightFn = useServerFn(logWeight);
  const qc = useQueryClient();

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getProfileFn() });
  const { data: weights } = useQuery({
    queryKey: ["weight-logs"],
    queryFn: () => listWeightsFn(),
  });

  const [editing, setEditing] = useState(false);
  const [newWeight, setNewWeight] = useState("");

  const logWeightMut = useMutation({
    mutationFn: async (w: number) => logWeightFn({ data: { weight_kg: w } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weight-logs"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      setNewWeight("");
      toast.success("Peso registrado");
    },
  });

  const chartData = (weights ?? []).map((w) => ({
    date: format(new Date(w.logged_at), "dd/MM"),
    kg: Number(w.weight_kg),
  }));

  if (!profile) return <div className="p-8 text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <h1 className="font-serif text-3xl font-semibold">Perfil</h1>

      {/* Weight tracker */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-lg font-semibold">Evolução do peso</h2>
          <span className="tabular-nums text-sm text-muted-foreground">
            Atual: <span className="font-medium text-foreground">{profile.weight_kg ?? "—"} kg</span>
          </span>
        </div>

        {chartData.length > 1 ? (
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Registre seu peso mais de uma vez para ver a evolução.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <Input
            type="number"
            step="0.1"
            placeholder="Novo peso (kg)"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            className="flex-1"
          />
          <Button
            disabled={!newWeight || logWeightMut.isPending}
            onClick={() => logWeightMut.mutate(Number(newWeight))}
          >
            Registrar
          </Button>
        </div>
      </section>

      {/* Details */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-lg font-semibold">Seus dados</h2>
          <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancelar" : "Editar"}
          </Button>
        </div>

        {editing ? (
          <EditForm
            profile={profile}
            onSave={async (v) => {
              await upsertFn({ data: { ...v } });
              qc.invalidateQueries({ queryKey: ["profile"] });
              qc.invalidateQueries({ queryKey: ["weight-logs"] });
              toast.success("Perfil atualizado");
              setEditing(false);
            }}
          />
        ) : (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Nome" value={profile.name} />
            <Info label="Assistente" value={profile.assistant_name} />
            <Info label="Idade" value={profile.age?.toString()} />
            <Info label="Sexo" value={profile.sex ? SEX_LABEL[profile.sex] : null} />
            <Info label="Altura" value={profile.height_cm ? `${profile.height_cm} cm` : null} />
            <Info label="Peso" value={profile.weight_kg ? `${profile.weight_kg} kg` : null} />
            <Info label="Atividade" value={profile.activity_level ? ACTIVITY_LABEL[profile.activity_level] : null} />
            <Info label="Objetivo" value={profile.goal ? GOAL_LABEL[profile.goal] : null} />
            <Info label="Meta calorias" value={profile.kcal_goal ? `${profile.kcal_goal} kcal` : "—"} />
            <Info label="Meta proteína" value={profile.protein_g_goal ? `${profile.protein_g_goal} g` : "—"} />
            <Info label="Meta carbo" value={profile.carb_g_goal ? `${profile.carb_g_goal} g` : "—"} />
            <Info label="Meta gordura" value={profile.fat_g_goal ? `${profile.fat_g_goal} g` : "—"} />
          </dl>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value || "—"}</dd>
    </div>
  );
}

type Profile = {
  name: string | null;
  age: number | null;
  sex: "masculino" | "feminino" | "outro" | null;
  height_cm: number | string | null;
  weight_kg: number | string | null;
  activity_level: "sedentario" | "leve" | "moderado" | "intenso" | "muito_intenso" | null;
  goal: "emagrecer" | "manter" | "ganhar_massa" | "outro" | null;
  assistant_name: string;
  kcal_goal: number | null;
  protein_g_goal: number | null;
  carb_g_goal: number | null;
  fat_g_goal: number | null;
};

function EditForm({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (v: {
    name: string; age: number; sex: "masculino" | "feminino" | "outro";
    height_cm: number; weight_kg: number;
    activity_level: "sedentario" | "leve" | "moderado" | "intenso" | "muito_intenso";
    goal?: "emagrecer" | "manter" | "ganhar_massa" | "outro" | null;
    assistant_name: string;
    kcal_goal?: number | null;
    protein_g_goal?: number | null;
    carb_g_goal?: number | null;
    fat_g_goal?: number | null;
  }) => Promise<void>;
}) {
  const [v, setV] = useState({
    name: profile.name ?? "",
    age: profile.age ?? 0,
    sex: profile.sex ?? "outro",
    height_cm: Number(profile.height_cm ?? 0),
    weight_kg: Number(profile.weight_kg ?? 0),
    activity_level: profile.activity_level ?? "moderado",
    goal: profile.goal,
    assistant_name: profile.assistant_name,
    kcal_goal: profile.kcal_goal,
    protein_g_goal: profile.protein_g_goal,
    carb_g_goal: profile.carb_g_goal,
    fat_g_goal: profile.fat_g_goal,
  });

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <F label="Nome"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></F>
      <F label="Assistente"><Input value={v.assistant_name} onChange={(e) => setV({ ...v, assistant_name: e.target.value })} /></F>
      <F label="Idade"><Input type="number" value={v.age} onChange={(e) => setV({ ...v, age: Number(e.target.value) })} /></F>
      <F label="Sexo">
        <Select value={v.sex} onValueChange={(x) => setV({ ...v, sex: x as typeof v.sex })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="masculino">Masculino</SelectItem>
            <SelectItem value="feminino">Feminino</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </F>
      <F label="Altura (cm)"><Input type="number" step="0.1" value={v.height_cm} onChange={(e) => setV({ ...v, height_cm: Number(e.target.value) })} /></F>
      <F label="Peso (kg)"><Input type="number" step="0.1" value={v.weight_kg} onChange={(e) => setV({ ...v, weight_kg: Number(e.target.value) })} /></F>
      <F label="Atividade">
        <Select value={v.activity_level} onValueChange={(x) => setV({ ...v, activity_level: x as typeof v.activity_level })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(ACTIVITY_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </F>
      <F label="Objetivo">
        <Select value={v.goal ?? undefined} onValueChange={(x) => setV({ ...v, goal: x as typeof v.goal })}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {Object.entries(GOAL_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </F>
      <F label="Meta kcal"><Input type="number" value={v.kcal_goal ?? ""} onChange={(e) => setV({ ...v, kcal_goal: e.target.value ? Number(e.target.value) : null })} /></F>
      <F label="Meta proteína (g)"><Input type="number" value={v.protein_g_goal ?? ""} onChange={(e) => setV({ ...v, protein_g_goal: e.target.value ? Number(e.target.value) : null })} /></F>
      <F label="Meta carbo (g)"><Input type="number" value={v.carb_g_goal ?? ""} onChange={(e) => setV({ ...v, carb_g_goal: e.target.value ? Number(e.target.value) : null })} /></F>
      <F label="Meta gordura (g)"><Input type="number" value={v.fat_g_goal ?? ""} onChange={(e) => setV({ ...v, fat_g_goal: e.target.value ? Number(e.target.value) : null })} /></F>
      <div className="sm:col-span-2">
        <Button className="w-full" onClick={() => onSave(v)}>Salvar</Button>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
