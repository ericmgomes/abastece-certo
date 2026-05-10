import { IncomingMessage, ServerResponse } from "http";
import { WhatsAppLinksRepository } from "../../src/whatsapp/whatsappLinks";
import { normalizePhone, publicAppUrl } from "../whatsapp/_client";
import { answerConnectedWhatsAppMessage } from "../whatsapp/_respond";

type VercelRequest = IncomingMessage & {
  method?: string;
  body?: unknown;
};

type VercelResponse = ServerResponse & {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
  send: (body: unknown) => void;
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    const message = await readTwilioMessage(request);
    if (!message.from || !message.text) {
      sendTwiML(response, "Não consegui ler sua mensagem. Tente enviar um texto simples.");
      return;
    }

    const links = new WhatsAppLinksRepository();
    const existing = await links.findByPhone(message.from);
    if (existing?.owner_id) {
      sendTwiML(response, await answerConnectedWhatsAppMessage(existing, message.text));
      return;
    }

    const link = await links.createOrRefreshLink(message.from, message.name);
    const url = `${publicAppUrl()}/?whatsapp_token=${encodeURIComponent(link.link_token)}`;
    sendTwiML(
      response,
      `Para conectar este WhatsApp ao LitroCerto, faça login neste link:\n${url}\n\nEsse link expira em 30 minutos.`
    );
  } catch (error) {
    sendTwiML(response, errorMessage(error));
  }
}

async function readTwilioMessage(request: VercelRequest) {
  const body = await readFormBody(request);
  return {
    from: normalizePhone(String(body.From ?? "")),
    text: String(body.Body ?? "").trim(),
    name: typeof body.ProfileName === "string" ? body.ProfileName : undefined
  };
}

async function readFormBody(request: VercelRequest): Promise<Record<string, string>> {
  if (request.body && typeof request.body === "object") {
    return normalizeRecord(request.body as Record<string, unknown>);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  const params = new URLSearchParams(raw);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function normalizeRecord(body: Record<string, unknown>) {
  const result: Record<string, string> = {};
  Object.entries(body).forEach(([key, value]) => {
    if (typeof value === "string") {
      result[key] = value;
      return;
    }

    if (Array.isArray(value) && typeof value[0] === "string") {
      result[key] = value[0];
    }
  });
  return result;
}

function sendTwiML(response: VercelResponse, message: string) {
  response.status(200);
  response.setHeader("content-type", "text/xml; charset=utf-8");
  response.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Não consegui responder agora. Tente novamente em instantes.";
}

