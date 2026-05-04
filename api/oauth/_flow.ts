import { IncomingMessage, ServerResponse } from "http";
import { contextFromBearerToken } from "../../src/mcp/supabaseAuth";
import { oauthClientConfig, signOAuthPayload, verifyOAuthPayload } from "../../src/mcp/customOAuthToken";
import { setCors } from "../_actions";

type VercelRequest = IncomingMessage & {
  method?: string;
  body?: unknown;
};

type VercelResponse = ServerResponse & {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
  send: (body: unknown) => void;
  redirect: (statusCode: number, url: string) => void;
};

type OAuthParams = {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  state?: string;
  scope?: string;
  supabase_access_token?: string;
};

export async function handleOAuthApprove(request: VercelRequest, response: VercelResponse) {
  setCors(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "method_not_allowed", message: "Método não permitido." });
    return;
  }

  try {
    const body = await readOAuthBody(request);
    validateAuthorizeRequest(body);

    if (!body.supabase_access_token) {
      throw new Error("Sessão Supabase ausente.");
    }

    const context = await contextFromBearerToken(body.supabase_access_token);
    const code = signOAuthPayload({
      typ: "code",
      clientId: body.client_id!,
      redirectUri: body.redirect_uri!,
      scope: body.scope ?? "openid email profile",
      supabaseAccessToken: context.token,
      ownerId: context.ownerId,
      email: context.email,
      name: context.name,
      exp: Math.floor(Date.now() / 1000) + 5 * 60
    });
    const redirectUrl = new URL(body.redirect_uri!);
    redirectUrl.searchParams.set("code", code);
    if (body.state) {
      redirectUrl.searchParams.set("state", body.state);
    }

    response.status(200).json({ redirect_url: redirectUrl.toString() });
  } catch (error) {
    response.status(400).json({
      error: "invalid_request",
      message: error instanceof Error ? error.message : "Não foi possível autorizar."
    });
  }
}

export async function handleOAuthToken(request: VercelRequest, response: VercelResponse) {
  setCors(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "method_not_allowed", message: "Método não permitido." });
    return;
  }

  try {
    const body = await readOAuthBody(request);
    validateClient(request, body);

    if (body.grant_type && body.grant_type !== "authorization_code") {
      throw new Error("grant_type inválido.");
    }

    if (!body.code) {
      throw new Error("code é obrigatório.");
    }

    const code = verifyOAuthPayload(body.code, "code");
    if (!code) {
      throw new Error("code inválido.");
    }

    if (body.client_id && body.client_id !== code.clientId) {
      throw new Error("client_id inválido.");
    }

    if (body.redirect_uri && body.redirect_uri !== code.redirectUri && !sameChatGptCallback(body.redirect_uri, code.redirectUri)) {
      throw new Error("redirect_uri inválida.");
    }

    const accessToken = signOAuthPayload({
      typ: "access",
      clientId: code.clientId,
      redirectUri: code.redirectUri,
      scope: code.scope,
      supabaseAccessToken: code.supabaseAccessToken,
      ownerId: code.ownerId,
      email: code.email,
      name: code.name,
      exp: Math.floor(Date.now() / 1000) + 60 * 60
    });

    response.status(200).json({
      access_token: accessToken,
      token_type: "bearer",
      expires_in: 3600,
      scope: code.scope
    });
  } catch (error) {
    response.status(400).json({
      error: "invalid_grant",
      error_description: error instanceof Error ? error.message : "Não foi possível trocar o código por token."
    });
  }
}

export function buildDenyRedirect(params: OAuthParams) {
  if (!params.redirect_uri) {
    return "/";
  }

  const redirectUrl = new URL(params.redirect_uri);
  redirectUrl.searchParams.set("error", "access_denied");
  if (params.state) {
    redirectUrl.searchParams.set("state", params.state);
  }
  return redirectUrl.toString();
}

function validateAuthorizeRequest(body: OAuthParams) {
  const { clientId } = oauthClientConfig();

  if (body.response_type !== "code") {
    throw new Error("response_type precisa ser code.");
  }

  if (body.client_id !== clientId) {
    throw new Error("client_id inválido.");
  }

  if (!body.redirect_uri || !isAllowedChatGptRedirect(body.redirect_uri)) {
    throw new Error("redirect_uri inválida.");
  }
}

function validateClient(request: VercelRequest, body: Record<string, string>) {
  const { clientId, clientSecret } = oauthClientConfig();
  const basic = basicClientCredentials(request.headers.authorization);
  const requestClientId = basic?.clientId ?? body.client_id;
  const requestSecret = basic?.clientSecret ?? body.client_secret;

  if (requestClientId !== clientId) {
    throw new Error("client_id inválido.");
  }

  if (clientSecret && requestSecret !== clientSecret) {
    throw new Error("client_secret inválido.");
  }
}

function isAllowedChatGptRedirect(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.hostname === "chat.openai.com" || url.hostname === "chatgpt.com") &&
      url.pathname.startsWith("/aip/") &&
      url.pathname.endsWith("/oauth/callback")
    );
  } catch {
    return false;
  }
}

function sameChatGptCallback(left: string, right: string) {
  try {
    const leftUrl = new URL(left);
    const rightUrl = new URL(right);
    return (
      isAllowedChatGptRedirect(left) &&
      isAllowedChatGptRedirect(right) &&
      leftUrl.pathname === rightUrl.pathname
    );
  } catch {
    return false;
  }
}

async function readOAuthBody(request: VercelRequest) {
  if (request.body && typeof request.body === "object") {
    return cleanBody(request.body as Record<string, unknown>);
  }

  if (typeof request.body === "string") {
    return parseBodyString(request.body);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return parseBodyString(Buffer.concat(chunks).toString("utf8"));
}

function parseBodyString(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }

  if (trimmed.startsWith("{")) {
    return cleanBody(JSON.parse(trimmed));
  }

  return Object.fromEntries(new URLSearchParams(trimmed).entries());
}

function cleanBody(body: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(body)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  ) as Record<string, string>;
}

function basicClientCredentials(value?: string | string[]) {
  const header = Array.isArray(value) ? value[0] : value;
  const match = header?.match(/^Basic\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) {
    return null;
  }

  return {
    clientId: decoded.slice(0, separator),
    clientSecret: decoded.slice(separator + 1)
  };
}
