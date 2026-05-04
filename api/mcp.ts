import { IncomingMessage, ServerResponse } from "http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createLitroCertoMcpServer } from "../src/mcp/server";
import { contextFromBearerToken } from "../src/mcp/supabaseAuth";

type VercelRequest = IncomingMessage & {
  method?: string;
  body?: unknown;
};

type VercelResponse = ServerResponse & {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setMcpCors(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  const origin = publicOrigin(request);
  const token = bearerToken(request.headers.authorization);
  if (!token) {
    response.setHeader(
      "WWW-Authenticate",
      `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp", scope="openid email profile"`
    );
    response.status(401).json({
      error: "unauthorized",
      error_description: "Faça login no LitroCerto para usar este conector MCP."
    });
    return;
  }

  try {
    const context = await contextFromBearerToken(token);
    (request as typeof request & { auth?: { token: string; clientId: string; scopes: string[] } }).auth = {
      token,
      clientId: context.ownerId,
      scopes: ["openid", "email", "profile"]
    };

    const server = createLitroCertoMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(request, response, request.body);
    response.on("close", () => {
      void server.close();
    });
  } catch (error) {
    response.setHeader(
      "WWW-Authenticate",
      `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp", error="invalid_token"`
    );
    response.status(401).json({
      error: "unauthorized",
      error_description: error instanceof Error ? error.message : "Token inválido."
    });
  }
}

function setMcpCors(response: VercelResponse) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "authorization,content-type,mcp-session-id,mcp-protocol-version");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
}

function publicOrigin(request: VercelRequest) {
  const host = request.headers["x-forwarded-host"] ?? request.headers.host ?? "abastece-certo.vercel.app";
  const proto = request.headers["x-forwarded-proto"] ?? "https";
  const hostValue = Array.isArray(host) ? host[0] : host;
  const protoValue = Array.isArray(proto) ? proto[0] : proto;
  return `${protoValue}://${hostValue}`;
}

function bearerToken(value?: string | string[]) {
  const header = Array.isArray(value) ? value[0] : value;
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}
