import {
  AppState,
  Car,
  CarFactory,
  DashboardCalculator,
  FuelLog,
  FuelLogFactory,
  FuelPrice,
  FuelType,
  Station,
  User,
  VehicleName,
  VehicleType
} from "../domain";
import { McpUserContext } from "./supabaseAuth";

type ProfileRow = {
  owner_id: string;
  name: string | null;
  email: string | null;
  selected_car_id: string | null;
  filtered_car_ids: string[] | null;
  theme_mode: "light" | "dark" | null;
  theme_palette: "green" | "pink" | "blue" | "orange" | null;
  demo_data_loaded: boolean | null;
  updated_at?: string;
};

type CarRow = {
  id: string;
  owner_id: string;
  vehicle_type: VehicleType | null;
  nickname: string;
  brand: string;
  model: string;
};

type StationRow = {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
};

type FuelLogRow = {
  id: string;
  owner_id: string;
  sequence: number | null;
  car_id: string;
  station_id: string;
  fuel: FuelType;
  paid: number;
  liters: number;
  price_per_liter: number;
  odometer_km: number | null;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
};

export class LitroCertoMcpService {
  constructor(private readonly context: McpUserContext) {}

  async listVehicles() {
    const result = await this.context.supabase
      .from("cars")
      .select("*")
      .eq("owner_id", this.context.ownerId)
      .order("nickname");
    throwIfError(result.error);
    return (result.data ?? []).map((row) => this.carFromRow(row as CarRow));
  }

  async createVehicle(input: {
    vehicleType?: VehicleType;
    brand: string;
    model: string;
  }) {
    const vehicles = await this.listVehicles();
    const brand = input.brand;
    const model = input.model;
    const vehicle = CarFactory.create({
      vehicleType: input.vehicleType,
      nickname: VehicleName.unique(brand, model, vehicles),
      brand,
      model
    });
    await this.ensureProfile();
    await this.upsertVehicle(vehicle);
    return withUserMessage(vehicle, `Pronto. Veículo ${vehicle.nickname} criado.`);
  }

  async updateVehicle(input: {
    id: string;
    vehicleType?: VehicleType;
    brand?: string;
    model?: string;
  }) {
    const current = await this.getVehicle(input.id);
    const vehicles = await this.listVehicles();
    const brand = input.brand ?? current.brand;
    const model = input.model ?? current.model;
    const updated = CarFactory.update(current, {
      vehicleType: input.vehicleType ?? current.vehicleType,
      nickname: VehicleName.unique(brand, model, vehicles, current.id),
      brand,
      model
    });
    await this.upsertVehicle(updated);
    return withUserMessage(updated, `Pronto. Veículo ${updated.nickname} atualizado.`);
  }

  async listStations() {
    const result = await this.context.supabase
      .from("stations")
      .select("*")
      .eq("owner_id", this.context.ownerId)
      .order("name");
    throwIfError(result.error);
    return (result.data ?? []).map((row) => this.stationFromRow(row as StationRow));
  }

