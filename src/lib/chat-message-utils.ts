import type { UIMessage } from "ai";

export function extractTextFromMessage(message: UIMessage): string | undefined {
  const text = message.parts
    .filter((part): part is Extract<UIMessage["parts"][number], { type: "text" }> => part.type === "text")
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
  return text || undefined;
}

export function getCurrentMealConversationText(messages: UIMessage[]): string | undefined {
  const collected: string[] = [];

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (
      message.role === "assistant" &&
      message.parts.some((part) => part.type === "tool-estimarRefeicao" || part.type === "dynamic-tool")
    ) {
      break;
    }

    if (message.role !== "user") continue;
    const text = extractTextFromMessage(message);
    if (text) collected.push(text);
    else if (messageHasFile(message)) collected.push("[Foto da refeição]");
  }

  const combined = collected.reverse().join("\n").trim();
  return combined || undefined;
}

export function messageHasFile(message: UIMessage): boolean {
  return message.parts.some((part) => part.type === "file");
}

export function sanitizeMessageForStorage(message: UIMessage): UIMessage {
  return {
    ...message,
    parts: message.parts.flatMap((part) => {
      if (part.type !== "file") return [part];

      return [
        {
          type: "text" as const,
          text: part.mediaType.startsWith("image/")
            ? "[Imagem enviada nao salva]"
            : "[Arquivo enviado nao salvo]",
        },
      ];
    }),
  };
}
