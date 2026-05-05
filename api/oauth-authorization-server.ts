import { IncomingMessage, ServerResponse } from "http";

type VercelResponse = ServerResponse & {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
};

export default function handler(request: IncomingMessage, response: VercelResponse) {
  setDiscoveryCors(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.status(405).json({ error: "method_not_allowed", message: "Método não permitido." });
    return;
  }

  const origin = publicOrigin(request);
  response.status(200).json({
    issuer: origin,
    authorization_endpoint: `${origin}/api/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256", "plain"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    scopes_supported: ["openid", "email", "profile"]
  });
}

function setDiscoveryCors(response: VercelResponse) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "authorization,content-type");
  response.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
}

function publicOrigin(request: IncomingMessage) {
  const host = request.headers["x-forwarded-host"] ?? request.headers.host ?? "litrocerto.com.br";
  const proto = request.headers["x-forwarded-proto"] ?? "https";
  const hostValue = Array.isArray(host) ? host[0] : host;
  const protoValue = Array.isArray(proto) ? proto[0] : proto;
  return `${protoValue}://${hostValue}`;
}
