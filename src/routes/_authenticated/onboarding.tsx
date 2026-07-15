import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { z } from "zod";
import { estimateDailyGoals, getProfile, upsertProfile } from "@/lib/profile.functions";
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
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand-mark";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

const formSchema = z.object({
  name: z.string().min(1, "Informe seu nome"),
  age: z.coerce.number().int().min(1, "Informe a idade").max(130),
  sex: z.enum(["masculino", "feminino", "outro"], { required_error: "Selecione o sexo" }),
  height_cm: z.coerce.number().min(50, "Altura inválida").max(260),
  weight_kg: z.coerce.number().min(20, "Peso inválido").max(400),
  activity_level: z.enum(["sedentario", "leve", "moderado", "intenso", "muito_intenso"], {
    required_error: "Selecione o nível de atividade",
  }),
  goal: z.enum(["emagrecer", "manter", "ganhar_massa", "outro"], {
    required_error: "Selecione um objetivo",
  }),
  assistant_name: z.string().min(1).max(40),
  kcal_goal: z.coerce.number().int().min(500, "Mínimo 500 kcal").max(8000).optional(),
  protein_g_goal: z.coerce.number().int().min(0).max(1000).optional(),
  carb_g_goal: z.coerce.number().int().min(0).max(2000).optional(),
  fat_g_goal: z.coerce.number().int().min(0).max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const PROFILE_FIELDS = [
  "name",
  "age",
  "sex",
  "height_cm",
  "weight_kg",
  "activity_level",
  "goal",
  "assistant_name",
] as const;

const GOAL_FIELDS = ["kcal_goal", "protein_g_goal", "carb_g_goal", "fat_g_goal"] as const;

function OnboardingPage() {
  const getProfileFn = useServerFn(getProfile);
  const upsertFn = useServerFn(upsertProfile);
  const estimateFn = useServerFn(estimateDailyGoals);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [estimating, setEstimating] = useState(false);
  const [estimateNote, setEstimateNote] = useState<string | null>(null);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getProfileFn() });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      assistant_name: "Nutri",
    },
    values: profile
      ? {
          name: profile.name ?? "",
          age: profile.age ?? undefined!,
          sex: (profile.sex as FormValues["sex"]) ?? undefined!,
          height_cm: profile.height_cm ? Number(profile.height_cm) : undefined!,
          weight_kg: profile.weight_kg ? Number(profile.weight_kg) : undefined!,
          activity_level: (profile.activity_level as FormValues["activity_level"]) ?? undefined!,
          goal: (profile.goal as FormValues["goal"]) ?? undefined!,
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
          name: values.name,
          age: values.age,
          sex: values.sex,
          height_cm: values.height_cm,
          weight_kg: values.weight_kg,
          activity_level: values.activity_level,
          goal: values.goal,
          assistant_name: values.assistant_name,
          kcal_goal: values.kcal_goal!,
          protein_g_goal: values.protein_g_goal!,
          carb_g_goal: values.carb_g_goal!,
          fat_g_goal: values.fat_g_goal!,
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

  async function goToGoalsStep() {
    const ok = await form.trigger([...PROFILE_FIELDS]);
    if (!ok) return;

    const values = form.getValues();
    setEstimating(true);
    try {
      const estimate = await estimateFn({
        data: {
          age: Number(values.age),
          sex: values.sex,
          height_cm: Number(values.height_cm),
          weight_kg: Number(values.weight_kg),
          activity_level: values.activity_level,
          goal: values.goal,
        },
      });

      form.setValue("kcal_goal", estimate.kcal_goal, { shouldValidate: true });
      form.setValue("protein_g_goal", estimate.protein_g_goal, { shouldValidate: true });
      form.setValue("carb_g_goal", estimate.carb_g_goal, { shouldValidate: true });
      form.setValue("fat_g_goal", estimate.fat_g_goal, { shouldValidate: true });
      setEstimateNote(estimate.rationale);
      setStep(2);

      toast.message("Metas estimadas através do seu perfil", {
        description:
          "Esses valores foram calculados com base nas suas informações. Você pode editar tudo antes de salvar.",
        duration: 6000,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível estimar as metas.");
    } finally {
      setEstimating(false);
    }
  }

  async function finishOnboarding() {
    const ok = await form.trigger([...PROFILE_FIELDS, ...GOAL_FIELDS]);
    if (!ok) return;

    const values = form.getValues();
    if (
      values.kcal_goal == null ||
      values.protein_g_goal == null ||
      values.carb_g_goal == null ||
      values.fat_g_goal == null
    ) {
      toast.error("Preencha todas as metas diárias.");
      return;
    }

    mutation.mutate(values);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <BrandMark size={32} />
      </div>

      <p className="text-xs uppercase tracking-wide text-muted-foreground">Passo {step} de 2</p>
      <h1 className="mt-1 font-serif text-3xl font-semibold">
        {step === 1 ? "Vamos te conhecer" : "Suas metas diárias"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {step === 1
          ? "Preencha seus dados. Na próxima etapa a IA estima suas metas."
          : "Revise e ajuste as metas estimadas. Nada é definitivo — edite o que quiser."}
      </p>

      <div className="mt-8 space-y-6">
        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Seu nome" error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} placeholder="Como quer ser chamado" />
            </Field>
            <Field
              label="Nome da sua assistente"
              error={form.formState.errors.assistant_name?.message}
            >
              <Input {...form.register("assistant_name")} placeholder="Nutri, Aya, Sofia..." />
            </Field>
            <Field label="Idade" error={form.formState.errors.age?.message}>
              <Input type="number" {...form.register("age", { valueAsNumber: true })} />
            </Field>
            <Field label="Sexo" error={form.formState.errors.sex?.message}>
              <Select
                onValueChange={(v) =>
                  form.setValue("sex", v as FormValues["sex"], { shouldValidate: true })
                }
                value={form.watch("sex")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Altura (cm)" error={form.formState.errors.height_cm?.message}>
              <Input type="number" step="0.1" {...form.register("height_cm", { valueAsNumber: true })} />
            </Field>
            <Field label="Peso atual (kg)" error={form.formState.errors.weight_kg?.message}>
              <Input type="number" step="0.1" {...form.register("weight_kg", { valueAsNumber: true })} />
            </Field>
            <Field
              label="Nível de atividade física"
              error={form.formState.errors.activity_level?.message}
            >
              <Select
                onValueChange={(v) =>
                  form.setValue("activity_level", v as FormValues["activity_level"], {
                    shouldValidate: true,
                  })
                }
                value={form.watch("activity_level")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentario">Sedentário</SelectItem>
                  <SelectItem value="leve">Leve (1-3x/sem)</SelectItem>
                  <SelectItem value="moderado">Moderado (3-5x/sem)</SelectItem>
                  <SelectItem value="intenso">Intenso (6-7x/sem)</SelectItem>
                  <SelectItem value="muito_intenso">Muito intenso</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Objetivo" error={form.formState.errors.goal?.message}>
              <Select
                onValueChange={(v) =>
                  form.setValue("goal", v as FormValues["goal"], { shouldValidate: true })
                }
                value={form.watch("goal")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emagrecer">Emagrecer</SelectItem>
                  <SelectItem value="manter">Manter peso</SelectItem>
                  <SelectItem value="ganhar_massa">Ganhar massa</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-1 flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <p className="text-xs font-medium uppercase tracking-wide">Estimado pela IA</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {estimateNote ??
                  "Metas calculadas a partir do seu perfil. Edite qualquer valor se preferir."}
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Calorias (kcal)" error={form.formState.errors.kcal_goal?.message}>
                  <Input type="number" {...form.register("kcal_goal", { valueAsNumber: true })} />
                </Field>
                <Field
                  label="Proteínas (g)"
                  error={form.formState.errors.protein_g_goal?.message}
                >
                  <Input type="number" {...form.register("protein_g_goal", { valueAsNumber: true })} />
                </Field>
                <Field label="Carboidratos (g)" error={form.formState.errors.carb_g_goal?.message}>
                  <Input type="number" {...form.register("carb_g_goal", { valueAsNumber: true })} />
                </Field>
                <Field label="Gorduras (g)" error={form.formState.errors.fat_g_goal?.message}>
                  <Input type="number" {...form.register("fat_g_goal", { valueAsNumber: true })} />
                </Field>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="gap-2 px-0 text-muted-foreground"
              onClick={() => setStep(1)}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar e ajustar meus dados
            </Button>
          </div>
        )}

        {step === 1 ? (
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={estimating}
            onClick={() => void goToGoalsStep()}
          >
            {estimating ? "Calculando metas..." : "Continuar e estimar metas"}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={mutation.isPending}
            onClick={() => void finishOnboarding()}
          >
            {mutation.isPending ? "Salvando..." : "Salvar e começar"}
          </Button>
        )}
      </div>
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
