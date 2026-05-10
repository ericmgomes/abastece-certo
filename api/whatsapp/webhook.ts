import { WhatsAppLinksRepository } from "../../src/whatsapp/whatsappLinks";
import { assistantResponse } from "../assistant";
import { AppState } from "../../src/domain";
import { LitroCertoMcpService } from "../../src/mcp/litroCertoService";
import { McpUserContext } from "../../src/mcp/supabaseAuth";
import { whatsappServiceSupabase, WhatsAppLinkRow } from "../../src/whatsapp/whatsappLinks";
import {
  extractTextMessages,
  publicAppUrl,
  readBody,
  sendWhatsAppText,
  VercelRequest,
  VercelResponse,
  verifyWebhook
} from "./_client";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method === "GET") {
    verifyWebhook(request, response);
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    const body = await readBody(request);
    const messages = extractTextMessages(body);
    const links = new WhatsAppLinksRepository();
    const debugLinks: string[] = [];
    const debugMessages: string[] = [];

    await Promise.all(messages.map(async (message) => {
      const existing = await links.findByPhone(message.from);
      if (existing?.owner_id) {
        const answer = await answerConnectedMessage(existing, message.text);
        await sendOrDebug(
          message.from,
          answer,
          debugLinks,
          undefined,
          debugMessages
        );
        return;
      }

      const link = await links.createOrRefreshLink(message.from, message.name);
      const url = `${publicAppUrl()}/?whatsapp_token=${encodeURIComponent(link.link_token)}`;
      await sendOrDebug(
        message.from,
        `Para conectar este WhatsApp ao LitroCerto, faça login neste link:\n${url}\n\nEsse link expira em 30 minutos.`,
        debugLinks,
        url,
        debugMessages
      );
    }));

    response.status(200).json({
      ok: true,
      ...(debugLinks.length && process.env.VERCEL !== "1" ? { debugLinks } : {}),
      ...(debugMessages.length && process.env.VERCEL !== "1" ? { debugMessages } : {})
    });
  } catch (error) {
    response.status(200).json({
      ok: false,
      message: errorMessage(error)
    });
  }
}

async function answerConnectedMessage(link: WhatsAppLinkRow, text: string) {
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
  const response = await assistantResponse(text, state, []);
  if (!response.draftFuelLog) {
    return response.answer;
  }

  return `${response.answer}\n\nAinda não salvei pelo WhatsApp. Confira no app antes de registrar.`;
}

async function sendOrDebug(
  to: string,
  body: string,
  debugLinks: string[],
  debugLink?: string,
  debugMessages?: string[]
) {
  try {
    await sendWhatsAppText(to, body);
  } catch (error) {
    if (process.env.VERCEL === "1") {
      throw error;
    }

    debugMessages?.push(`${to}: ${body}`);

    if (debugLink) {
      debugLinks.push(debugLink);
    }
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }

  if (process.env.VERCEL !== "1") {
    return JSON.stringify(error);
  }

  return "Erro no webhook do WhatsApp.";
}