  async createStation(input: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
  }) {
    const coordinates = await geocodeStation(input.address, input.city, input.state);
    const station: Station = {
      id: `posto-${Date.now()}`,
      name: input.name.trim(),
      address: input.address?.trim() || "Sem endereço",
      city: input.city?.trim(),
      state: input.state?.trim().toUpperCase(),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    };
    await this.ensureProfile();
    await this.upsertStation(station);
    return withUserMessage(station, `Pronto. Posto ${station.name} criado.`);
  }

  async updateStation(input: {
    id: string;
    name?: string;
    address?: string;
    city?: string;
    state?: string;
  }) {
    const current = await this.getStation(input.id);
    const nextAddress = input.address?.trim() || current.address;
    const nextCity = input.city?.trim() ?? current.city;
    const nextState = input.state?.trim().toUpperCase() ?? current.state;
    const shouldGeocode = nextAddress !== current.address || nextCity !== current.city || nextState !== current.state;
    const coordinates = shouldGeocode ? await geocodeStation(nextAddress, nextCity, nextState, current) : current;
    const updated: Station = {
      ...current,
      name: input.name?.trim() || current.name,
      address: nextAddress,
      city: nextCity,
      state: nextState,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    };
    await this.upsertStation(updated);
    return withUserMessage(updated, `Pronto. Posto ${updated.name} atualizado.`);
  }

  async listFuelLogs(limit = 30) {
    const result = await this.context.supabase
      .from("fuel_logs")
      .select("*")
      .eq("owner_id", this.context.ownerId)
      .order("created_at", { ascending: false })
      .limit(limit);
    throwIfError(result.error);
    return (result.data ?? []).map((row) => this.logFromRow(row as FuelLogRow));
  }

  async createFuelLog(input: {
    carId: string;
    stationId: string;
    fuel: FuelType;
    paid: number;
    liters: number;
    odometerKm?: number;
    createdAt?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const car = await this.getVehicle(input.carId);
    const station = await this.getStation(input.stationId);
    const sequence = await this.nextFuelLogSequence();
    const log = {
      ...FuelLogFactory.create({
        carId: input.carId,
        stationId: input.stationId,
        fuel: input.fuel,
        paid: input.paid,
        liters: input.liters,
        odometerKm: input.odometerKm,
        createdAt: input.createdAt ?? new Date().toISOString(),
        latitude: input.latitude ?? station.latitude,
        longitude: input.longitude ?? station.longitude
      }),
      sequence
    };

    await this.ensureProfile();
    await this.upsertFuelLog(log);
    return withUserMessage(log, fuelLogUserMessage("registrado", log, car, station));
  }

  async updateFuelLog(input: {
    id: string;
    carId?: string;
    stationId?: string;
    fuel?: FuelType;
    paid?: number;
    liters?: number;
    odometerKm?: number;
    createdAt?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const current = await this.getFuelLog(input.id);
    const carId = input.carId ?? current.carId;
    const stationId = input.stationId ?? current.stationId;
    await this.assertVehicleExists(carId);
    await this.assertStationExists(stationId);

    const paid = input.paid ?? current.paid;
    const liters = input.liters ?? current.liters;
    const price = new FuelPrice(paid, liters);
    if (!price.isValid()) {
      throw new Error("Valor pago e litros precisam ser maiores que zero.");
    }

    const updated: FuelLog = {
      ...current,
      carId,
      stationId,
      fuel: input.fuel ?? current.fuel,
      paid,
      liters,
      pricePerLiter: price.valuePerLiter(),
      odometerKm: input.odometerKm ?? current.odometerKm,
      createdAt: input.createdAt ?? current.createdAt,
      latitude: input.latitude ?? current.latitude,
      longitude: input.longitude ?? current.longitude
    };
    await this.upsertFuelLog(updated);
    const car = await this.getVehicle(updated.carId);
    const station = await this.getStation(updated.stationId);
    return withUserMessage(updated, fuelLogUserMessage("atualizado", updated, car, station));
  }

  async metrics(month?: string) {
    const state = await this.loadState();
    const referenceDate = parseMonth(month);
    return new DashboardCalculator(state, referenceDate).calculate();
  }

  private async loadState(): Promise<AppState> {
    const [cars, stations, logs, profile] = await Promise.all([
      this.listVehicles(),
      this.listStations(),
      this.listFuelLogs(500),
      this.getProfile()
    ]);

    return {
      user: this.profileToUser(profile),
      cars,
      selectedCarId: profile?.selected_car_id ?? cars[0]?.id ?? null,
      filteredCarIds: profile?.filtered_car_ids ?? cars.map((car) => car.id),
      stations,
      logs,
      themeMode: profile?.theme_mode ?? "light",
      themePalette: profile?.theme_palette ?? "blue",
      demoDataLoaded: profile?.demo_data_loaded ?? false
    };
  }

  private async getProfile() {
    const result = await this.context.supabase
      .from("profiles")
      .select("*")
      .eq("owner_id", this.context.ownerId)
      .maybeSingle();
    throwIfError(result.error);
    return result.data as ProfileRow | null;
  }

  private async ensureProfile() {
    const profile: ProfileRow = {
      owner_id: this.context.ownerId,
      name: this.context.name,
      email: this.context.email,
      selected_car_id: null,
      filtered_car_ids: [],
      theme_mode: "light",
      theme_palette: "blue",
      demo_data_loaded: false,
      updated_at: new Date().toISOString()
    };
    const result = await this.context.supabase
      .from("profiles")
      .upsert(profile, { onConflict: "owner_id", ignoreDuplicates: false });
    throwIfError(result.error);
  }

  private async getVehicle(id: string) {
    const result = await this.context.supabase
      .from("cars")
      .select("*")
      .eq("owner_id", this.context.ownerId)
      .eq("id", id)
      .maybeSingle();
    throwIfError(result.error);
    if (!result.data) {
      throw new Error("Veículo não encontrado.");
    }
    return this.carFromRow(result.data as CarRow);
  }

  private async getStation(id: string) {
    const result = await this.context.supabase
      .from("stations")
      .select("*")
      .eq("owner_id", this.context.ownerId)
      .eq("id", id)
      .maybeSingle();
    throwIfError(result.error);
    if (!result.data) {
      throw new Error("Posto não encontrado.");
    }
    return this.stationFromRow(result.data as StationRow);
  }

  private async getFuelLog(id: string) {
    const result = await this.context.supabase
      .from("fuel_logs")
      .select("*")
      .eq("owner_id", this.context.ownerId)
      .eq("id", id)
      .maybeSingle();
    throwIfError(result.error);
    if (!result.data) {
      throw new Error("Abastecimento não encontrado.");
    }
    return this.logFromRow(result.data as FuelLogRow);
  }

  private async assertVehicleExists(id: string) {
    await this.getVehicle(id);
  }

  private async assertStationExists(id: string) {
    await this.getStation(id);
  }

  private async nextFuelLogSequence() {
    const result = await this.context.supabase
      .from("fuel_logs")
      .select("sequence")
      .eq("owner_id", this.context.ownerId)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();
    throwIfError(result.error);
    const sequence = (result.data as Pick<FuelLogRow, "sequence"> | null)?.sequence ?? 0;
    return sequence + 1;
  }

  private async upsertVehicle(vehicle: Car) {
    const result = await this.context.supabase
      .from("cars")
      .upsert(this.carToRow(vehicle), { onConflict: "id" });
    throwIfError(result.error);
  }

  private async upsertStation(station: Station) {
    const result = await this.context.supabase
      .from("stations")
      .upsert(this.stationToRow(station), { onConflict: "id" });
    throwIfError(result.error);
  }

  private async upsertFuelLog(log: FuelLog) {
    const result = await this.context.supabase
      .from("fuel_logs")
      .upsert(this.logToRow(log), { onConflict: "id" });
    throwIfError(result.error);
  }

  private profileToUser(profile: ProfileRow | null): User {
    return {
      name: profile?.name ?? this.context.name,
      email: profile?.email ?? this.context.email
    };
  }

  private carFromRow(row: CarRow): Car {
    return {
      id: row.id,
      vehicleType: row.vehicle_type ?? "Carro",
      nickname: row.nickname,
      brand: row.brand,
      model: row.model
    };
  }

  private carToRow(car: Car): CarRow {
    return {
      id: car.id,
      owner_id: this.context.ownerId,
      vehicle_type: car.vehicleType,
      nickname: car.nickname,
      brand: car.brand,
      model: car.model
    };
  }

  private stationFromRow(row: StationRow): Station {
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      latitude: row.latitude,
      longitude: row.longitude
    };
  }

  private stationToRow(station: Station): StationRow {
    return {
      id: station.id,
      owner_id: this.context.ownerId,
      name: station.name,
      address: station.address,
      city: station.city ?? null,
      state: station.state ?? null,
      latitude: station.latitude,
      longitude: station.longitude
    };
  }

  private logFromRow(row: FuelLogRow): FuelLog {
    return {
      id: row.id,
      sequence: row.sequence ?? undefined,
      carId: row.car_id,
      stationId: row.station_id,
      fuel: row.fuel,
      paid: row.paid,
      liters: row.liters,
      pricePerLiter: row.price_per_liter,
      odometerKm: row.odometer_km ?? undefined,
      createdAt: row.created_at,
      latitude: row.latitude ?? undefined,
      longitude: row.longitude ?? undefined
    };
  }

  private logToRow(log: FuelLog): FuelLogRow {
    return {
      id: log.id,
      owner_id: this.context.ownerId,
      sequence: log.sequence ?? null,
      car_id: log.carId,
      station_id: log.stationId,
      fuel: log.fuel,
      paid: log.paid,
      liters: log.liters,
      price_per_liter: log.pricePerLiter,
      odometer_km: log.odometerKm ?? null,
      created_at: log.createdAt,
      latitude: log.latitude ?? null,
      longitude: log.longitude ?? null
    };
  }
}

