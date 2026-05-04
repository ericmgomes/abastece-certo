import { setCors } from "../_actions";

const supabaseTokenUrl = "https://ffqykwpkzofkbnvtbfsn.supabase.co/auth/v1/oauth/token";

export default async function handler(request: any, response: any) {
  setCors(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "method_not_allowed", message: "Método não permitido." });
    return;
  }

  const tokenResponse = await fetch(supabaseTokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(request.headers.authorization ? { authorization: request.headers.authorization } : {})
    },
    body: await tokenBody(request)
  });

  response.status(tokenResponse.status);
  response.setHeader("content-type", tokenResponse.headers.get("content-type") ?? "application/json");
  response.send(await tokenResponse.text());
}

async function tokenBody(request: any) {
  if (typeof request.body === "string") {
    return normalizeTokenBody(request.body);
  }

  if (request.body && typeof request.body === "object") {
    return new URLSearchParams(cleanBody(request.body as Record<string, unknown>)).toString();
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return normalizeTokenBody(Buffer.concat(chunks).toString("utf8"));
}

function normalizeTokenBody(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("{")) {
    try {
      return new URLSearchParams(cleanBody(JSON.parse(trimmed))).toString();
    } catch {
      return raw;
    }
  }

  return raw;
}

function cleanBody(body: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(body)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
}
