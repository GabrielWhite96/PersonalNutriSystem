export function fmtNum(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "0";
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export const MEAL_LABEL: Record<string, string> = {
  cafe_manha: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  outro: "Outro",
};

export const ACTIVITY_LABEL: Record<string, string> = {
  sedentario: "Sedentário",
  leve: "Leve",
  moderado: "Moderado",
  intenso: "Intenso",
  muito_intenso: "Muito intenso",
};

export const GOAL_LABEL: Record<string, string> = {
  emagrecer: "Emagrecer",
  manter: "Manter peso",
  ganhar_massa: "Ganhar massa",
  outro: "Outro",
};

export const SEX_LABEL: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  outro: "Outro",
};
