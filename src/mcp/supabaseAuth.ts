import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { verifyOAuthPayload } from "./customOAuthToken";

const fallbackSupabaseUrl = "https://ffqykwpkzofkbnvtbfsn.supabase.co";
const fallbackSupabaseKey = "sb_publishable_MARbgY52A-tYXaVqupaxqA_rMWAJZhu";

export type McpUserContext = {
  token: string;
  ownerId: string;
  email: string;
  name: string;
  supabase: SupabaseClient;
};

export function supabaseConfig() {
  const env = process.env as Record<string, string | undefined>;
  return {
    url: env.MCP_SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL ?? fallbackSupabaseUrl,
    anonKey: env.MCP_SUPABASE_ANON_KEY ?? env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? fallbackSupabaseKey
  };
}

export function supabaseForToken(token: string) {
  const { url, anonKey } = supabaseConfig();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

export async function contextFromBearerToken(token: string): Promise<McpUserContext> {
  const customToken = verifyOAuthPayload(token, "access");
  const supabaseToken = customToken?.supabaseAccessToken ?? token;
  const supabase = supabaseForToken(supabaseToken);
  const { data, error } = await supabase.auth.getUser(supabaseToken);

  if (error || !data.user?.id || !data.user.email) {
    throw new Error("Token OAuth inválido ou expirado.");
  }

  const metadata = data.user.user_metadata as Record<string, unknown> | null;
  const name =
    stringMetadata(metadata, "full_name") ??
    stringMetadata(metadata, "name") ??
    data.user.email;

  return {
    token: supabaseToken,
    ownerId: data.user.id,
    email: data.user.email,
    name,
    supabase
  };
}

function stringMetadata(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
