import { setCors } from "../_actions";

export default async function handler(request: any, response: any) {
  setCors(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.status(405).json({ error: "method_not_allowed", message: "Método não permitido." });
    return;
  }

  const currentUrl = new URL(request.url ?? "", `https://${request.headers.host}`);
  const origin = publicOrigin(request);
  response.redirect(302, `${origin}/oauth/consent${currentUrl.search}`);
}

function publicOrigin(request: any) {
  const host = request.headers["x-forwarded-host"] ?? request.headers.host ?? "app.litrocerto.com.br";
  const proto = request.headers["x-forwarded-proto"] ?? "https";
  const hostValue = Array.isArray(host) ? host[0] : host;
  const protoValue = Array.isArray(proto) ? proto[0] : proto;
  return `${protoValue}://${hostValue}`;
}
