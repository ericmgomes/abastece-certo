import { setCors } from "../_actions";

const supabaseAuthorizeUrl = "https://ffqykwpkzofkbnvtbfsn.supabase.co/auth/v1/oauth/authorize";

export default async function handler(request: any, response: any) {
  setCors(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "GET") {
    response.status(405).json({ error: "method_not_allowed", message: "Método não permitido." });
    return;
  }

  const currentUrl = new URL(request.url ?? "", `https://${request.headers.host}`);
  response.redirect(302, `${supabaseAuthorizeUrl}${currentUrl.search}`);
}
