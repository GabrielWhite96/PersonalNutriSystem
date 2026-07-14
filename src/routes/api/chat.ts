import { createFileRoute } from "@tanstack/react-router";
import {
  extractTextFromMessage,
  getCurrentMealConversationText,
  messageHasFile,
  sanitizeMessageForStorage,
} from "@/lib/chat-message-utils";
import { createGeminiProvider } from "@/lib/gemini.server";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai";
import { z } from "zod";

const PHOTO_FEATURE_MESSAGE =
  "Essa funcionalidade ainda esta em desenvolvimento e sera disponibilizada em uma versao futura.";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length);

        const SUPABASE_URL =
          process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY =
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !GEMINI_API_KEY) {
          return new Response("Server misconfigured", { status: 500 });
        }

        // Verify token + get user id
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: {
            headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_PUBLISHABLE_KEY },
          },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        // Load profile for assistant personalization
        const { data: profile } = await supabase
          .from("profiles")
          .select("assistant_name, name, kcal_goal, protein_g_goal, carb_g_goal, fat_g_goal, goal")
          .eq("id", userId)
          .maybeSingle();
        const assistantName = profile?.assistant_name || "Nutri";

        const body = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(body.messages)) {
          return new Response("Missing messages", { status: 400 });
        }
        const messages = body.messages as UIMessage[];
        const latestUser = [...messages].reverse().find((m) => m.role === "user");
        const originalMessage =
          getCurrentMealConversationText(messages) ||
          (latestUser ? extractTextFromMessage(latestUser) : undefined);

        if (latestUser) {
          await supabase.from("chat_messages").insert({
            user_id: userId,
            role: "user",
            content: sanitizeMessageForStorage(latestUser) as unknown as Record<string, unknown>,
          });
        }

        if (latestUser && messageHasFile(latestUser)) {
          return createStaticAssistantResponse(messages, PHOTO_FEATURE_MESSAGE, async (responseMessage) => {
            await supabase.from("chat_messages").insert({
              user_id: userId,
              role: "assistant",
              content: responseMessage as unknown as Record<string, unknown>,
            });
          });
        }

        const gemini = createGeminiProvider(GEMINI_API_KEY);
        const model = gemini(GEMINI_MODEL);

        const today = new Date().toISOString();

        const systemPrompt = `Você é ${assistantName}, uma assistente pessoal brasileira de registro alimentar do usuário${profile?.name ? " " + profile.name : ""}.

Sua função é interpretar refeições descritas em linguagem natural, estimar valores nutricionais médios e ajudar a salvar no diário.

Regras:
- Fale sempre em português do Brasil, de forma leve e objetiva.
- Nunca dê dicas nutricionais sem que o usuário peça explicitamente.
- Quando o usuário descrever uma refeição, use a ferramenta "estimarRefeicao" para gerar um resumo com valores estimados. O card gerado tem um botão "Salvar" — NÃO salve automaticamente, apenas gere a estimativa e peça a confirmação em uma frase curta ("Posso salvar?").
- Se faltar informação importante, faça no máximo 1 ou 2 perguntas curtas. Se o usuário disser que não sabe, estime valores médios e diga isso ("vou considerar uma quantidade média").
- Se o usuário não informar quantidade, você pode consultar "buscarPreferenciasUsuario" para usar porções que ele costuma registrar. Quando fizer isso, deixe claro que foi uma suposição baseada no histórico dele.
- Identifique o tipo de refeição pelo texto ("almoço", "café da manhã"). Se não estiver claro, pergunte uma vez qual refeição é. Valores possíveis: cafe_manha, almoco, lanche, jantar, outro.
- Se o usuário disser "meu café de sempre", "igual ontem" ou similar, use "buscarRefeicaoSimilar" primeiro. Se ainda faltar contexto, consulte "buscarPreferenciasUsuario".
- Se o usuário enviar uma imagem, responda exatamente: "${PHOTO_FEATURE_MESSAGE}" e não gere estimativa.
- Se pedirem dicas ou análise, aí sim você pode responder normalmente.
- Data e hora agora: ${today}.
- Metas do usuário: ${profile?.kcal_goal ? `${profile.kcal_goal} kcal, ${profile.protein_g_goal ?? "?"}g proteína, ${profile.carb_g_goal ?? "?"}g carbo, ${profile.fat_g_goal ?? "?"}g gordura` : "sem metas definidas"}.

Sempre use valores nutricionais médios conhecidos (por ex.: 1 pão francês ≈ 140 kcal; 100g arroz cozido ≈ 130 kcal; 100g frango grelhado ≈ 165 kcal; 200ml leite integral ≈ 120 kcal).

Nunca invente ingredientes que o usuário não mencionou. Se ele disse "arroz e frango", não adicione feijão.`;

        const tools = {
          estimarRefeicao: tool({
            description:
              "Gera um card de resumo da refeição com valores nutricionais estimados. Use após interpretar o que o usuário comeu. Isso NÃO salva a refeição — o usuário confirma pelo botão do card.",
            inputSchema: z.object({
              meal_type: z
                .enum(["cafe_manha", "almoco", "lanche", "jantar", "outro"])
                .describe("Tipo da refeição"),
              title: z
                .string()
                .describe(
                  "Título curto da refeição, ex.: 'Café da manhã de segunda' ou 'Almoço em casa'",
                ),
              items: z.array(
                z.object({
                  name: z.string().describe("Nome do alimento"),
                  quantity: z.number().optional().describe("Quantidade estimada"),
                  unit: z.string().optional().describe("Unidade (g, ml, unidade)"),
                  kcal: z.number().optional(),
                  protein_g: z.number().optional(),
                  carb_g: z.number().optional(),
                  fat_g: z.number().optional(),
                }),
              ),
              kcal: z.number().describe("Total estimado de calorias"),
              protein_g: z.number().describe("Total de proteínas em gramas"),
              carb_g: z.number().describe("Total de carboidratos em gramas"),
              fat_g: z.number().describe("Total de gorduras em gramas"),
            }),
            execute: async (input) => ({
              ...input,
              original_message: originalMessage,
            }),
          }),
          buscarRefeicaoSimilar: tool({
            description:
              "Busca refeições registradas anteriormente pelo usuário. Use quando ele disser 'meu café de sempre', 'igual ontem', 'a mesma coisa'.",
            inputSchema: z.object({
              meal_type: z
                .enum(["cafe_manha", "almoco", "lanche", "jantar", "outro"])
                .optional()
                .describe("Filtrar por tipo, se souber"),
            }),
            execute: async ({ meal_type }) => {
              let q = supabase
                .from("meals")
                .select("title, meal_type, items, kcal, protein_g, carb_g, fat_g, eaten_at")
                .eq("user_id", userId)
                .order("eaten_at", { ascending: false })
                .limit(5);
              if (meal_type) q = q.eq("meal_type", meal_type);
              const { data, error } = await q;
              if (error) return { error: error.message };
              return { meals: data ?? [] };
            },
          }),
          buscarPreferenciasUsuario: tool({
            description:
              "Busca preferencias e porcoes que o usuario costuma registrar. Use quando ele nao informar quantidades ou falar de itens que costuma repetir.",
            inputSchema: z.object({
              query: z
                .string()
                .optional()
                .describe("Texto curto com os alimentos ou habitos que voce quer procurar"),
            }),
            execute: async ({ query }) => {
              const { data, error } = await supabase
                .from("user_food_preferences")
                .select("key, summary, items, updated_at")
                .eq("user_id", userId)
                .order("updated_at", { ascending: false })
                .limit(20);
              if (error) return { error: error.message };

              const tokens = (query ?? "")
                .toLowerCase()
                .split(/\s+/)
                .map((token) => token.trim())
                .filter(Boolean);

              const preferences = (data ?? [])
                .filter((row) => {
                  if (tokens.length === 0) return true;
                  const haystack = `${row.key} ${row.summary} ${JSON.stringify(row.items)}`.toLowerCase();
                  return tokens.some((token) => haystack.includes(token));
                })
                .slice(0, 5);

              return { preferences };
            },
          }),
        };

        try {
          const modelMessages = await convertToModelMessages(messages);
          const result = streamText({
            model,
            system: systemPrompt,
            messages: modelMessages,
            tools,
            stopWhen: stepCountIs(5),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages,
            onFinish: async ({ responseMessage }) => {
              try {
                await supabase.from("chat_messages").insert({
                  user_id: userId,
                  role: "assistant",
                  content: sanitizeMessageForStorage(responseMessage) as unknown as Record<string, unknown>,
                });
              } catch (e) {
                console.error("Failed to persist assistant message", e);
              }
            },
          });
        } catch (error) {
          console.error("[chat] Gemini request failed", error);
          return new Response(formatAIProviderError(error), { status: 502 });
        }
      },
    },
  },
});

