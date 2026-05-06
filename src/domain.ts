export type FuelType =
  | "Gasolina comum"
  | "Gasolina aditivada"
  | "Etanol"
  | "Diesel"
  | "Gás Natural"
  | "Eletricidade";
export type VehicleType = "Carro" | "Moto" | "Caminhonete" | "Caminhão" | "Van";

export type User = {
  name: string;
  email?: string;
};

export type Car = {
  id: string;
  vehicleType: VehicleType;
  nickname: string;
  brand: string;
  model: string;
  initialOdometerKm?: number;
  currentOdometerKm?: number;
};

export type Station = {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  latitude: number;
  longitude: number;
};

export type FuelLog = {
  id: string;
  sequence?: number;
  carId: string;
  stationId: string;
  fuel: FuelType;
  paid: number;
  liters: number;
  pricePerLiter: number;
  odometerKm?: number;
  createdAt: string;
  latitude?: number;
  longitude?: number;
};

export type AppState = {
  user: User | null;
  cars: Car[];
  selectedCarId: string | null;
  filteredCarIds?: string[];
  stations: Station[];
  logs: FuelLog[];
  themeMode?: ThemeMode;
  themePalette?: ThemePalette;
  demoDataLoaded?: boolean;
};

export type ThemeMode = "light" | "dark";
export type ThemePalette = "green" | "pink" | "blue" | "orange";

export type UserSummary = {
  ownerId: string;
  name: string;
  email: string;
  vehicles: number;
  stations: number;
  fuelLogs: number;
  updatedAt: string;
};

export type StationRankingItem = Station & {
  average: number;
  count: number;
  lastPrice: number;
};

export type FuelAverage = {
  name: FuelType;
  average: number;
  count: number;
};

export type MonthlyTotal = {
  label: string;
  value: number;
};

export type DashboardMetrics = {
  monthTotal: number;
  averageKmPerLiter?: number;
  bestStation?: StationRankingItem;
  stationRanking: StationRankingItem[];
  fuelAverages: FuelAverage[];
  monthlyTotals: MonthlyTotal[];
  potentialSavings: number;
  insight: string;
};

export const fuels: FuelType[] = [
  "Gasolina comum",
  "Gasolina aditivada",
  "Etanol",
  "Diesel",
  "Gás Natural",
  "Eletricidade"
];
export const vehicleTypes: VehicleType[] = ["Carro", "Moto", "Caminhonete", "Caminhão", "Van"];

export class IdFactory {
  static create(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export class MoneyParser {
  static toNumber(value: string) {
    return Number(value.replace(",", "."));
  }
}

export class BrazilianPlate {
  static normalize(value: string) {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7);
    if (/^[A-Z]{3}\d{4}$/.test(cleaned)) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    }

    return cleaned;
  }

  static isValid(value: string) {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (/^[A-Z]{3}\d{4}$/.test(cleaned)) {
      return true;
    }

    return /^[A-Z]{3}\d[A-Z]\d{2}$/.test(cleaned);
  }
}

export class FuelPrice {
  constructor(
    private readonly paid: number,
    private readonly liters: number
  ) {}

  valuePerLiter() {
    if (!this.paid || !this.liters) {
      return 0;
    }

    return this.paid / this.liters;
  }

  isValid() {
    if (!Number.isFinite(this.paid) || this.paid <= 0) {
      return false;
    }

    if (!Number.isFinite(this.liters) || this.liters <= 0) {
      return false;
    }

    return true;
  }
}

