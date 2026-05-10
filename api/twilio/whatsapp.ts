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

type TwilioMediaItem = {
  url: string;
  contentType: string;
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
  const bodyText = String(body.Body ?? "").trim();
  const mediaTexts = await Promise.all(readTwilioMedia(body).map((media) => textFromMedia(media)));
  const text = [bodyText, ...mediaTexts].filter(Boolean).join("\n\n").trim();

  return {
    from: normalizePhone(String(body.From ?? "")),
    text,
    name: typeof body.ProfileName === "string" ? body.ProfileName : undefined
  };
}

function readTwilioMedia(body: Record<string, string>): TwilioMediaItem[] {
  const total = Math.min(Number(body.NumMedia ?? 0) || 0, 3);
  return Array.from({ length: total }, (_item, index) => {
    const url = body[`MediaUrl${index}`];
    const contentType = body[`MediaContentType${index}`] ?? "";
    if (!url || !contentType) {
      return undefined;
    }

    return { url, contentType };
  }).filter((item): item is TwilioMediaItem => Boolean(item));
}

async function textFromMedia(media: TwilioMediaItem) {
  if (media.contentType.startsWith("audio/")) {
    return transcribeAudio(media);
  }

  if (media.contentType.startsWith("image/")) {
    return describeFuelPumpImage(media);
  }

  return `Recebi uma mídia do tipo ${media.contentType}, mas por enquanto só consigo interpretar áudio e foto.`;
}

async function transcribeAudio(media: TwilioMediaItem) {
  const file = await downloadTwilioMedia(media);
  const form = new FormData();
  form.append("model", process.env.OPENAI_TRANSCRIPTION_MODEL ?? "whisper-1");
  form.append("language", "pt");
  form.append("file", new Blob([file.bytes], { type: media.contentType }), filenameFor(media.contentType, "audio"));

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: openAiHeaders(),
    body: form
  });

  if (!response.ok) {
    throw new Error(await openAiErrorMessage(response, "Não consegui transcrever o áudio."));
  }

  const payload = await response.json() as { text?: string };
  const transcription = payload.text?.trim();
  if (!transcription) {
    return "Recebi um áudio, mas não consegui entender o conteúdo.";
  }

  return `Transcrição do áudio: ${transcription}`;
}

async function describeFuelPumpImage(media: TwilioMediaItem) {
  const file = await downloadTwilioMedia(media);
  const dataUrl = `data:${media.contentType};base64,${Buffer.from(file.bytes).toString("base64")}`;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      ...openAiHeaders(),
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? process.env.OPENAI_ASSISTANT_MODEL ?? "gpt-4o-mini",
      temperature: 0,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content: [
            "Você lê fotos de bomba ou comprovante de abastecimento para o app LitroCerto.",
            "Extraia apenas dados visíveis: valor pago, litros, preço por litro, combustível, data/hora se aparecer.",
            "Se algum dado não estiver visível, diga que não foi identificado.",
            "Responda em português do Brasil, em uma frase curta, sem inventar dados."
          ].join(" ")
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Leia esta imagem de abastecimento e extraia os dados para preparar um registro."
            },
            {
              type: "image_url",
              image_url: { url: dataUrl }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(await openAiErrorMessage(response, "Não consegui interpretar a foto."));
  }

  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const description = payload.choices?.[0]?.message?.content?.trim();
  if (!description) {
    return "Recebi uma foto, mas não consegui identificar dados de abastecimento.";
  }

  return `Dados extraídos da foto: ${description}`;
}

async function downloadTwilioMedia(media: TwilioMediaItem) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Configure TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN para ler mídias do WhatsApp.");
  }

  const response = await fetch(media.url, {
    headers: {
      authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`
    }
  });
  if (!response.ok) {
    throw new Error(`Não consegui baixar a mídia recebida pelo WhatsApp (${response.status}).`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 20 * 1024 * 1024) {
    throw new Error("A mídia recebida é muito grande. Envie um arquivo menor.");
  }

  return { bytes };
}

function openAiHeaders() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada.");
  }

  return {
    authorization: `Bearer ${apiKey}`
  };
}

async function openAiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json() as { error?: { message?: string } };
    return `${fallback} ${payload.error?.message ?? ""}`.trim();
  } catch {
    return fallback;
  }
}

function filenameFor(contentType: string, fallback: string) {
  const extension = contentType.split("/")[1]?.split(";")[0] || "bin";
  return `${fallback}.${extension}`;
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
