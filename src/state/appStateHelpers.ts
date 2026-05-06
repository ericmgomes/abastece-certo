import { AppState, Car, FuelLog, FuelPrice, FuelType, Station, fuels } from "../domain";

const initialStations: Station[] = [
  {
    id: "posto-avenida",
    name: "Posto Avenida",
    address: "Av. Brasil, 1200",
    city: "São Paulo",
    state: "SP",
    latitude: -23.5614,
    longitude: -46.6559
  },
  {
    id: "auto-centro",
    name: "Auto Centro Sul",
    address: "Rua das Palmeiras, 88",
    city: "São Paulo",
    state: "SP",
    latitude: -23.5682,
    longitude: -46.6484
  },
  {
    id: "rede-economia",
    name: "Rede Economia",
    address: "Marginal Norte, 401",
    city: "São Paulo",
    state: "SP",
    latitude: -23.5559,
    longitude: -46.6411
  },
  {
    id: "posto-verde-norte",
    name: "Posto Verde Norte",
    address: "Rua Aurora, 55",
    city: "São Paulo",
    state: "SP",
    latitude: -23.5527,
    longitude: -46.6398
  }
];

const demoCars: Car[] = [
  {
    id: "demo-compass",
    vehicleType: "Carro",
    nickname: "Compass",
    brand: "Jeep",
    model: "Compass",
    initialOdometerKm: 39800,
    currentOdometerKm: 42080
  },
  {
    id: "demo-onix",
    vehicleType: "Carro",
    nickname: "Onix",
    brand: "Chevrolet",
    model: "Onix Plus",
    initialOdometerKm: 24400,
    currentOdometerKm: 26010
  },
  {
    id: "demo-hilux",
    vehicleType: "Caminhonete",
    nickname: "Hilux",
    brand: "Toyota",
    model: "Hilux",
    initialOdometerKm: 70400,
    currentOdometerKm: 72890
  }
];

const visibleFuels = fuels.filter((fuel) => fuel !== "Gás Natural" && fuel !== "Eletricidade");

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

function demoLog(input: {
  id: string;
  sequence: number;
  carId: string;
  stationId: string;
  fuel: FuelType;
  paid: number;
  liters: number;
  odometerKm: number;
  daysAgo: number;
}): FuelLog {
  return {
    id: input.id,
    sequence: input.sequence,
    carId: input.carId,
    stationId: input.stationId,
    fuel: input.fuel,
    paid: input.paid,
    liters: input.liters,
    pricePerLiter: new FuelPrice(input.paid, input.liters).valuePerLiter(),
    odometerKm: input.odometerKm,
    createdAt: daysAgo(input.daysAgo)
  };
}

const demoLogs: FuelLog[] = [
  demoLog({ id: "demo-log-1", sequence: 8, carId: "demo-compass", stationId: "auto-centro", fuel: "Gasolina comum", paid: 150, liters: 22, odometerKm: 42620, daysAgo: 1 }),
  demoLog({ id: "demo-log-2", sequence: 7, carId: "demo-onix", stationId: "rede-economia", fuel: "Etanol", paid: 126, liters: 31.5, odometerKm: 67880, daysAgo: 4 }),
  demoLog({ id: "demo-log-3", sequence: 6, carId: "demo-compass", stationId: "posto-avenida", fuel: "Gasolina aditivada", paid: 210, liters: 29.8, odometerKm: 42370, daysAgo: 8 }),
  demoLog({ id: "demo-log-4", sequence: 5, carId: "demo-hilux", stationId: "rede-economia", fuel: "Diesel", paid: 320, liters: 48.2, odometerKm: 91240, daysAgo: 12 }),
  demoLog({ id: "demo-log-5", sequence: 4, carId: "demo-onix", stationId: "auto-centro", fuel: "Etanol", paid: 118, liters: 30, odometerKm: 67550, daysAgo: 19 }),
  demoLog({ id: "demo-log-6", sequence: 3, carId: "demo-compass", stationId: "rede-economia", fuel: "Gasolina comum", paid: 180, liters: 27.6, odometerKm: 42080, daysAgo: 34 }),
  demoLog({ id: "demo-log-7", sequence: 2, carId: "demo-hilux", stationId: "posto-avenida", fuel: "Diesel", paid: 290, liters: 42.7, odometerKm: 90780, daysAgo: 42 }),
  demoLog({ id: "demo-log-8", sequence: 1, carId: "demo-onix", stationId: "posto-avenida", fuel: "Gasolina comum", paid: 160, liters: 24.5, odometerKm: 67290, daysAgo: 66 })
];

export const demoState: AppState = {
  user: { name: "Usuário Demo" },
  selectedCarId: "demo-compass",
  filteredCarIds: demoCars.map((car) => car.id),
  cars: demoCars,
  stations: initialStations,
  logs: demoLogs,
  themeMode: "light",
  themePalette: "green",
  demoDataLoaded: true
};

export function withDemoData(state: AppState): AppState {
  if (state.demoDataLoaded) {
    return {
      ...state,
      filteredCarIds: state.filteredCarIds?.length
        ? state.filteredCarIds
        : state.cars.map((car) => car.id)
    };
  }

  const existingCarIds = new Set(state.cars.map((car) => car.id));
  const existingStationIds = new Set(state.stations.map((station) => station.id));
  const existingLogIds = new Set(state.logs.map((log) => log.id));
  const cars = [...state.cars, ...demoCars.filter((car) => !existingCarIds.has(car.id))];
  const stations = [
    ...state.stations,
    ...initialStations.filter((station) => !existingStationIds.has(station.id))
  ];
  const logs = sortFuelLogs(withStableLogSequences([
    ...state.logs,
    ...demoLogs.filter((log) => !existingLogIds.has(log.id))
  ]));

  return {
    ...state,
    user: state.user ?? demoState.user,
    selectedCarId: state.selectedCarId ?? cars[0]?.id ?? null,
    filteredCarIds: state.filteredCarIds?.length
      ? Array.from(new Set([...state.filteredCarIds, ...demoCars.map((car) => car.id)]))
      : cars.map((car) => car.id),
    cars,
    stations,
    logs,
    demoDataLoaded: true
  };
}

export function sortFuelLogs(logs: FuelLog[]) {
  return [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function withStableLogSequences(logs: FuelLog[]) {
  let nextSequence = Math.max(0, ...logs.map((log) => log.sequence ?? 0)) + 1;
  return [...logs]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((log) => {
      if (log.sequence) {
        return log;
      }
      const sequenced = { ...log, sequence: nextSequence };
      nextSequence += 1;
      return sequenced;
    });
}

export function nextLogSequence(logs: FuelLog[]) {
  return Math.max(0, ...logs.map((log) => log.sequence ?? 0)) + 1;
}

export function validFilteredCarIds(cars: Car[], filteredCarIds?: string[]) {
  const carIds = cars.map((car) => car.id);
  const validIds = (filteredCarIds ?? []).filter((id) => carIds.includes(id));
  if (validIds.length === 0) {
    return carIds;
  }

  return validIds;
}

export function validSelectedCarId(cars: Car[], selectedCarId: string | null | undefined) {
  if (selectedCarId && cars.some((car) => car.id === selectedCarId)) {
    return selectedCarId;
  }

  return cars[0]?.id ?? null;
}

export const starterState: AppState = {
  user: null,
  selectedCarId: null,
  filteredCarIds: [],
  cars: [],
  stations: initialStations,
  logs: [],
  themeMode: "light",
  themePalette: "green",
  demoDataLoaded: false
};
