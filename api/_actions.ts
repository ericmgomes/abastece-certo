import { IncomingMessage, ServerResponse } from "http";
import { LitroCertoMcpService } from "../src/mcp/litroCertoService";
import { contextFromBearerToken } from "../src/mcp/supabaseAuth";

type VercelRequest = IncomingMessage & {
  method?: string;
  query?: Record<string, string | string[]>;
  body?: unknown;
};

type VercelResponse = ServerResponse & {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
  redirect: (statusCode: number, url: string) => void;
};

export async function handleAction(
  request: VercelRequest,
  response: VercelResponse,
  methods: Record<string, (service: LitroCertoMcpService, body: unknown) => Promise<unknown>>
) {
  setCors(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  const handler = methods[request.method ?? "GET"];
  if (!handler) {
    response.status(405).json({ error: "method_not_allowed", message: "Método não permitido." });
    return;
  }

  try {
    const service = await serviceFromRequest(request);
    const body = await readBody(request);
    const status = request.method === "POST" ? 201 : 200;
    response.status(status).json(await handler(service, body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível executar a ação.";
    const status = message.includes("Authorization") || message.includes("Token") ? 401 : 400;
    response.status(status).json({ error: status === 401 ? "unauthorized" : "bad_request", message });
  }
}

export function idFromRequest(request: VercelRequest) {
  const value = request.query?.id;
  return Array.isArray(value) ? value[0] : value;
}

export function queryStringValue(request: VercelRequest, key: string) {
  const value = request.query?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export function setCors(response: VercelResponse) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "authorization,content-type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
}

async function serviceFromRequest(request: VercelRequest) {
  const token = bearerToken(request.headers.authorization);
  if (!token) {
    throw new Error("Envie Authorization: Bearer <Supabase access token>.");
  }

  return new LitroCertoMcpService(await contextFromBearerToken(token));
}

async function readBody(request: VercelRequest) {
  if (request.body) {
    return request.body;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function bearerToken(value?: string | string[]) {
  const header = Array.isArray(value) ? value[0] : value;
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}
