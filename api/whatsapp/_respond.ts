import { AppState, FuelType, fuels } from "../../src/domain";
import { LitroCertoMcpService } from "../../src/mcp/litroCertoService";
import { McpUserContext } from "../../src/mcp/supabaseAuth";
import {
  WhatsAppConversationItem,
  WhatsAppLinkRow,
  WhatsAppLinksRepository,
  WhatsAppPendingFuelLog,
  whatsappServiceSupabase
} from "../../src/whatsapp/whatsappLinks";
import { assistantResponse } from "../assistant";

export async function answerConnectedWhatsAppMessage(link: WhatsAppLinkRow, text: string) {
  if (!link.owner_id) {
    return "Faça login pelo link de conexão antes de conversar comigo pelo WhatsApp.";
  }

  const links = new WhatsAppLinksRepository();
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
  const pending = normalizedPendingFuelLog(link.pending_fuel_log);
  if (isConfirmation(text)) {
    if (!pending) {
      return "Não encontrei um abastecimento preparado para confirmar. Envie os dados do abastecimento primeiro.";
    }

    const validation = validatePendingFuelLog(pending);
    if (validation.length) {
      return `Ainda falta informar: ${validation.join(", ")}.`;
    }

    const log = await service.createFuelLog({
      carId: pending.carId!,
      stationId: pending.stationId!,
      fuel: pending.fuel as FuelType,
      paid: pending.paid!,
      liters: pending.liters!,
      odometerKm: pending.odometerKm,
      createdAt: pending.createdAt
    });
    const answer = `Abastecimento #${log.sequence ?? ""} registrado: R$ ${formatNumber(log.paid)} em ${formatNumber(log.liters)} L (${formatNumber(log.pricePerLiter)}/L).`;
    await links.saveSession(link.phone_number, {
      conversation: nextConversation(normalizedConversation(link.conversation), text, answer),
      pendingFuelLog: null
    });
    return answer;
  }

  const conversation = normalizedConversation(link.conversation);
  const response = await assistantResponse(text, state, conversation);
  const pendingFuelLog = mergePendingFuelLog(pending, response.draftFuelLog);
  await links.saveSession(link.phone_number, {
    conversation: nextConversation(conversation, text, response.answer),
    pendingFuelLog
  });

  if (!response.draftFuelLog) {
    return response.answer;
  }

  return `${response.answer}\n\nResponda confirmar para salvar.`;
}

function isConfirmation(text: string) {
  return /^(confirmar|confirmo|confirma|pode salvar|salvar|registra|registrar|ok|sim)$/i.test(text.trim());
}

function normalizedPendingFuelLog(value: WhatsAppLinkRow["pending_fuel_log"]): WhatsAppPendingFuelLog | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const pending: WhatsAppPendingFuelLog = {};
  if (typeof value.carId === "string") {
    pending.carId = value.carId;
  }

  if (typeof value.stationId === "string") {
    pending.stationId = value.stationId;
  }

  if (typeof value.fuel === "string" && fuels.includes(value.fuel as FuelType)) {
    pending.fuel = value.fuel;
  }

  pending.paid = positiveNumber(value.paid);
  pending.liters = positiveNumber(value.liters);
  pending.odometerKm = nonNegativeNumber(value.odometerKm);

  if (typeof value.createdAt === "string" && Number.isFinite(new Date(value.createdAt).getTime())) {
    pending.createdAt = new Date(value.createdAt).toISOString();
  }

  return pending;
}

function mergePendingFuelLog(
  current: WhatsAppPendingFuelLog | null,
  draft: WhatsAppPendingFuelLog | undefined
): WhatsAppPendingFuelLog | null {
  if (!draft) {
    return current;
  }

  const next = normalizedPendingFuelLog({
    ...(current ?? {}),
    ...draft
  });

  if (!next) {
    return null;
  }

  const missingFields = validatePendingFuelLog(next);
  return {
    ...next,
    missingFields: missingFields.length ? missingFields : undefined
  };
}

function validatePendingFuelLog(pending: WhatsAppPendingFuelLog) {
  return [
    !pending.carId ? "veículo" : null,
    !pending.stationId ? "posto" : null,
    !pending.fuel ? "combustível" : null,
    !pending.paid ? "valor pago" : null,
    !pending.liters ? "litros" : null
  ].filter((field): field is string => Boolean(field));
}

function positiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function nonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
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
