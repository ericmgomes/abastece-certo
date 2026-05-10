import { createClient } from "@supabase/supabase-js";

export type WhatsAppLinkRow = {
  phone_number: string;
  owner_id: string | null;
  display_name: string | null;
  link_token: string;
  token_expires_at: string;
  linked_at: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

const fallbackSupabaseUrl = "https://ffqykwpkzofkbnvtbfsn.supabase.co";

export class WhatsAppLinksRepository {
  private readonly supabase = whatsappServiceSupabase();

  async findByPhone(phoneNumber: string) {
    const result = await this.supabase
      .from("whatsapp_links")
      .select("*")
      .eq("phone_number", phoneNumber)
      .maybeSingle();
    throwIfError(result.error);
    return result.data as WhatsAppLinkRow | null;
  }

  async findByToken(token: string) {
    const result = await this.supabase
      .from("whatsapp_links")
      .select("*")
      .eq("link_token", token)
      .maybeSingle();
    throwIfError(result.error);
    return result.data as WhatsAppLinkRow | null;
  }

  async createOrRefreshLink(phoneNumber: string, displayName?: string | null) {
    const token = secureToken();
    const now = new Date();
    const row = {
      phone_number: phoneNumber,
      display_name: displayName ?? null,
      link_token: token,
      token_expires_at: new Date(now.getTime() + 30 * 60_000).toISOString(),
      last_message_at: now.toISOString(),
      updated_at: now.toISOString()
    };
    const result = await this.supabase
      .from("whatsapp_links")
      .upsert(row, { onConflict: "phone_number" })
      .select("*")
      .single();
    throwIfError(result.error);
    return result.data as WhatsAppLinkRow;
  }

  async linkOwner(token: string, ownerId: string, displayName?: string | null) {
    const existing = await this.findByToken(token);
    if (!existing) {
      throw new Error("Link de WhatsApp inválido.");
    }

    if (new Date(existing.token_expires_at).getTime() < Date.now()) {
      throw new Error("Link de WhatsApp expirado. Peça um novo pelo WhatsApp.");
    }

    const result = await this.supabase
      .from("whatsapp_links")
      .update({
        owner_id: ownerId,
        display_name: displayName ?? existing.display_name,
        linked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("link_token", token)
      .select("*")
      .single();
    throwIfError(result.error);
    return result.data as WhatsAppLinkRow;
  }
}

export function whatsappServiceSupabase() {
  return createClient(
    process.env.MCP_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? fallbackSupabaseUrl,
    serviceRoleKey(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.MCP_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY para usar WhatsApp.");
  }

  return key;
}

function secureToken() {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID().replace(/-/g, "");
  }

  return `${Date.now()}${Math.random()}`.replace(/\D/g, "");
}

function throwIfError(error: unknown) {
  if (error) {
    if (error && typeof error === "object" && "message" in error) {
      throw new Error(String((error as { message?: unknown }).message));
    }

    throw error;
  }
}
