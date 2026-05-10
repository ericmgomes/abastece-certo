import { IncomingMessage, ServerResponse } from "http";

export type VercelRequest = IncomingMessage & {
  method?: string;
  query?: Record<string, string | string[]>;
  body?: unknown;
};

export type VercelResponse = ServerResponse & {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
  send: (body: unknown) => void;
};

export type WhatsAppTextMessage = {
  from: string;
  text: string;
  name?: string;
};

export function verifyWebhook(request: VercelRequest, response: VercelResponse) {
  const mode = queryValue(request, "hub.mode");
  const token = queryValue(request, "hub.verify_token");
  const challenge = queryValue(request, "hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    response.status(200).send(challenge ?? "");
    return;
  }

  response.status(403).send("Forbidden");
}

export async function readBody(request: VercelRequest) {
  if (request.body) {
    return request.body;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function extractTextMessages(body: unknown): WhatsAppTextMessage[] {
  const payload = body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
          messages?: Array<{ from?: string; type?: string; text?: { body?: string } }>;
        };
      }>;
    }>;
  };

  return (payload.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => {
      const contacts = change.value?.contacts ?? [];
      return (change.value?.messages ?? [])
        .filter((message) => message.type === "text" && message.from && message.text?.body)
        .map((message) => ({
          from: normalizePhone(message.from!),
          text: message.text!.body!.trim(),
          name: contacts.find((contact) => normalizePhone(contact.wa_id ?? "") === normalizePhone(message.from!))?.profile?.name
        }));
    })
  );
}

export async function sendWhatsAppText(to: string, body: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    throw new Error("Configure WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN.");
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        preview_url: false,
        body
      }
    })
  });

  if (!response.ok) {
    throw new Error(`WhatsApp retornou ${response.status}.`);
  }
}

export function publicAppUrl() {
  return (process.env.PUBLIC_APP_URL ?? process.env.EXPO_PUBLIC_APP_URL ?? "https://app.litrocerto.com.br").replace(/\/$/, "");
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function queryValue(request: VercelRequest, key: string) {
  const value = request.query?.[key];
  return Array.isArray(value) ? value[0] : value;
}
