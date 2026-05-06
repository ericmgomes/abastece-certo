import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const fallbackSecret = "litrocerto-dev-oauth-secret-change-me";

export type LitroCertoOAuthPayload = {
  typ: "code" | "access";
  clientId: string;
  redirectUri: string;
  scope: string;
  supabaseAccessToken: string;
  ownerId: string;
  email: string;
  name: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  resource?: string;
  iat: number;
  exp: number;
  jti: string;
};

export function signOAuthPayload(payload: Omit<LitroCertoOAuthPayload, "iat" | "jti">) {
  const fullPayload: LitroCertoOAuthPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    jti: randomBytes(16).toString("hex")
  };
  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = sign(body);
  return `lc_${body}.${signature}`;
}

export function verifyOAuthPayload(token: string, type: LitroCertoOAuthPayload["typ"]) {
  if (!token.startsWith("lc_")) {
    return null;
  }

  const [rawBody, signature] = token.slice(3).split(".");
  if (!rawBody || !signature || !safeEqual(signature, sign(rawBody))) {
    throw new Error("Token LitroCerto inválido.");
  }

  const payload = JSON.parse(base64UrlDecode(rawBody)) as LitroCertoOAuthPayload;
  if (payload.typ !== type) {
    throw new Error("Token LitroCerto com tipo inválido.");
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Token LitroCerto expirado.");
  }

  return payload;
}

export function oauthClientConfig() {
  const env = process.env as Record<string, string | undefined>;
  return {
    clientId: env.LITROCERTO_OAUTH_CLIENT_ID ?? "lc_8F3kP2vX9rM4Q1tW6yZ",
    clientSecret: env.LITROCERTO_OAUTH_CLIENT_SECRET
  };
}

function sign(body: string) {
  return createHmac("sha256", oauthSecret()).update(body).digest("base64url");
}

function oauthSecret() {
  const env = process.env as Record<string, string | undefined>;
  return env.LITROCERTO_OAUTH_SECRET ?? env.MCP_SUPABASE_ANON_KEY ?? env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? fallbackSecret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
