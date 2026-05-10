import { WhatsAppLinksRepository } from "../../src/whatsapp/whatsappLinks";
import { contextFromBearerToken } from "../../src/mcp/supabaseAuth";
import { readBody, sendWhatsAppText, VercelRequest, VercelResponse } from "./_client";

type LinkBody = {
  token?: string;
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setCors(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "method_not_allowed", message: "Método não permitido." });
    return;
  }

  try {
    const authToken = bearerToken(request.headers.authorization);
    if (!authToken) {
      response.status(401).json({ error: "unauthorized", message: "Faça login para conectar o WhatsApp." });
      return;
    }

    const body = await readBody(request) as LinkBody;
    const token = body.token?.trim();
    if (!token) {
      response.status(400).json({ error: "bad_request", message: "Token de WhatsApp não informado." });
      return;
    }

    const context = await contextFromBearerToken(authToken);
    const link = await new WhatsAppLinksRepository().linkOwner(token, context.ownerId, context.name);
    await sendWhatsAppText(link.phone_number, "Pronto. Este WhatsApp foi conectado à sua conta LitroCerto.").catch(() => undefined);
    response.status(200).json({ ok: true, phoneNumber: link.phone_number });
  } catch (error) {
    response.status(400).json({
      error: "whatsapp_link_error",
      message: error instanceof Error ? error.message : "Não foi possível conectar o WhatsApp."
    });
  }
}

function setCors(response: VercelResponse) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "authorization,content-type");
  response.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
}

function bearerToken(value?: string | string[]) {
  const header = Array.isArray(value) ? value[0] : value;
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}
