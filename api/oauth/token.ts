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
      "content-type": request.headers["content-type"] ?? "application/x-www-form-urlencoded",
      ...(request.headers.authorization ? { authorization: request.headers.authorization } : {})
    },
    body: await rawBody(request)
  });

  response.status(tokenResponse.status);
  response.setHeader("content-type", tokenResponse.headers.get("content-type") ?? "application/json");
  response.send(await tokenResponse.text());
}

async function rawBody(request: any) {
  if (typeof request.body === "string") {
    return request.body;
  }

  if (request.body && typeof request.body === "object") {
    return new URLSearchParams(request.body as Record<string, string>).toString();
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