function formatAIProviderError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (/limit:\s*0/i.test(message)) {
    return "Seu projeto Gemini não tem cota gratuita ativa neste modelo. No .env.local use GEMINI_MODEL=gemini-2.5-flash-lite ou gere uma chave nova em aistudio.google.com/apikey (projeto com Free tier).";
  }
  if (/insufficient_quota|exceeded your current quota|RESOURCE_EXHAUSTED|quota/i.test(message)) {
    return "Cota do Gemini esgotada. Aguarde alguns minutos ou troque GEMINI_MODEL para gemini-2.5-flash-lite.";
  }
  if (/API[_ ]?key|invalid.*key|403|PERMISSION_DENIED/i.test(message)) {
    return "GEMINI_API_KEY inválida. Confira a chave no .env.local e reinicie o servidor.";
  }
  if (/rate limit|429/i.test(message)) {
    return "Limite de requisições do Gemini atingido. Aguarde um pouco e tente de novo.";
  }

  return message || "Falha ao falar com o Gemini.";
}

function createStaticAssistantResponse(
  originalMessages: UIMessage[],
  text: string,
  onEnd: (responseMessage: UIMessage) => Promise<void>,
) {
  const stream = createUIMessageStream({
    originalMessages,
    execute: ({ writer }) => {
      const textId = "assistant-static-message";
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: text });
      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "finish", finishReason: "stop" });
    },
    onEnd: async ({ responseMessage }) => {
      await onEnd(responseMessage);
    },
  });

  return createUIMessageStreamResponse({ stream });
}