export class FuelEfficiencyCalculator {
  static calculate(logs: FuelLog[], cars: Car[] = []) {
    return logs
      .filter((log) => typeof log.odometerKm === "number" && Number.isFinite(log.odometerKm))
      .sort((a, b) => {
        const dateDifference = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (dateDifference !== 0) {
          return dateDifference;
        }

        return (a.sequence ?? 0) - (b.sequence ?? 0);
      })
      .reduce<Array<{ logId: string; kmPerLiter: number; distanceKm: number }>>((entries, log, index, sortedLogs) => {
        const car = cars.find((item) => item.id === log.carId);
        const previous = [...sortedLogs]
          .slice(0, index)
          .reverse()
          .find((item) => item.carId === log.carId && typeof item.odometerKm === "number");
        const previousOdometerKm = previous?.odometerKm ?? car?.initialOdometerKm;

        if (typeof previousOdometerKm !== "number" || !Number.isFinite(previousOdometerKm) || !log.odometerKm) {
          return entries;
        }

        const distanceKm = log.odometerKm - previousOdometerKm;
        if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
          return entries;
        }

        if (!Number.isFinite(log.liters) || log.liters <= 0) {
          return entries;
        }

        return [...entries, { logId: log.id, kmPerLiter: distanceKm / log.liters, distanceKm }];
      }, []);
  }

  static valueForLog(log: FuelLog, logs: FuelLog[], cars: Car[] = []) {
    return FuelEfficiencyCalculator.calculate(logs, cars).find((entry) => entry.logId === log.id);
  }
}

export class FuelLogFactory {
  static create(input: {
    carId: string;
    stationId: string;
    fuel: FuelType;
    paid: number;
    liters: number;
    odometerKm?: number;
    createdAt?: string;
    latitude?: number;
    longitude?: number;
  }): FuelLog {
    const price = new FuelPrice(input.paid, input.liters);

    return {
      id: IdFactory.create("abastecimento"),
      carId: input.carId,
      stationId: input.stationId,
      fuel: input.fuel,
      paid: input.paid,
      liters: input.liters,
      pricePerLiter: price.valuePerLiter(),
      odometerKm: input.odometerKm,
      createdAt: input.createdAt ?? new Date().toISOString(),
      latitude: input.latitude,
      longitude: input.longitude
    };
  }

  static update(
    log: FuelLog,
    input: {
      carId: string;
      stationId: string;
      fuel: FuelType;
      paid: number;
      liters: number;
      odometerKm?: number;
      createdAt: string;
      latitude?: number;
      longitude?: number;
    }
  ): FuelLog {
    const price = new FuelPrice(input.paid, input.liters);

    return {
      ...log,
      carId: input.carId,
      stationId: input.stationId,
      fuel: input.fuel,
      paid: input.paid,
      liters: input.liters,
      pricePerLiter: price.valuePerLiter(),
      odometerKm: input.odometerKm,
      createdAt: input.createdAt,
      latitude: input.latitude ?? log.latitude,
      longitude: input.longitude ?? log.longitude
    };
  }
}

export class CarFactory {
  static create(input: {
    vehicleType?: VehicleType;
    nickname?: string;
    brand: string;
    model: string;
    initialOdometerKm?: number;
    currentOdometerKm?: number;
  }): Car {
    const brand = input.brand.trim();
    const model = input.model.trim();
    return {
      id: IdFactory.create("carro"),
      vehicleType: input.vehicleType ?? "Carro",
      nickname: (input.nickname ?? VehicleName.base(brand, model)).trim(),
      brand,
      model,
      initialOdometerKm: input.initialOdometerKm,
      currentOdometerKm: input.currentOdometerKm
    };
  }

  static update(
    car: Car,
    input: {
      vehicleType: VehicleType;
      nickname?: string;
      brand: string;
      model: string;
      initialOdometerKm?: number;
      currentOdometerKm?: number;
    }
  ): Car {
    const brand = input.brand.trim();
    const model = input.model.trim();
    return {
      ...car,
      vehicleType: input.vehicleType,
      nickname: (input.nickname ?? VehicleName.base(brand, model)).trim(),
      brand,
      model,
      initialOdometerKm: input.initialOdometerKm,
      currentOdometerKm: input.currentOdometerKm
    };
  }
}

export class VehicleName {
  static base(brand: string, model: string) {
    return [brand.trim(), model.trim()].filter(Boolean).join(" ").trim() || "Veículo";
  }

