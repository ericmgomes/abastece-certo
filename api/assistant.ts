import { IncomingMessage, ServerResponse } from "http";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { AppState, FuelLog, FuelType } from "../src/domain";
import { LitroCertoMcpService } from "../src/mcp/litroCertoService";
import { contextFromBearerToken } from "../src/mcp/supabaseAuth";

loadLocalEnv();

type VercelRequest = IncomingMessage & {
  method?: string;
  body?: unknown;
};

type VercelResponse = ServerResponse & {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
};

type AssistantRequestBody = {
  message?: string;
  conversation?: Array<{ role?: "assistant" | "user"; text?: string }>;
  state?: Partial<AppState>;
};

type AssistantDraftFuelLog = {
  carId?: string;
  stationId?: string;
  fuel?: FuelType;
  paid?: number;
  liters?: number;
  odometerKm?: number;
  createdAt?: string;
  missingFields?: string[];
};

type AssistantPayload = {
  answer: string;
  draftFuelLog?: AssistantDraftFuelLog;
};

function loadLocalEnv() {
  if (process.env.VERCEL === "1") {
    return;
  }

  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (process.env[key]) {
      return;
    }

    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  });
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
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
    const body = await readBody(request) as AssistantRequestBody;
    const message = body.message?.trim();
    if (!message) {
      response.status(400).json({ error: "bad_request", message: "Digite uma mensagem para o assistente." });
      return;
    }

    const appState = await stateFromRequest(request, body);
    const result = await assistantResponse(message, appState, body.conversation ?? []);
    response.status(200).json(result);
  } catch (error) {
    response.status(400).json({
      error: "assistant_error",
      message: error instanceof Error ? error.message : "Não foi possível responder agora."
    });
  }
}

async function assistantResponse(
  message: string,
  state: AppState,
  conversation: Array<{ role?: "assistant" | "user"; text?: string }>
): Promise<AssistantPayload> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada. A IA real não pode responder.");
  }

  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_ASSISTANT_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 350,
      messages: [
        {
          role: "system",
          content: [
            "Você é o assistente do app LitroCerto.",
            "Responda em português do Brasil, com frases curtas e úteis.",
            "Você pode consultar o contexto enviado e preparar um abastecimento, mas nunca diga que salvou sem confirmação do usuário.",
            "Sempre retorne JSON válido no formato: {\"answer\":\"texto\", \"draftFuelLog\": opcional}.",
            "draftFuelLog só deve aparecer quando o usuário pedir para registrar/preencher um abastecimento.",
            "Use IDs reais do contexto para carId e stationId. Se não tiver certeza, deixe ausente e liste em missingFields.",
            "Combustíveis aceitos no frontend agora: Gasolina comum, Gasolina aditivada, Etanol, Diesel.",
            "Use o histórico recente da conversa para interpretar perguntas curtas como 'e mês passado?', 'e no Fastback?' ou 'e naquele posto?'.",
            "Se a pergunta anterior era sobre km/L, uma continuação temporal também deve responder km/L, não gasto."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify({
            userMessage: message,
            recentConversation: compactConversation(conversation),
            context: compactState(state),
            today: new Date().toISOString()
          })
        }
      ]
    })
  });

  if (!openAiResponse.ok) {
    throw new Error(await openAiErrorMessage(openAiResponse));
  }

  const data = await openAiResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("A OpenAI não retornou conteúdo.");
  }

  return normalizeAssistantPayload(JSON.parse(content));
}

async function openAiErrorMessage(response: Response) {
  const status = response.status;
  const detail = await safeOpenAiErrorDetail(response);
  if (status === 401) {
    return withDetail("A chave da OpenAI não foi aceita. Confira a OPENAI_API_KEY.", detail);
  }

  if (status === 429) {
    return withDetail("A OpenAI recusou por limite, rate limit ou créditos da conta.", detail);
  }

  return withDetail(`OpenAI retornou ${status}.`, detail);
}

async function safeOpenAiErrorDetail(response: Response) {
  try {
    const payload = await response.json() as { error?: { message?: string; code?: string; type?: string } };
    return [payload.error?.message, payload.error?.code, payload.error?.type].filter(Boolean).join(" ");
  } catch {
    return "";
  }
}

function withDetail(message: string, detail: string) {
  if (!detail) {
    return message;
  }

  return `${message} Detalhe: ${detail}`;
}

async function stateFromRequest(request: VercelRequest, body: AssistantRequestBody): Promise<AppState> {
  const token = bearerToken(request.headers.authorization);
  if (!token) {
    return snapshotToState(body.state);
  }

  const service = new LitroCertoMcpService(await contextFromBearerToken(token));
  const [cars, stations, logs] = await Promise.all([
    service.listVehicles(),
    service.listStations(),
    service.listFuelLogs(500)
  ]);

  return {
    user: null,
    cars,
    stations,
    logs,
    selectedCarId: cars[0]?.id ?? null,
    filteredCarIds: cars.map((car) => car.id),
    themeMode: "light",
    themePalette: "green",
    demoDataLoaded: false
  };
}

function compactConversation(conversation: Array<{ role?: "assistant" | "user"; text?: string }>) {
  return conversation.slice(-8).map((message) => ({
    role: message.role,
    text: message.text
  }));
}

function compactState(state: AppState) {
  return {
    cars: state.cars.map((car) => ({
      id: car.id,
      name: car.nickname,
      brand: car.brand,
      model: car.model,
      type: car.vehicleType
    })),
    stations: state.stations.map((station) => ({
      id: station.id,
      name: station.name,
      address: station.address,
      city: station.city,
      state: station.state
    })),
    recentFuelLogs: state.logs.slice(0, 40).map((log) => ({
      id: log.id,
      sequence: log.sequence,
      carId: log.carId,
      stationId: log.stationId,
      fuel: log.fuel,
      paid: log.paid,
      liters: log.liters,
      pricePerLiter: log.pricePerLiter,
      odometerKm: log.odometerKm,
      createdAt: log.createdAt
    }))
  };
}

function snapshotToState(snapshot?: Partial<AppState>): AppState {
  return {
    user: snapshot?.user ?? null,
    cars: snapshot?.cars ?? [],
    stations: snapshot?.stations ?? [],
    logs: (snapshot?.logs ?? []) as FuelLog[],
    selectedCarId: snapshot?.selectedCarId ?? snapshot?.cars?.[0]?.id ?? null,
    filteredCarIds: snapshot?.filteredCarIds ?? snapshot?.cars?.map((car) => car.id) ?? [],
    themeMode: snapshot?.themeMode ?? "light",
    themePalette: snapshot?.themePalette ?? "green",
    demoDataLoaded: snapshot?.demoDataLoaded ?? true
  };
}

function normalizeAssistantPayload(value: unknown): AssistantPayload {
  const payload = value as AssistantPayload;
  return {
    answer: typeof payload.answer === "string" && payload.answer.trim()
      ? payload.answer.trim()
      : "Pronto.",
    draftFuelLog: payload.draftFuelLog
  };
}

function setCors(response: VercelResponse) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "authorization,content-type");
  response.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
}

async function readBody(request: VercelRequest) {
  if (request.body) {
    return request.body;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function bearerToken(value?: string | string[]) {
  const header = Array.isArray(value) ? value[0] : value;
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}
