import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getChatHistory, clearChatHistory } from "@/lib/chat.functions";
import { saveMeal } from "@/lib/meals.functions";
import { getProfile } from "@/lib/profile.functions";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputButton,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { MealSummaryCard } from "@/components/meal-summary-card";
import { Button } from "@/components/ui/button";
import { ImageIcon, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

function ChatPage() {
  const getHistoryFn = useServerFn(getChatHistory);
  const clearFn = useServerFn(clearChatHistory);
  const saveMealFn = useServerFn(saveMeal);
  const getProfileFn = useServerFn(getProfile);
  const qc = useQueryClient();
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getProfileFn() });
  const assistantName = profile?.assistant_name || "Nutri";

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ["chat-history"],
    queryFn: () => getHistoryFn(),
  });

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthHeader(data.session?.access_token ? `Bearer ${data.session.access_token}` : null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthHeader(session?.access_token ? `Bearer ${session.access_token}` : null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: authHeader ? { Authorization: authHeader } : {},
      }),
    [authHeader],
  );

  const initialMessages = useMemo(
    () => (history as UIMessage[] | undefined) ?? [],
    [history],
  );

  const { messages, sendMessage, status } = useChat({
    id: "main",
    messages: initialMessages,
    transport,
    onError: (e) => toast.error(e.message || "Erro na conversa."),
  });

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [messages.length]);

  async function handleSaveMeal(part: {
    meal_type: "cafe_manha" | "almoco" | "lanche" | "jantar" | "outro";
    title: string;
    items: Array<{ name: string; quantity?: number; unit?: string; kcal?: number; protein_g?: number; carb_g?: number; fat_g?: number }>;
    kcal: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
    original_message?: string;
  }, key: string) {
    setSaving(key);
    try {
      await saveMealFn({
        data: {
          meal_type: part.meal_type,
          title: part.title,
          kcal: part.kcal,
          protein_g: part.protein_g,
          carb_g: part.carb_g,
          fat_g: part.fat_g,
          items: part.items,
          original_message: part.original_message ?? null,
        },
      });
      toast.success("Refeição salva!");
      qc.invalidateQueries({ queryKey: ["daily-totals"] });
      qc.invalidateQueries({ queryKey: ["meals"] });
      // Nudge assistant
      sendMessage({ text: `Salvei "${part.title}". Obrigado!` });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(null);
    }
  }

  async function handleClear() {
    if (!confirm("Apagar todo o histórico da conversa?")) return;
    await clearFn();
    qc.invalidateQueries({ queryKey: ["chat-history"] });
    window.location.reload();
  }

  const isLoading = status === "submitted" || status === "streaming";
  const isEmpty = !loadingHistory && messages.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-4 md:h-screen md:px-8 md:py-6">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Conversa com</p>
          <h1 className="font-serif text-2xl font-semibold">{assistantName}</h1>
        </div>
        {messages.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={handleClear} className="gap-2 text-muted-foreground">
            <Trash2 className="h-4 w-4" /> Nova conversa
          </Button>
        ) : null}
      </header>

      <Conversation className="flex-1 overflow-hidden rounded-2xl">
        <ConversationContent>
          {isEmpty ? (
            <div className="mx-auto max-w-md px-6 py-12 text-center">
              <p className="font-serif text-lg">Olá! Sou {assistantName}.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Conte o que você comeu como se estivesse falando com um amigo. Eu monto a estimativa
                e você confirma antes de salvar.
              </p>
              <div className="mt-6 space-y-2 text-left text-sm">
                {[
                  "Hoje no café tomei um copo de leite com 2 pães na chapa",
                  "Almocei arroz, feijão e frango grelhado",
                  "Meu café de sempre",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage({ text: s })}
                    className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((m) => (
            <Message from={m.role as "user" | "assistant"} key={m.id}>
              <MessageContent>
                {m.parts.map((part, i) => {
                  const key = `${m.id}-${i}`;
                  if (part.type === "text") {
                    if (m.role === "assistant") {
                      return <MessageResponse key={key}>{part.text}</MessageResponse>;
                    }
                    return <p key={key} className="whitespace-pre-wrap">{part.text}</p>;
                  }
                  if (part.type === "file") {
                    return (
                      <div
                        key={key}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        {part.filename || "Imagem enviada"}
                      </div>
                    );
                  }
                  if (part.type === "tool-estimarRefeicao" || part.type === "dynamic-tool") {
                    const p = part as unknown as { output?: MealEstimate; state?: string };
                    if (p.output && p.state === "output-available") {
                      return (
                        <MealSummaryCard
                          key={key}
                          estimate={p.output}
                          saving={saving === key}
                          onSave={() => handleSaveMeal(p.output!, key)}
                        />
                      );
                    }
                    return null;
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}

          {isLoading ? (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Pensando...</Shimmer>
              </MessageContent>
            </Message>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        accept="image/*"
        maxFiles={1}
        onError={(error) => toast.error(error.message)}
        onSubmit={(message, event) => {
          event.preventDefault();
          const text = message.text?.trim();
          if ((!text && message.files.length === 0) || isLoading) return;
          if (message.files.length > 0 && text) {
            sendMessage({ text, files: message.files });
          } else if (message.files.length > 0) {
            sendMessage({ files: message.files });
          } else if (text) {
            sendMessage({ text });
          }
          setInput("");
        }}
        className="mt-3"
      >
        <PendingAttachments />
        <PromptInputTextarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Conte o que você comeu..."
          disabled={!authHeader}
        />
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger
                disabled={!authHeader || isLoading}
                tooltip="Enviar imagem"
              />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments label="Escolher imagem" />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
          </PromptInputTools>
          <ChatSubmitButton
            authReady={Boolean(authHeader)}
            input={input}
            isLoading={isLoading}
            status={status}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

type MealEstimate = {
  meal_type: "cafe_manha" | "almoco" | "lanche" | "jantar" | "outro";
  title: string;
  original_message?: string;
  items: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    kcal?: number;
    protein_g?: number;
    carb_g?: number;
    fat_g?: number;
  }>;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

function PendingAttachments() {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {attachments.files.map((file) => (
        <div
          key={file.id}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span>{file.filename || "Imagem pronta para envio"}</span>
          <PromptInputButton
            className="h-auto min-h-0 rounded-full p-0 text-muted-foreground hover:text-foreground"
            onClick={() => attachments.remove(file.id)}
            size="icon-sm"
            tooltip="Remover imagem"
          >
            <X className="h-3.5 w-3.5" />
          </PromptInputButton>
        </div>
      ))}
    </div>
  );
}

function ChatSubmitButton({
  authReady,
  input,
  isLoading,
  status,
}: {
  authReady: boolean;
  input: string;
  isLoading: boolean;
  status: Parameters<typeof PromptInputSubmit>[0]["status"];
}) {
  const attachments = usePromptInputAttachments();
  const disabled = (!input.trim() && attachments.files.length === 0) || isLoading || !authReady;

  return <PromptInputSubmit status={status} disabled={disabled} />;
}