  static unique(brand: string, model: string, cars: Car[], currentId?: string) {
    const base = VehicleName.base(brand, model);
    const used = new Set(
      cars
        .filter((car) => car.id !== currentId)
        .map((car) => car.nickname.trim().toLowerCase())
    );

    if (!used.has(base.toLowerCase())) {
      return base;
    }

    let suffix = 2;
    while (used.has(`${base} ${suffix}`.toLowerCase())) {
      suffix += 1;
    }

    return `${base} ${suffix}`;
  }
}

export class StationFactory {
  static createManual(input: { name: string; city?: string; state?: string; latitude?: number; longitude?: number }): Station {
    return {
      id: IdFactory.create("posto"),
      name: input.name.trim(),
      address: "Cadastrado manualmente",
      city: input.city?.trim(),
      state: input.state?.trim().toUpperCase(),
      latitude: input.latitude ?? -23.5614,
      longitude: input.longitude ?? -46.6559
    };
  }
}

export class GeoPoint {
  constructor(
    private readonly latitude: number,
    private readonly longitude: number
  ) {}

  distanceTo(station: Station) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earth = 6371;
    const dLat = toRad(station.latitude - this.latitude);
    const dLng = toRad(station.longitude - this.longitude);
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(this.latitude)) *
        Math.cos(toRad(station.latitude)) *
        Math.sin(dLng / 2) ** 2;

    return earth * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
}

export class StationSuggestionService {
  constructor(private readonly stations: Station[]) {}

  nearest(latitude: number, longitude: number) {
    if (this.stations.length === 0) {
      return undefined;
    }

    const origin = new GeoPoint(latitude, longitude);

    return [...this.stations].sort((a, b) => origin.distanceTo(a) - origin.distanceTo(b))[0];
  }
}

export class DateFormatter {
  static compact(date: string) {
    return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  static monthKey(date: string) {
    return new Date(date).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  }

  static inputDate(date: string) {
    const parsed = new Date(date);
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    return `${day}-${month}-${parsed.getFullYear()}`;
  }

  static inputTime(date: string) {
    const parsed = new Date(date);
    const hour = String(parsed.getHours()).padStart(2, "0");
    const minute = String(parsed.getMinutes()).padStart(2, "0");
    const second = String(parsed.getSeconds()).padStart(2, "0");
    return `${hour}:${minute}:${second}`;
  }
}

export class DateInputParser {
  static toIso(value: string, time = "12:00:00") {
    const trimmed = value.trim();
    const normalizedTime = DateInputParser.normalizedTime(time);

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return DateInputParser.safeIso(`${trimmed}T${normalizedTime}`);
    }

    const match = trimmed.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
    if (!match) {
      return undefined;
    }

    return DateInputParser.safeIso(`${match[3]}-${match[2]}-${match[1]}T${normalizedTime}`);
  }

  private static normalizedTime(value: string) {
    const match = value.trim().match(/^(\d{1,2}):?(\d{2})(?::?(\d{2}))?$/);
    if (!match) {
      return "12:00:00";
    }

    const hour = Math.min(23, Math.max(0, Number(match[1])));
    const minute = Math.min(59, Math.max(0, Number(match[2])));
    const second = Math.min(59, Math.max(0, Number(match[3] ?? 0)));
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
  }

  private static safeIso(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return date.toISOString();
  }
}

export class DashboardCalculator {
  constructor(
    private readonly state: AppState,
    private readonly referenceDate = new Date()
  ) {}

  calculate(): DashboardMetrics {
    const stationRanking = this.stationRanking();
    const bestStation = stationRanking[0];

    return {
      monthTotal: this.monthTotal(),
      averageKmPerLiter: this.averageKmPerLiter(),
      bestStation,
      stationRanking,
      fuelAverages: this.fuelAverages(),
      monthlyTotals: this.monthlyTotals(),
      potentialSavings: this.potentialSavings(bestStation),
      insight: this.insight(bestStation)
    };
  }

  private monthTotal() {
    return this.logsThisMonth().reduce((sum, log) => sum + log.paid, 0);
  }

  private logsThisMonth() {
    return this.state.logs.filter((log) => {
      const date = new Date(log.createdAt);
      return (
        date.getMonth() === this.referenceDate.getMonth() &&
        date.getFullYear() === this.referenceDate.getFullYear()
      );
    });
  }

