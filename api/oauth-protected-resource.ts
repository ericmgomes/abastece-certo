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
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
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
