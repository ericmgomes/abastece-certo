import React, { useRef, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import {
  AppState,
  Car,
  FuelLog,
  FuelLogFactory,
  FuelType,
  IdFactory,
  Station,
  fuels
} from "../../domain";
import { supabase } from "../../supabaseClient";
import { trackEvent } from "../../analytics";

export type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  isError?: boolean;
  draftFuelLog?: AssistantDraftFuelLog;
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

type SectionComponent = React.ComponentType<{ title: string; children: React.ReactNode }>;
type AssistantStyles = Record<string, any>;
type AssistantTheme = { muted: string };

const visibleFuels = fuels.filter((fuel) => fuel !== "Gás Natural" && fuel !== "Eletricidade");
const fakeCurrentLocation = {
  latitude: -23.5614,
  longitude: -46.6559
};

export const initialAssistantMessages: AssistantMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    text: "Posso consultar seus gastos, comparar postos e preparar um abastecimento para você confirmar."
  }
];

export function AssistantScreen({
  state,
  messages,
  setMessages,
  onOpenAuth,
  onSaveFuelLog,
  Section,
  styles,
  theme
}: {
  state: AppState;
  messages: AssistantMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AssistantMessage[]>>;
  onOpenAuth: () => void;
  onSaveFuelLog: (log: FuelLog) => void;
  Section: SectionComponent;
  styles: AssistantStyles;
  theme: AssistantTheme;
}) {
  const inputRef = useRef<TextInput>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const quickPrompts = [
    "Quanto gastei este mês?",
    "Qual posto está mais barato?",
    "Como está meu km/L?",
    "Registrar abastecimento"
  ];

  async function sendMessage(text = input, source: "manual" | "quick_prompt" = "manual") {
    const trimmed = text.trim();
    if (!trimmed || loading) {
      return;
    }

    const userMessage: AssistantMessage = {
      id: IdFactory.create("msg-user"),
      role: "user",
      text: trimmed
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    inputRef.current?.focus();
    setLoading(true);
    trackEvent("ai_message_sent", {
      source,
      auth_state: state.user?.email ? "authenticated" : "guest",
      message_length: trimmed.length
    });

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const response = await fetch(assistantApiUrl(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: trimmed,
          conversation: assistantConversationSnapshot([...messages, userMessage]),
          state: assistantStateSnapshot(state)
        })
      });
      const rawPayload = await response.text();
      const payload = parseAssistantResponse(rawPayload);
      if (!response.ok) {
        throw new Error(payload.message ?? "Não foi possível falar com o assistente.");
      }

      trackEvent("ai_response_received", {
        auth_state: state.user?.email ? "authenticated" : "guest",
        has_draft: Boolean(payload.draftFuelLog)
      });
      setMessages((current) => [
        ...current,
        {
          id: IdFactory.create("msg-assistant"),
          role: "assistant",
          text: payload.answer ?? "Pronto.",
          draftFuelLog: payload.draftFuelLog
        }
      ]);
    } catch (error) {
      trackEvent("ai_response_error", {
        auth_state: state.user?.email ? "authenticated" : "guest"
      });
      setMessages((current) => [
        ...current,
        {
          id: IdFactory.create("msg-error"),
          role: "assistant",
          text: error instanceof Error ? error.message : "Não consegui responder agora.",
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function confirmDraft(draft: AssistantDraftFuelLog) {
    const validation = validateAssistantDraft(draft, state);
    if (!validation.valid) {
      setMessages((current) => [
        ...current,
        {
          id: IdFactory.create("msg-draft-invalid"),
          role: "assistant",
          text: validation.message
        }
      ]);
      return;
    }

    const station = state.stations.find((item) => item.id === draft.stationId);
    onSaveFuelLog(FuelLogFactory.create({
      carId: draft.carId!,
      stationId: draft.stationId!,
      fuel: draft.fuel!,
      paid: draft.paid!,
      liters: draft.liters!,
      odometerKm: draft.odometerKm,
      createdAt: draft.createdAt ?? new Date().toISOString(),
      latitude: station?.latitude ?? fakeCurrentLocation.latitude,
      longitude: station?.longitude ?? fakeCurrentLocation.longitude
    }));
    trackEvent("ai_fuel_log_draft_confirmed", {
      auth_state: state.user?.email ? "authenticated" : "guest",
      fuel_type: draft.fuel,
      has_odometer: Boolean(draft.odometerKm)
    });
    setMessages((current) => [
      ...current,
      {
        id: IdFactory.create("msg-saved"),
        role: "assistant",
        text: "Abastecimento registrado."
      }
    ]);
  }

  return (
    <View style={styles.stack}>
      <Section title="Assistente de IA">
        {!state.user?.email ? (
          <View style={styles.assistantDemoNotice}>
            <Text style={styles.demoBannerTitle}>Você está conversando com dados de exemplo</Text>
            <Text style={styles.demoBannerText}>Faça login para usar seus próprios veículos, postos e abastecimentos.</Text>
            <Pressable style={styles.demoBannerButton} onPress={onOpenAuth}>
              <Text style={styles.demoBannerButtonText}>Login</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.assistantQuickRow}>
          {quickPrompts.map((prompt) => (
            <Pressable key={prompt} style={styles.assistantChip} onPress={() => void sendMessage(prompt, "quick_prompt")}>
              <Text style={styles.assistantChipText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.assistantMessages}>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.assistantBubble,
                message.role === "user" ? styles.assistantBubbleUser : styles.assistantBubbleBot,
                message.isError ? styles.assistantBubbleError : null
              ]}
            >
              <Text
                style={[
                  message.role === "user" ? styles.assistantBubbleUserText : styles.assistantBubbleText,
                  message.isError ? styles.assistantBubbleErrorText : null
                ]}
              >
                {message.text}
              </Text>
              {message.draftFuelLog ? (
                <AssistantDraftCard
                  draft={message.draftFuelLog}
                  cars={state.cars}
                  stations={state.stations}
                  onConfirm={() => confirmDraft(message.draftFuelLog!)}
                  styles={styles}
                />
              ) : null}
            </View>
          ))}
          {loading ? <Text style={styles.muted}>Pensando...</Text> : null}
        </View>
        <View style={styles.assistantComposer}>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder="Escreva uma mensagem..."
            placeholderTextColor={theme.muted}
            style={styles.assistantInput}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => void sendMessage()}
          />
        </View>
      </Section>
    </View>
  );
}

function assistantApiUrl() {
  if (Platform.OS !== "web") {
    return "/api/assistant";
  }

  const location = (globalThis as unknown as { location?: Location }).location;
  if ((location?.hostname === "localhost" || location?.hostname === "127.0.0.1") && location.port === "8086") {
    return "http://localhost:8087/api/assistant";
  }

  return "/api/assistant";
}

function parseAssistantResponse(rawPayload: string) {
  try {
    return JSON.parse(rawPayload) as { answer?: string; draftFuelLog?: AssistantDraftFuelLog; message?: string };
  } catch {
    return {
      message: "A resposta da IA não veio no formato esperado."
    };
  }
}

function AssistantDraftCard({
  draft,
  cars,
  stations,
  onConfirm,
  styles
}: {
  draft: AssistantDraftFuelLog;
  cars: Car[];
  stations: Station[];
  onConfirm: () => void;
  styles: AssistantStyles;
}) {
  const car = cars.find((item) => item.id === draft.carId);
  const station = stations.find((item) => item.id === draft.stationId);
  const missingFields = getAssistantDraftMissingFields(draft);

  if (missingFields.length) {
    return null;
  }

  return (
    <View style={styles.assistantDraftCard}>
      <Text style={styles.itemTitle}>Confirmar abastecimento</Text>
      <Text style={styles.muted}>Veículo: {car?.nickname ?? "não identificado"}</Text>
      <Text style={styles.muted}>Posto: {station?.name ?? "não identificado"}</Text>
      <Text style={styles.muted}>Combustível: {draft.fuel ?? "não informado"}</Text>
      <Text style={styles.muted}>Valor: {draft.paid ? formatCurrency(draft.paid) : "não informado"}</Text>
      <Text style={styles.muted}>Litros: {draft.liters ? `${draft.liters.toLocaleString("pt-BR")} L` : "não informado"}</Text>
      <Text style={styles.muted}>Km atual: {draft.odometerKm ? `${draft.odometerKm.toLocaleString("pt-BR")} km` : "não informado"}</Text>
      <View style={styles.actionRow}>
        <Pressable style={styles.primaryButton} onPress={onConfirm}>
          <Text style={styles.primaryButtonText}>Confirmar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getAssistantDraftMissingFields(draft: AssistantDraftFuelLog) {
  return [
    !draft.carId ? "veículo" : null,
    !draft.stationId ? "posto" : null,
    !draft.fuel ? "combustível" : null,
    !draft.paid ? "valor pago" : null,
    !draft.liters ? "litros" : null
  ].filter((field): field is string => Boolean(field));
}

function validateAssistantDraft(draft: AssistantDraftFuelLog, state: AppState) {
  const missing = getAssistantDraftMissingFields(draft);

  if (missing.length) {
    return { valid: false, message: `Ainda falta informar: ${missing.join(", ")}.` };
  }

  if (!state.cars.some((car) => car.id === draft.carId)) {
    return { valid: false, message: "Não encontrei esse veículo na sua lista." };
  }

  if (!state.stations.some((station) => station.id === draft.stationId)) {
    return { valid: false, message: "Não encontrei esse posto na sua lista." };
  }

  if (!visibleFuels.includes(draft.fuel!)) {
    return { valid: false, message: "Esse combustível ainda não está habilitado no app." };
  }

  if (!isBoundedNumber(draft.paid, 0.01, 10000)) {
    return { valid: false, message: "Valor pago precisa ser maior que zero e plausível." };
  }

  if (!isBoundedNumber(draft.liters, 0.01, 1000)) {
    return { valid: false, message: "Litros precisam ser maiores que zero e plausíveis." };
  }

  if (draft.odometerKm !== undefined && !isBoundedNumber(draft.odometerKm, 0, 2000000)) {
    return { valid: false, message: "Km atual precisa ser um número plausível." };
  }

  if (draft.createdAt && !isValidDate(draft.createdAt)) {
    return { valid: false, message: "Data do abastecimento inválida." };
  }

  return { valid: true, message: "" };
}

function isBoundedNumber(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isValidDate(value: string) {
  return Number.isFinite(new Date(value).getTime());
}

function assistantStateSnapshot(state: AppState) {
  return {
    user: state.user,
    cars: state.cars,
    stations: state.stations,
    logs: state.logs.slice(0, 120)
  };
}

function assistantConversationSnapshot(messages: AssistantMessage[]) {
  return messages.slice(-8).map((message) => ({
    role: message.role,
    text: message.text
  }));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}
