import { AppState } from "../../src/domain";
import { LitroCertoMcpService } from "../../src/mcp/litroCertoService";
import { McpUserContext } from "../../src/mcp/supabaseAuth";
import { WhatsAppLinkRow, whatsappServiceSupabase } from "../../src/whatsapp/whatsappLinks";
import { assistantResponse } from "../assistant";

export async function answerConnectedWhatsAppMessage(link: WhatsAppLinkRow, text: string) {
  if (!link.owner_id) {
    return "Faça login pelo link de conexão antes de conversar comigo pelo WhatsApp.";
  }

  const service = new LitroCertoMcpService({
    token: "whatsapp",
    ownerId: link.owner_id,
    email: "",
    name: link.display_name ?? "Usuário",
    supabase: whatsappServiceSupabase()
  } satisfies McpUserContext);
  const [cars, stations, logs] = await Promise.all([
    service.listVehicles(),
    service.listStations(),
    service.listFuelLogs(500)
  ]);
  const state: AppState = {
    user: {
      name: link.display_name ?? "Usuário"
    },
    cars,
    stations,
    logs,
    selectedCarId: cars[0]?.id ?? null,
    filteredCarIds: cars.map((car) => car.id),
    themeMode: "light",
    themePalette: "blue",
    demoDataLoaded: false
  };
  const response = await assistantResponse(text, state, []);
  if (!response.draftFuelLog) {
    return response.answer;
  }

  return `${response.answer}\n\nAinda não salvei pelo WhatsApp. Confira no app antes de registrar.`;
}

