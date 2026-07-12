import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getProfile, upsertProfile } from "@/lib/profile.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sprout } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

const schema = z.object({
  name: z.string().min(1, "Informe seu nome"),
  age: z.coerce.number().int().min(1).max(130),
  sex: z.enum(["masculino", "feminino", "outro"]),
  height_cm: z.coerce.number().min(50).max(260),
  weight_kg: z.coerce.number().min(20).max(400),
  activity_level: z.enum(["sedentario", "leve", "moderado", "intenso", "muito_intenso"]),
  goal: z.enum(["emagrecer", "manter", "ganhar_massa", "outro"]).optional(),
  assistant_name: z.string().min(1).max(40),
  kcal_goal: z.coerce.number().int().min(0).max(8000).optional(),
  protein_g_goal: z.coerce.number().int().min(0).max(1000).optional(),
  carb_g_goal: z.coerce.number().int().min(0).max(2000).optional(),
  fat_g_goal: z.coerce.number().int().min(0).max(500).optional(),
});
type FormValues = z.infer<typeof schema>;

function OnboardingPage() {
  const getProfileFn = useServerFn(getProfile);
  const upsertFn = useServerFn(upsertProfile);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getProfileFn() });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile?.name ?? "",
      assistant_name: profile?.assistant_name ?? "Nutri",
    },
    values: profile
      ? {
          name: profile.name ?? "",
          age: profile.age ?? undefined!,
          sex: (profile.sex as FormValues["sex"]) ?? undefined!,
          height_cm: profile.height_cm ? Number(profile.height_cm) : undefined!,
          weight_kg: profile.weight_kg ? Number(profile.weight_kg) : undefined!,
          activity_level: (profile.activity_level as FormValues["activity_level"]) ?? undefined!,
          goal: (profile.goal as FormValues["goal"]) ?? undefined,
          assistant_name: profile.assistant_name ?? "Nutri",
          kcal_goal: profile.kcal_goal ?? undefined,
          protein_g_goal: profile.protein_g_goal ?? undefined,
          carb_g_goal: profile.carb_g_goal ?? undefined,
          fat_g_goal: profile.fat_g_goal ?? undefined,
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      return upsertFn({
        data: {
          ...values,
          goal: values.goal ?? null,
          kcal_goal: values.kcal_goal || null,
          protein_g_goal: values.protein_g_goal || null,
          carb_g_goal: values.carb_g_goal || null,
          fat_g_goal: values.fat_g_goal || null,
          markOnboarded: true,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Perfil salvo!");
      navigate({ to: "/home", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 flex items-center gap-2">
        <Sprout className="h-6 w-6 text-primary" />
        <span className="font-serif text-xl font-semibold">Nutri</span>
      </div>
      <h1 className="font-serif text-3xl font-semibold">Vamos te conhecer</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Isso ajuda a IA a fazer estimativas mais consistentes para você.
      </p>

      <form
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        className="mt-8 space-y-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Seu nome" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="Como quer ser chamado" />
          </Field>
          <Field label="Nome da sua assistente" error={form.formState.errors.assistant_name?.message}>
            <Input {...form.register("assistant_name")} placeholder="Nutri, Aya, Sofia..." />
          </Field>
          <Field label="Idade" error={form.formState.errors.age?.message}>
            <Input type="number" {...form.register("age")} />
          </Field>
          <Field label="Sexo" error={form.formState.errors.sex?.message}>
            <Select onValueChange={(v) => form.setValue("sex", v as FormValues["sex"])} value={form.watch("sex")}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Altura (cm)" error={form.formState.errors.height_cm?.message}>
            <Input type="number" step="0.1" {...form.register("height_cm")} />
          </Field>
          <Field label="Peso atual (kg)" error={form.formState.errors.weight_kg?.message}>
            <Input type="number" step="0.1" {...form.register("weight_kg")} />
          </Field>
          <Field label="Nível de atividade física" error={form.formState.errors.activity_level?.message}>
            <Select
              onValueChange={(v) => form.setValue("activity_level", v as FormValues["activity_level"])}
              value={form.watch("activity_level")}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentario">Sedentário</SelectItem>
                <SelectItem value="leve">Leve (1-3x/sem)</SelectItem>
                <SelectItem value="moderado">Moderado (3-5x/sem)</SelectItem>
                <SelectItem value="intenso">Intenso (6-7x/sem)</SelectItem>
                <SelectItem value="muito_intenso">Muito intenso</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Objetivo (opcional)">
            <Select onValueChange={(v) => form.setValue("goal", v as FormValues["goal"])} value={form.watch("goal") ?? undefined}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="emagrecer">Emagrecer</SelectItem>
                <SelectItem value="manter">Manter peso</SelectItem>
                <SelectItem value="ganhar_massa">Ganhar massa</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-serif text-lg font-semibold">Metas diárias (opcional)</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Deixe em branco se preferir não definir metas agora.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <Field label="Calorias"><Input type="number" {...form.register("kcal_goal")} placeholder="2000" /></Field>
            <Field label="Proteínas (g)"><Input type="number" {...form.register("protein_g_goal")} placeholder="150" /></Field>
            <Field label="Carbo (g)"><Input type="number" {...form.register("carb_g_goal")} placeholder="200" /></Field>
            <Field label="Gorduras (g)"><Input type="number" {...form.register("fat_g_goal")} placeholder="65" /></Field>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Começar"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
