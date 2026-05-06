import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { supabase } from "../../supabaseClient";
import { trackEvent } from "../../analytics";

export type OAuthAuthorizeRequest = {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  state?: string;
  scope: string;
};

type OAuthConsentDetails = {
  authorization_id: string;
  redirect_uri: string;
  scope: string;
  client: {
    name: string;
  };
  user: {
    email: string | null;
  };
};

type OAuthStyles = Record<string, any>;

export function OAuthConsentScreen({
  request,
  authenticated,
  onOpenAuth,
  userEmail,
  styles
}: {
  request: OAuthAuthorizeRequest | null;
  authenticated: boolean;
  onOpenAuth: () => void;
  userEmail: string | null;
  styles: OAuthStyles;
}) {
  const [details, setDetails] = useState<OAuthConsentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!request) {
      setDetails(null);
      setError("Autorização inválida ou expirada. Volte ao app que solicitou o acesso e tente iniciar sessão novamente.");
      return;
    }

    if (!authenticated) {
      setDetails(null);
      setError(null);
      return;
    }

    setDetails({
      authorization_id: "litrocerto-custom-oauth",
      redirect_uri: request.redirect_uri,
      scope: request.scope,
      client: {
        name: oauthClientName(request.redirect_uri)
      },
      user: {
        email: userEmail
      }
    });
    setError(null);
  }, [request, authenticated, userEmail]);

  async function decide(decision: "approve" | "deny") {
    if (!request) {
      setError("Autorização inválida ou expirada. Volte ao app que solicitou o acesso e tente iniciar sessão novamente.");
      return;
    }

    if (decision === "deny") {
      trackEvent("oauth_access_denied", {
        client: oauthClientName(request.redirect_uri)
      });
      const redirectUrl = new URL(request.redirect_uri);
      redirectUrl.searchParams.set("error", "access_denied");
      if (request.state) {
        redirectUrl.searchParams.set("state", request.state);
      }
      redirectBrowserTo(redirectUrl.toString());
      return;
    }

    setLoading(true);
    setError(null);
    const sessionResult = await supabase.auth.getSession();
    const supabaseAccessToken = sessionResult.data.session?.access_token;
    if (!supabaseAccessToken) {
      setLoading(false);
      trackEvent("oauth_access_error", {
        reason: "expired_session",
        client: oauthClientName(request.redirect_uri)
      });
      setError("Sua sessão expirou. Faça login novamente.");
      return;
    }

    const result = await fetch("/api/oauth/approve", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        ...request,
        supabase_access_token: supabaseAccessToken
      })
    });
    const data = await result.json() as { redirect_url?: string; message?: string };
    setLoading(false);

    if (!result.ok || !data.redirect_url) {
      trackEvent("oauth_access_error", {
        reason: "approve_failed",
        client: oauthClientName(request.redirect_uri)
      });
      setError(data.message ?? "Não foi possível autorizar o acesso.");
      return;
    }

    trackEvent("oauth_access_approved", {
      client: oauthClientName(request.redirect_uri)
    });
    redirectBrowserTo(data.redirect_url);
  }

  return (
    <View style={styles.authScreen}>
      <View style={styles.authCard}>
        <Text style={styles.brand}>LitroCerto</Text>
        <Text style={styles.title}>Autorizar acesso</Text>
        {!authenticated ? (
          <>
            <Text style={styles.helpText}>
              Faça login no LitroCerto para autorizar este app a consultar e registrar dados na sua conta.
            </Text>
            <Text style={styles.privacyText}>
              Cada autorização vale apenas para a sua conta. Outros usuários não conseguem acessar seus veículos, postos ou abastecimentos.
            </Text>
            <Pressable style={styles.primaryButton} onPress={onOpenAuth}>
              <Text style={styles.primaryButtonText}>Login</Text>
            </Pressable>
          </>
        ) : loading && !details ? (
          <Text style={styles.muted}>Carregando autorização...</Text>
        ) : details ? (
          <>
            <Text style={styles.helpText}>
              {details.client.name} quer acessar sua conta LitroCerto.
            </Text>
            <View style={styles.consentSummary}>
              <Text style={styles.itemTitle}>{details.client.name}</Text>
              <Text style={styles.muted}>{details.user.email}</Text>
              <Text style={styles.privacyText}>Permissões solicitadas: {details.scope}</Text>
            </View>
            <Text style={styles.privacyText}>
              Ao autorizar, este app poderá consultar métricas e criar ou editar registros quando você pedir.
            </Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.row}>
              <Pressable style={styles.secondaryButton} onPress={() => void decide("deny")} disabled={loading}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={() => void decide("approve")} disabled={loading}>
                <Text style={styles.primaryButtonText}>{loading ? "Autorizando..." : "Autorizar"}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.errorText}>{error ?? "Não foi possível carregar esta autorização."}</Text>
            <Pressable style={styles.secondaryButton} onPress={() => redirectBrowserTo("/")}>
              <Text style={styles.secondaryButtonText}>Voltar</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function oauthClientName(redirectUri: string) {
  try {
    const host = new URL(redirectUri).hostname;
    if (host === "claude.ai") {
      return "Claude";
    }
    if (host === "chat.openai.com" || host === "chatgpt.com") {
      return "ChatGPT";
    }
  } catch {
    return "App conectado";
  }

  return "App conectado";
}

function redirectBrowserTo(url: string) {
  const location = (globalThis as unknown as { location?: Location }).location;
  if (location) {
    location.href = url;
  }
}