function throwIfError(error: unknown) {
  if (error) {
    throw error;
  }
}

async function geocodeStation(address?: string, city?: string, state?: string, fallback?: Pick<Station, "latitude" | "longitude">) {
  const query = [address, city, state, "Brasil"].filter(Boolean).join(", ");
  if (!query.trim()) {
    return fallback ?? { latitude: -23.5614, longitude: -46.6559 };
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    const response = await fetch(url, {
      headers: {
        "user-agent": "LitroCerto/0.1 contato@litrocerto.app"
      }
    });
    if (!response.ok) {
      return fallback ?? { latitude: -23.5614, longitude: -46.6559 };
    }

    const [result] = await response.json() as Array<{ lat?: string; lon?: string }>;
    const latitude = Number(result?.lat);
    const longitude = Number(result?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return fallback ?? { latitude: -23.5614, longitude: -46.6559 };
    }

    return { latitude, longitude };
  } catch {
    return fallback ?? { latitude: -23.5614, longitude: -46.6559 };
  }
}

function parseMonth(month?: string) {
  if (!month) {
    return new Date();
  }

  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error("Mês inválido. Use YYYY-MM.");
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function withUserMessage<T extends object>(data: T, userMessage: string): T & { userMessage: string } {
  return {
    ...data,
    userMessage
  };
}

function fuelLogUserMessage(action: "registrado" | "atualizado", log: FuelLog, car: Car, station: Station) {
  const sequence = log.sequence ? ` #${log.sequence}` : "";
  const liters = formatNumber(log.liters);
  const paid = formatCurrency(log.paid);
  const price = formatCurrency(log.pricePerLiter);
  const odometer = typeof log.odometerKm === "number" ? `, km ${formatNumber(log.odometerKm)}` : "";
  return `Pronto. Abastecimento${sequence} ${action}: ${liters} L por ${paid} no ${car.nickname}, ${station.name}, ${log.fuel}${odometer}. Preço por litro: ${price}/L.`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}
