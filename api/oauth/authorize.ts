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
  response.redirect(302, `/oauth/consent${currentUrl.search}`);
}
