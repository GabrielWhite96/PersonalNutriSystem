import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import {
  getCurrentMealConversationText,
  messageHasFile,
  sanitizeMessageForStorage,
} from "@/lib/chat-message-utils";

describe("chat message utils", () => {
  it("sanitizes file attachments before persistence", () => {
    const message = {
      id: "1",
      role: "user",
      parts: [
        {
          type: "file",
          filename: "cafe.png",
          mediaType: "image/png",
          url: "data:image/png;base64,abc",
        },
        {
          type: "text",
          text: "Tira isso depois",
        },
      ],
    } satisfies UIMessage;

    expect(messageHasFile(message)).toBe(true);
    expect(sanitizeMessageForStorage(message)).toEqual({
      ...message,
      parts: [
        {
          type: "text",
          text: "[Imagem enviada nao salva]",
        },
        {
          type: "text",
          text: "Tira isso depois",
        },
      ],
    });
  });

  it("collects the current meal conversation until the previous estimate card", () => {
    const messages = [
      {
        id: "previous-user",
        role: "user",
        parts: [{ type: "text", text: "Cafe da manha de ontem" }],
      },
      {
        id: "previous-assistant",
        role: "assistant",
        parts: [
          {
            type: "tool-estimarRefeicao",
            state: "output-available",
            output: { title: "Cafe" },
          },
        ],
      } as unknown as UIMessage,
      {
        id: "current-user-1",
        role: "user",
        parts: [{ type: "text", text: "Hoje no cafe comi pao com manteiga" }],
      },
      {
        id: "question",
        role: "assistant",
        parts: [{ type: "text", text: "Quantos paes aproximadamente?" }],
      },
      {
        id: "current-user-2",
        role: "user",
        parts: [{ type: "text", text: "2 paes" }],
      },
    ] satisfies UIMessage[];

    expect(getCurrentMealConversationText(messages)).toBe(
      "Hoje no cafe comi pao com manteiga\n2 paes",
    );
  });
});
