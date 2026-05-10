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

export async function answerConnectedWhatsAppMessage(link: WhatsAppLinkRow, text: string, commandText = text) {
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
  const intent = confirmationIntent(commandText);
  if (intent === "deny") {
    await links.saveSession(link.phone_number, {
      conversation: nextConversation(normalizedConversation(link.conversation), text, "Tudo bem. Cancelei esse rascunho."),
      pendingFuelLog: null
    });
    return "Tudo bem. Cancelei esse rascunho.";
  }

  if (intent === "confirm") {
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
    const answer = `Pronto. Abastecimento #${log.sequence ?? ""} registrado: ${formatNumber(log.liters)} L por R$ ${formatNumber(log.paid)}, ou seja R$ ${formatNumber(log.pricePerLiter)}/L.`;
    await links.saveSession(link.phone_number, {
      conversation: nextConversation(normalizedConversation(link.conversation), text, answer),
      pendingFuelLog: null
    });
    return answer;
  }

  if (intent === "unclear" && pending && validatePendingFuelLog(pending).length === 0) {
    const answer = `${readyToConfirmText(pending, state)}\n\nQuer que eu salve? Responda sim ou não.`;
    await links.saveSession(link.phone_number, {
      conversation: nextConversation(normalizedConversation(link.conversation), text, answer),
      pendingFuelLog: pending
    });
    return answer;
  }

  const conversation = normalizedConversation(link.conversation);
  const response = await assistantResponse(text, state, conversationWithPendingDraft(conversation, pending));
  const pendingFuelLog = mergePendingFuelLog(pending, response.draftFuelLog);
  await links.saveSession(link.phone_number, {
    conversation: nextConversation(conversation, text, response.answer),
    pendingFuelLog
  });

  if (pendingFuelLog && validatePendingFuelLog(pendingFuelLog).length === 0) {
    return `${readyToConfirmText(pendingFuelLog, state)}\n\nResponda confirmar para salvar.`;
  }

  if (!response.draftFuelLog) {
    return response.answer;
  }

  return `${response.answer}\n\nResponda confirmar para salvar.`;
}

function confirmationIntent(text: string): "confirm" | "deny" | "unclear" | "none" {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return "none";
  }

  if (/\b(nao|cancela|cancelar|errado|espera|pera|calma)\b/.test(normalized)) {
    return "deny";
  }

  const confirmationCommands = [
    "confirm",
    "confirma",
    "confirmado",
    "confirmar",
    "confirmo",
    "manda",
    "ok",
    "pode registrar",
    "pode salvar",
    "registra",
    "registrar",
    "salva",
    "salvar",
    "sim",
    "vai",
    "yep"
  ];

  if (confirmationCommands.some((command) => normalized === command || normalized.startsWith(`${command} `))) {
    return "confirm";
  }

  if (/\b(salv|registr|confirm|pode|vai|manda|fechou|beleza|blz|certo)\b/.test(normalized)) {
    return "unclear";
  }

  return "none";
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

function conversationWithPendingDraft(
  conversation: Array<{ role?: "assistant" | "user"; text?: string }>,
  pending: WhatsAppPendingFuelLog | null
) {
  if (!pending) {
    return conversation;
  }

  return [
    ...conversation,
    {
      role: "assistant" as const,
      text: `Rascunho atual ainda não salvo: ${pendingSummary(pending)}. Use esses dados na próxima resposta e peça só o que ainda faltar.`
    }
  ];
}

function readyToConfirmText(pending: WhatsAppPendingFuelLog, state: AppState) {
  const car = state.cars.find((item) => item.id === pending.carId);
  const station = state.stations.find((item) => item.id === pending.stationId);
  return [
    "Pronto para salvar:",
    car?.nickname ?? "veículo informado",
    station ? `posto ${station.name}` : "posto informado",
    pending.fuel,
    `${formatNumber(pending.liters!)} L`,
    `R$ ${formatNumber(pending.paid!)}`,
    pending.odometerKm !== undefined ? `${formatNumber(pending.odometerKm)} km` : null
  ].filter(Boolean).join(", ");
}

function pendingSummary(pending: WhatsAppPendingFuelLog) {
  return [
    pending.carId ? `carId ${pending.carId}` : null,
    pending.stationId ? `stationId ${pending.stationId}` : null,
    pending.fuel ? `combustível ${pending.fuel}` : null,
    pending.paid ? `valor R$ ${formatNumber(pending.paid)}` : null,
    pending.liters ? `${formatNumber(pending.liters)} litros` : null,
    pending.odometerKm !== undefined ? `odômetro ${formatNumber(pending.odometerKm)} km` : null,
    pending.createdAt ? `data ${pending.createdAt}` : null
  ].filter(Boolean).join(", ");
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
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
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
