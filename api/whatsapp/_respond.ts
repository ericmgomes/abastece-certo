import { AppState } from "../../src/domain";
import { LitroCertoMcpService } from "../../src/mcp/litroCertoService";
import { McpUserContext } from "../../src/mcp/supabaseAuth";
import {
  WhatsAppConversationItem,
  WhatsAppLinkRow,
  WhatsAppLinksRepository,
  whatsappServiceSupabase
} from "../../src/whatsapp/whatsappLinks";
import { assistantResponse } from "../assistant";

export async function answerConnectedWhatsAppMessage(link: WhatsAppLinkRow, text: string) {
  if (!link.owner_id) {
    return "Faça login pelo link de conexão antes de conversar comigo pelo WhatsApp.";
  }

  const service = new LitroCertoMcpService({
    token: "whatsapp",
    ownerId: link.owner_id,
    email: "",
    name: link.display_name ?? "Usuário",
    supabase: whatsappServiceSupabase()
  } satisfies McpUserContext);
  const [cars, stations, logs] = await Promise.all([
    service.listVehicles(),
    service.listStations(),
    service.listFuelLogs(500)
  ]);
  const state: AppState = {
    user: {
      name: link.display_name ?? "Usuário"
    },
    cars,
    stations,
    logs,
    selectedCarId: cars[0]?.id ?? null,
    filteredCarIds: cars.map((car) => car.id),
    themeMode: "light",
    themePalette: "blue",
    demoDataLoaded: false
  };
  const conversation = normalizedConversation(link.conversation);
  const response = await assistantResponse(text, state, conversation);
  await new WhatsAppLinksRepository().saveConversation(
    link.phone_number,
    nextConversation(conversation, text, response.answer)
  );

  if (!response.draftFuelLog) {
    return response.answer;
  }

  return `${response.answer}\n\nAinda não salvei pelo WhatsApp. Confira no app antes de registrar.`;
}

function normalizedConversation(conversation: WhatsAppLinkRow["conversation"]) {
  if (!Array.isArray(conversation)) {
    return [];
  }

  return conversation
    .filter((message): message is WhatsAppConversationItem =>
      (message?.role === "user" || message?.role === "assistant") &&
      typeof message.text === "string"
    )
    .slice(-12)
    .map((message) => ({
      role: message.role,
      text: message.text.slice(0, 800)
    }));
}

function nextConversation(
  conversation: Array<{ role?: "assistant" | "user"; text?: string }>,
  userText: string,
  assistantText: string
): WhatsAppConversationItem[] {
  const now = new Date().toISOString();
  return [
    ...conversation.map((message) => ({
      role: message.role === "assistant" ? "assistant" as const : "user" as const,
      text: sanitizeConversationText(message.text),
      at: now
    })),
    {
      role: "user" as const,
      text: sanitizeConversationText(userText),
      at: now
    },
    {
      role: "assistant" as const,
      text: sanitizeConversationText(assistantText),
      at: now
    }
  ].slice(-16);
}

function sanitizeConversationText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 800);
}
