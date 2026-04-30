export type FuelType = "Gasolina comum" | "Gasolina aditivada" | "Etanol" | "Diesel";

export type User = {
  name: string;
};

export type Car = {
  id: string;
  plate: string;
  nickname: string;
  brand: string;
  model: string;
  year: string;
  acceptedFuel: FuelType[];
  defaultFuel: FuelType;
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
  demoDataLoaded?: boolean;
};

export type ThemeMode = "light" | "dark";

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
  bestStation?: StationRankingItem;
  stationRanking: StationRankingItem[];
  fuelAverages: FuelAverage[];
  monthlyTotals: MonthlyTotal[];
  potentialSavings: number;
  insight: string;
};

export const fuels: FuelType[] = ["Gasolina comum", "Gasolina aditivada", "Etanol", "Diesel"];

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

export class FuelLogFactory {
  static create(input: {
    carId: string;
    stationId: string;
    fuel: FuelType;
    paid: number;
    liters: number;
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
      createdAt: input.createdAt,
      latitude: input.latitude ?? log.latitude,
      longitude: input.longitude ?? log.longitude
    };
  }
}

export class CarFactory {
  static create(input: {
    plate: string;
    nickname: string;
    brand: string;
    model: string;
    year: string;
    acceptedFuel?: FuelType[];
    defaultFuel: FuelType;
  }): Car {
    const acceptedFuel = input.acceptedFuel?.length ? input.acceptedFuel : [input.defaultFuel];
    return {
      id: IdFactory.create("carro"),
      plate: BrazilianPlate.normalize(input.plate),
      nickname: input.nickname.trim(),
      brand: input.brand.trim(),
      model: input.model.trim(),
      year: input.year.trim(),
      acceptedFuel,
      defaultFuel: acceptedFuel.includes(input.defaultFuel) ? input.defaultFuel : acceptedFuel[0]
    };
  }

  static update(
    car: Car,
    input: {
      plate: string;
      nickname: string;
      brand: string;
      model: string;
      year: string;
      acceptedFuel: FuelType[];
      defaultFuel: FuelType;
    }
  ): Car {
    const acceptedFuel = input.acceptedFuel.length ? input.acceptedFuel : [input.defaultFuel];
    return {
      ...car,
      plate: BrazilianPlate.normalize(input.plate),
      nickname: input.nickname.trim(),
      brand: input.brand.trim(),
      model: input.model.trim(),
      year: input.year.trim(),
      acceptedFuel,
      defaultFuel: acceptedFuel.includes(input.defaultFuel) ? input.defaultFuel : acceptedFuel[0]
    };
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
}

export class DateInputParser {
  static toIso(value: string) {
    const trimmed = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return DateInputParser.safeIso(`${trimmed}T12:00:00`);
    }

    const match = trimmed.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
    if (!match) {
      return undefined;
    }

    return DateInputParser.safeIso(`${match[3]}-${match[2]}-${match[1]}T12:00:00`);
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
    const fuelLogs = this.state.logs.filter((log) => log.fuel === fuel);
    const average = fuelLogs.reduce((sum, log) => sum + log.pricePerLiter, 0) / Math.max(fuelLogs.length, 1);

    return { name: fuel, average, count: fuelLogs.length };
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
