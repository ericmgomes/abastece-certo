import { IncomingMessage, ServerResponse } from "http";

type VercelRequest = IncomingMessage & {
  method?: string;
  url?: string;
  headers: IncomingMessage["headers"];
};

type VercelResponse = ServerResponse & {
  status: (statusCode: number) => VercelResponse;
  send: (body: string) => void;
};

const fallbackSupabaseUrl = "https://ffqykwpkzofkbnvtbfsn.supabase.co";
const fallbackSupabaseKey = "sb_publishable_MARbgY52A-tYXaVqupaxqA_rMWAJZhu";

export default function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.status(405).send("Método não permitido.");
    return;
  }

  const origin = publicOrigin(request);
  const currentUrl = new URL(request.url ?? "/oauth/consent", origin);
  const params = Object.fromEntries(currentUrl.searchParams.entries());
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.status(200).send(consentHtml({
    origin,
    params,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? fallbackSupabaseUrl,
    supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? fallbackSupabaseKey
  }));
}

function consentHtml({
  origin,
  params,
  supabaseUrl,
  supabaseKey
}: {
  origin: string;
  params: Record<string, string>;
  supabaseUrl: string;
  supabaseKey: string;
}) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Autorizar acesso - LitroCerto</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #eef7f0;
      --card: #ffffff;
      --text: #102018;
      --muted: #627568;
      --border: #cfe4d5;
      --primary: #0d6b38;
      --error: #d92727;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #071b16;
        --card: #102a23;
        --text: #f2fff9;
        --muted: #a9c6ba;
        --border: #285244;
        --primary: #1fa463;
        --error: #ff7474;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 18px;
      background: var(--bg);
      color: var(--text);
      font-family: Verdana, Arial, sans-serif;
    }
    main {
      width: min(430px, 100%);
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--card);
      padding: 18px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 26px;
      line-height: 1.1;
    }
    h2 {
      margin: 0 0 14px;
      font-size: 22px;
    }
    p {
      margin: 0 0 12px;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.45;
    }
    strong { color: var(--text); }
    button, a.button {
      width: 100%;
      min-height: 50px;
      border-radius: 8px;
      border: 1px solid var(--primary);
      background: var(--primary);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font: inherit;
      font-weight: 800;
      text-decoration: none;
      cursor: pointer;
      margin-top: 14px;
    }
    button.secondary {
      background: transparent;
      color: var(--primary);
    }
    .error { color: var(--error); }
    .hidden { display: none; }
  </style>
</head>
<body>
  <main>
    <h1>LitroCerto</h1>
    <h2>Autorizar acesso</h2>
    <section id="loading">
      <p>Carregando autorização...</p>
    </section>
    <section id="invalid" class="hidden">
      <p class="error">Autorização inválida ou expirada. Volte ao app que solicitou o acesso e tente iniciar sessão novamente.</p>
      <a class="button secondary" href="${escapeHtml(origin)}">Voltar</a>
    </section>
    <section id="login" class="hidden">
      <p>Faça login no LitroCerto para autorizar o acesso aos seus dados.</p>
      <p>Essa autorização vale apenas para a sua conta.</p>
      <button id="loginButton">Login com Google</button>
    </section>
    <section id="consent" class="hidden">
      <p><strong id="clientName">App conectado</strong> quer acessar sua conta LitroCerto.</p>
      <p id="email"></p>
      <p>Ao autorizar, este app poderá consultar métricas e criar ou editar registros quando você pedir.</p>
      <p id="error" class="error"></p>
      <button id="approveButton">Autorizar</button>
      <button id="cancelButton" class="secondary">Cancelar</button>
    </section>
  </main>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script>
    const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
    const SUPABASE_KEY = ${JSON.stringify(supabaseKey)};
    const PARAMS = ${JSON.stringify(params)};
    const REQUIRED = ["response_type", "client_id", "redirect_uri"];
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    function show(id) {
      for (const section of document.querySelectorAll("section")) {
        section.classList.add("hidden");
      }
      document.getElementById(id).classList.remove("hidden");
    }

    function clientName() {
      try {
        const host = new URL(PARAMS.redirect_uri).hostname;
        if (host === "claude.ai") return "Claude";
        if (host === "chat.openai.com" || host === "chatgpt.com") return "ChatGPT";
      } catch {}
      return "App conectado";
    }

    function deny() {
      const redirectUrl = new URL(PARAMS.redirect_uri);
      redirectUrl.searchParams.set("error", "access_denied");
      if (PARAMS.state) redirectUrl.searchParams.set("state", PARAMS.state);
      window.location.href = redirectUrl.toString();
    }

    async function approve() {
      const error = document.getElementById("error");
      error.textContent = "";
      document.getElementById("approveButton").disabled = true;
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        show("login");
        return;
      }

      const result = await fetch("/api/oauth/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...PARAMS, supabase_access_token: token })
      });
      const payload = await result.json();
      if (!result.ok || !payload.redirect_url) {
        error.textContent = payload.message || "Não foi possível autorizar o acesso.";
        document.getElementById("approveButton").disabled = false;
        return;
      }

      window.location.href = payload.redirect_url;
    }

    async function start() {
      if (REQUIRED.some((key) => !PARAMS[key])) {
        show("invalid");
        return;
      }

      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) {
        show("login");
        return;
      }

      document.getElementById("clientName").textContent = clientName();
      document.getElementById("email").textContent = data.session.user.email || "";
      show("consent");
    }

    document.getElementById("loginButton").addEventListener("click", async () => {
      await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.href }
      });
    });
    document.getElementById("approveButton").addEventListener("click", approve);
    document.getElementById("cancelButton").addEventListener("click", deny);
    start().catch(() => show("invalid"));
  </script>
</body>
</html>`;
}

function publicOrigin(request: VercelRequest) {
  const host = request.headers["x-forwarded-host"] ?? request.headers.host ?? "app.litrocerto.com.br";
  const proto = request.headers["x-forwarded-proto"] ?? "https";
  const hostValue = Array.isArray(host) ? host[0] : host;
  const protoValue = Array.isArray(proto) ? proto[0] : proto;
  return `${protoValue}://${hostValue}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
