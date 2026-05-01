import { AppState, Car, FuelLog, FuelType, Station, ThemeMode, ThemePalette, UserSummary, VehicleType } from "../domain";
import { supabase } from "../supabaseClient";

type ProfileRow = {
  owner_id: string;
  name: string | null;
  email: string | null;
  selected_car_id: string | null;
  filtered_car_ids: string[] | null;
  theme_mode: ThemeMode | null;
  theme_palette: ThemePalette | null;
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

type PersistedRow = {
  id: string;
};

export class SupabaseAppRepository {
  async load(ownerId: string): Promise<Partial<AppState> | null> {
    if (!ownerId) {
      return null;
    }

    const [profileResult, carsResult, stationsResult, logsResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("owner_id", ownerId).maybeSingle(),
      supabase.from("cars").select("*").eq("owner_id", ownerId),
      supabase.from("stations").select("*").eq("owner_id", ownerId),
      supabase.from("fuel_logs").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false })
    ]);

    if (profileResult.error) {
      throw profileResult.error;
    }

    if (carsResult.error) {
      throw carsResult.error;
    }

    if (stationsResult.error) {
      throw stationsResult.error;
    }

    if (logsResult.error) {
      throw logsResult.error;
    }

    if (!profileResult.data && !carsResult.data?.length && !stationsResult.data?.length && !logsResult.data?.length) {
      return null;
    }

    const profile = profileResult.data as ProfileRow | null;

    return {
      user: profile?.name ? { name: profile.name, email: profile.email ?? undefined } : null,
      selectedCarId: profile?.selected_car_id ?? null,
      filteredCarIds: profile?.filtered_car_ids ?? [],
      themeMode: profile?.theme_mode ?? "light",
      themePalette: profile?.theme_palette ?? "green",
      demoDataLoaded: profile?.demo_data_loaded ?? true,
      cars: (carsResult.data ?? []).map((row) => this.carFromRow(row as CarRow)),
      stations: (stationsResult.data ?? []).map((row) => this.stationFromRow(row as StationRow)),
      logs: (logsResult.data ?? []).map((row) => this.logFromRow(row as FuelLogRow))
    };
  }

  async save(ownerId: string, state: AppState): Promise<void> {
    if (!ownerId) {
      return;
    }

    const profile: ProfileRow = {
      owner_id: ownerId,
      name: state.user?.name ?? null,
      email: state.user?.email ?? null,
      selected_car_id: state.selectedCarId,
      filtered_car_ids: state.filteredCarIds ?? [],
      theme_mode: state.themeMode ?? "light",
      theme_palette: state.themePalette ?? "green",
      demo_data_loaded: state.demoDataLoaded ?? false,
      updated_at: new Date().toISOString()
    };

    const profileResult = await supabase.from("profiles").upsert(profile, { onConflict: "owner_id" });
    if (profileResult.error) {
      throw profileResult.error;
    }

    await this.upsertRows("cars", state.cars.map((car) => this.carToRow(ownerId, car)));
    await this.upsertRows("stations", state.stations.map((station) => this.stationToRow(ownerId, station)));
    await this.upsertRows("fuel_logs", state.logs.map((log) => this.logToRow(ownerId, log)));
    await this.deleteMissingRows("cars", ownerId, state.cars.map((car) => car.id));
    await this.deleteMissingRows("stations", ownerId, state.stations.map((station) => station.id));
  }

  async listUserSummaries(): Promise<UserSummary[]> {
    const [profilesResult, carsResult, stationsResult, logsResult] = await Promise.all([
      supabase.from("profiles").select("owner_id,name,email,updated_at").order("updated_at", { ascending: false }),
      supabase.from("cars").select("owner_id,id"),
      supabase.from("stations").select("owner_id,id"),
      supabase.from("fuel_logs").select("owner_id,id")
    ]);

    if (profilesResult.error) {
      throw profilesResult.error;
    }

    if (carsResult.error) {
      throw carsResult.error;
    }

    if (stationsResult.error) {
      throw stationsResult.error;
    }

    if (logsResult.error) {
      throw logsResult.error;
    }

    const vehicleCounts = this.countByOwner(carsResult.data ?? []);
    const stationCounts = this.countByOwner(stationsResult.data ?? []);
    const logCounts = this.countByOwner(logsResult.data ?? []);

    return (profilesResult.data ?? []).map((profile) => {
      const row = profile as Pick<ProfileRow, "owner_id" | "name" | "email" | "updated_at">;
      return {
        ownerId: row.owner_id,
        name: row.name ?? "Sem nome",
        email: row.email ?? "Email não salvo",
        vehicles: vehicleCounts.get(row.owner_id) ?? 0,
        stations: stationCounts.get(row.owner_id) ?? 0,
        fuelLogs: logCounts.get(row.owner_id) ?? 0,
        updatedAt: row.updated_at ?? ""
      };
    });
  }

  private async upsertRows(table: "cars" | "stations" | "fuel_logs", rows: unknown[]) {
    if (rows.length === 0) {
      return;
    }

    const insertResult = await supabase.from(table).upsert(rows, { onConflict: "id" });
    if (insertResult.error) {
      throw insertResult.error;
    }
  }

  private async deleteMissingRows(table: "cars" | "stations" | "fuel_logs", ownerId: string, keptIds: string[]) {
    if (keptIds.length === 0) {
      return;
    }

    const existingResult = await supabase.from(table).select("id").eq("owner_id", ownerId);
    if (existingResult.error) {
      throw existingResult.error;
    }

    const kept = new Set(keptIds);
    const rowsToDelete = ((existingResult.data ?? []) as PersistedRow[]).filter((row) => !kept.has(row.id));
    await Promise.all(rowsToDelete.map(async (row) => {
      const deleteResult = await supabase.from(table).delete().eq("owner_id", ownerId).eq("id", row.id);
      if (deleteResult.error) {
        throw deleteResult.error;
      }
    }));
  }

  private countByOwner(rows: Array<{ owner_id?: string }>) {
    const counts = new Map<string, number>();
    rows.forEach((row) => {
      if (!row.owner_id) {
        return;
      }

      counts.set(row.owner_id, (counts.get(row.owner_id) ?? 0) + 1);
    });

    return counts;
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

  private carToRow(ownerId: string, car: Car): CarRow {
    return {
      id: car.id,
      owner_id: ownerId,
      vehicle_type: car.vehicleType ?? "Carro",
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

  private stationToRow(ownerId: string, station: Station): StationRow {
    return {
      id: station.id,
      owner_id: ownerId,
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

  private logToRow(ownerId: string, log: FuelLog): FuelLogRow {
    return {
      id: log.id,
      owner_id: ownerId,
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