  private stationRanking(): StationRankingItem[] {
    return this.state.stations
      .map((station) => this.stationRankingItem(station))
      .filter((station) => station.count > 0)
      .sort((a, b) => a.average - b.average);
  }

  private stationRankingItem(station: Station): StationRankingItem {
    const stationLogs = this.state.logs.filter((log) => log.stationId === station.id);
    const average =
      stationLogs.reduce((sum, log) => sum + log.pricePerLiter, 0) / Math.max(stationLogs.length, 1);
    const last = stationLogs[0];

    return { ...station, average, count: stationLogs.length, lastPrice: last?.pricePerLiter ?? 0 };
  }

  private fuelAverages(): FuelAverage[] {
    return fuels
      .map((fuel) => this.fuelAverage(fuel))
      .filter((fuel) => fuel.count > 0);
  }

  private fuelAverage(fuel: FuelType): FuelAverage {
    const fuelLogs = this.logsThisMonth().filter((log) => log.fuel === fuel);
    const average = fuelLogs.reduce((sum, log) => sum + log.pricePerLiter, 0) / Math.max(fuelLogs.length, 1);

    return { name: fuel, average, count: fuelLogs.length };
  }

  private averageKmPerLiter() {
    const entries = FuelEfficiencyCalculator.calculate(this.state.logs, this.state.cars);
    const monthlyEntries = entries.filter((entry) => {
      const log = this.state.logs.find((item) => item.id === entry.logId);
      return log ? this.isReferenceMonth(log.createdAt) : false;
    });

    if (monthlyEntries.length === 0) {
      return undefined;
    }

    return monthlyEntries.reduce((sum, entry) => sum + entry.kmPerLiter, 0) / monthlyEntries.length;
  }

  private isReferenceMonth(value: string) {
    const date = new Date(value);
    return (
      date.getMonth() === this.referenceDate.getMonth() &&
      date.getFullYear() === this.referenceDate.getFullYear()
    );
  }

  private monthlyTotals(): MonthlyTotal[] {
    const monthlyMap = this.state.logs.reduce<Record<string, { label: string; value: number; date: Date }>>((acc, log) => {
      const date = new Date(log.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      acc[key] = acc[key] ?? {
        label: DateFormatter.monthKey(log.createdAt),
        value: 0,
        date: new Date(date.getFullYear(), date.getMonth(), 1)
      };
      acc[key].value += log.paid;
      return acc;
    }, {});

    Array.from({ length: 3 }, (_item, index) =>
      new Date(this.referenceDate.getFullYear(), this.referenceDate.getMonth() - (2 - index), 1)
    ).forEach((date) => {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthlyMap[key] = monthlyMap[key] ?? {
          label: date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
          value: 0,
          date: new Date(date.getFullYear(), date.getMonth(), 1)
        };
      });

    return Object.values(monthlyMap)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-6)
      .map(({ label, value }) => ({ label, value }));
  }

  private potentialSavings(bestStation?: StationRankingItem) {
    if (!bestStation) {
      return 0;
    }

    const averagePaid =
      this.state.logs.reduce((sum, log) => sum + log.pricePerLiter, 0) / Math.max(this.state.logs.length, 1);
    const totalLiters = this.logsThisMonth().reduce((sum, log) => sum + log.liters, 0);

    return Math.max(0, (averagePaid - bestStation.average) * totalLiters);
  }

  private insight(bestStation?: StationRankingItem) {
    const commonGasCount = this.state.logs.filter((log) => log.fuel === "Gasolina comum").length;
    const additiveCount = this.state.logs.filter((log) => log.fuel === "Gasolina aditivada").length;

    if (commonGasCount >= 3 && additiveCount === 0) {
      return "Você abasteceu várias vezes com gasolina comum. Pode valer conferir no manual se faz sentido usar aditivada de vez em quando.";
    }

    if (bestStation) {
      return `${bestStation.name} está com a melhor média do seu histórico pessoal.`;
    }

    return "Seu ranking pessoal será calculado a partir dos seus abastecimentos.";
  }
}
