import { WhatsAppLinksRepository } from "../../src/whatsapp/whatsappLinks";
import { answerConnectedWhatsAppMessage } from "./_respond";
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
        const answer = await answerConnectedWhatsAppMessage(existing, message.text);
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
