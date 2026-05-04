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
  accepted_fuel: FuelType[];
  default_fuel: FuelType;
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
    nickname: string;
    brand?: string;
    model?: string;
    acceptedFuel?: FuelType[];
    defaultFuel: FuelType;
  }) {
    const vehicle = CarFactory.create({
      vehicleType: input.vehicleType,
      nickname: input.nickname,
      brand: input.brand ?? "",
      model: input.model ?? "",
      acceptedFuel: input.acceptedFuel,
      defaultFuel: input.defaultFuel
    });
    await this.ensureProfile();
    await this.upsertVehicle(vehicle);
    return vehicle;
  }

  async updateVehicle(input: {
    id: string;
    vehicleType?: VehicleType;
    nickname?: string;
    brand?: string;
    model?: string;
    acceptedFuel?: FuelType[];
    defaultFuel?: FuelType;
  }) {
    const current = await this.getVehicle(input.id);
    const updated = CarFactory.update(current, {
      vehicleType: input.vehicleType ?? current.vehicleType,
      nickname: input.nickname ?? current.nickname,
      brand: input.brand ?? current.brand,
      model: input.model ?? current.model,
      acceptedFuel: input.acceptedFuel ?? current.acceptedFuel,
      defaultFuel: input.defaultFuel ?? current.defaultFuel
    });
    await this.upsertVehicle(updated);
    return updated;
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
    latitude: number;
    longitude: number;
  }) {
    const station: Station = {
      id: `posto-${Date.now()}`,
      name: input.name.trim(),
      address: input.address?.trim() || "Sem endereço",
      city: input.city?.trim(),
      state: input.state?.trim().toUpperCase(),
      latitude: input.latitude,
      longitude: input.longitude
    };
    await this.ensureProfile();
    await this.upsertStation(station);
    return station;
  }

  async updateStation(input: {
    id: string;
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const current = await this.getStation(input.id);
    const updated: Station = {
      ...current,
      name: input.name?.trim() || current.name,
      address: input.address?.trim() || current.address,
      city: input.city?.trim() ?? current.city,
      state: input.state?.trim().toUpperCase() ?? current.state,
      latitude: input.latitude ?? current.latitude,
      longitude: input.longitude ?? current.longitude
    };
    await this.upsertStation(updated);
    return updated;
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
    await this.assertVehicleExists(input.carId);
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
    return log;
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
    return updated;
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
      themePalette: profile?.theme_palette ?? "green",
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
      theme_palette: "green",
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
      model: row.model,
      acceptedFuel: row.accepted_fuel,
      defaultFuel: row.default_fuel
    };
  }

  private carToRow(car: Car): CarRow {
    return {
      id: car.id,
      owner_id: this.context.ownerId,
      vehicle_type: car.vehicleType,
      nickname: car.nickname,
      brand: car.brand,
      model: car.model,
      accepted_fuel: car.acceptedFuel,
      default_fuel: car.defaultFuel
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
