import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  AppState,
  Car,
  CarFactory,
  DashboardCalculator,
  DashboardMetrics,
  DateInputParser,
  DateFormatter,
  FuelLog,
  FuelLogFactory,
  FuelPrice,
  FuelType,
  MoneyParser,
  Station,
  StationRankingItem,
  StationSuggestionService,
  ThemeMode,
  User,
  fuels
} from "./src/domain";

type Tab = "Resumo" | "Abastecimentos";
const storageKey = "abastece-certo:v1";

const initialStations: Station[] = [
  {
    id: "posto-avenida",
    name: "Posto Avenida",
    address: "Av. Brasil, 1200",
    latitude: -23.5614,
    longitude: -46.6559
  },
  {
    id: "auto-centro",
    name: "Auto Centro Sul",
    address: "Rua das Palmeiras, 88",
    latitude: -23.5682,
    longitude: -46.6484
  },
  {
    id: "rede-economia",
    name: "Rede Economia",
    address: "Marginal Norte, 401",
    latitude: -23.5559,
    longitude: -46.6411
  },
  {
    id: "posto-verde-norte",
    name: "Posto Verde Norte",
    address: "Rua Aurora, 55",
    latitude: -23.5527,
    longitude: -46.6398
  }
];

const fakeCurrentLocation = {
  latitude: -23.5529,
  longitude: -46.6397
};

const demoCars: Car[] = [
  {
    id: "demo-compass",
    plate: "BRA2E19",
    nickname: "Compass",
    brand: "Jeep",
    model: "Compass",
    year: "2022",
    acceptedFuel: fuels,
    defaultFuel: "Gasolina comum"
  },
  {
    id: "demo-onix",
    plate: "QWE8R44",
    nickname: "Onix",
    brand: "Chevrolet",
    model: "Onix Plus",
    year: "2020",
    acceptedFuel: fuels,
    defaultFuel: "Etanol"
  },
  {
    id: "demo-hilux",
    plate: "HIL7X10",
    nickname: "Hilux",
    brand: "Toyota",
    model: "Hilux",
    year: "2021",
    acceptedFuel: ["Diesel"],
    defaultFuel: "Diesel"
  }
];

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

function demoLog(input: {
  id: string;
  carId: string;
  stationId: string;
  fuel: FuelType;
  paid: number;
  liters: number;
  daysAgo: number;
}): FuelLog {
  return {
    id: input.id,
    carId: input.carId,
    stationId: input.stationId,
    fuel: input.fuel,
    paid: input.paid,
    liters: input.liters,
    pricePerLiter: new FuelPrice(input.paid, input.liters).valuePerLiter(),
    createdAt: daysAgo(input.daysAgo)
  };
}

const demoLogs: FuelLog[] = [
  demoLog({ id: "demo-log-1", carId: "demo-compass", stationId: "auto-centro", fuel: "Gasolina comum", paid: 150, liters: 22, daysAgo: 1 }),
  demoLog({ id: "demo-log-2", carId: "demo-onix", stationId: "rede-economia", fuel: "Etanol", paid: 126, liters: 31.5, daysAgo: 4 }),
  demoLog({ id: "demo-log-3", carId: "demo-compass", stationId: "posto-avenida", fuel: "Gasolina aditivada", paid: 210, liters: 29.8, daysAgo: 8 }),
  demoLog({ id: "demo-log-4", carId: "demo-hilux", stationId: "rede-economia", fuel: "Diesel", paid: 320, liters: 48.2, daysAgo: 12 }),
  demoLog({ id: "demo-log-5", carId: "demo-onix", stationId: "auto-centro", fuel: "Etanol", paid: 118, liters: 30, daysAgo: 19 }),
  demoLog({ id: "demo-log-6", carId: "demo-compass", stationId: "rede-economia", fuel: "Gasolina comum", paid: 180, liters: 27.6, daysAgo: 34 }),
  demoLog({ id: "demo-log-7", carId: "demo-hilux", stationId: "posto-avenida", fuel: "Diesel", paid: 290, liters: 42.7, daysAgo: 42 }),
  demoLog({ id: "demo-log-8", carId: "demo-onix", stationId: "posto-avenida", fuel: "Gasolina comum", paid: 160, liters: 24.5, daysAgo: 66 })
];

const demoState: AppState = {
  user: { name: "Eric Gomes" },
  selectedCarId: "demo-compass",
  filteredCarIds: demoCars.map((car) => car.id),
  cars: demoCars,
  stations: initialStations,
  logs: demoLogs,
  themeMode: "light",
  demoDataLoaded: true
};

function withDemoData(state: AppState): AppState {
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
  const logs = sortFuelLogs([
    ...state.logs,
    ...demoLogs.filter((log) => !existingLogIds.has(log.id))
  ]);

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

function sortFuelLogs(logs: FuelLog[]) {
  return [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function isHovered(state: unknown) {
  const maybeState = state as { hovered?: boolean; pressed?: boolean };
  return Boolean(maybeState.hovered || maybeState.pressed);
}

const starterState: AppState = {
  user: null,
  selectedCarId: null,
  filteredCarIds: [],
  cars: [],
  stations: initialStations,
  logs: [],
  themeMode: "light",
  demoDataLoaded: false
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

type Theme = ReturnType<typeof buildTheme>;
type ThemeContextValue = {
  mode: ThemeMode;
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function useThemeStyles() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("ThemeContext indisponivel");
  }

  return value;
}

function buildTheme(mode: ThemeMode) {
  if (mode === "dark") {
    return {
      mode,
      background: "#071B16",
      surface: "#102A23",
      surfaceAlt: "#16382F",
      border: "#285244",
      text: "#F2FFF9",
      muted: "#A9C6BA",
      primary: "#1FA463",
      primaryDark: "#0E6F46",
      primarySoft: "#1A4436",
      accent: "#7DDC9D",
      input: "#0B211B",
      map: "#14382E"
    };
  }

  return {
    mode,
    background: "#EEF7F0",
    surface: "#FFFFFF",
    surfaceAlt: "#F2FAF4",
    border: "#CFE4D5",
    text: "#102018",
    muted: "#627568",
    primary: "#178A4A",
    primaryDark: "#0D5F36",
    primarySoft: "#DDF3E5",
    accent: "#2DBE71",
    input: "#FFFFFF",
    map: "#D7EDDE"
  };
}

export default function App() {
  const [state, setState] = useState<AppState>(starterState);
  const [tab, setTab] = useState<Tab>("Resumo");
  const [fuelFormMode, setFuelFormMode] = useState<"closed" | "new" | "edit">("closed");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [showCarsPanel, setShowCarsPanel] = useState(false);
  const [ready, setReady] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const scrollRef = useRef<ScrollView>(null);
  const themeMode = state.themeMode ?? "light";
  const theme = useMemo(() => buildTheme(themeMode), [themeMode]);
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!value) {
          setState(withDemoData(starterState));
          return;
        }

        const saved = { ...starterState, ...JSON.parse(value) } as AppState;
        setState(withDemoData(saved));
      })
      .catch(() => Alert.alert("Ops", "Não foi possível carregar os dados salvos."))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) {
      AsyncStorage.setItem(storageKey, JSON.stringify(state)).catch(() => undefined);
    }
  }, [ready, state]);

  const selectedCar = state.cars.find((car) => car.id === state.selectedCarId) ?? state.cars[0];
  const activeCarIds = state.filteredCarIds?.length
    ? state.filteredCarIds
    : state.cars.map((car) => car.id);
  const filteredLogs = state.logs.filter((log) => activeCarIds.includes(log.carId));
  const filteredState = useMemo(
    () => ({ ...state, logs: filteredLogs }),
    [state, filteredLogs]
  );

  const metrics = useMemo(
    () => new DashboardCalculator(filteredState, visibleMonth).calculate(),
    [filteredState, visibleMonth]
  );

  function updateState(next: Partial<AppState>) {
    setState((current) => ({ ...current, ...next }));
  }

  function moveMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function toggleTheme() {
    updateState({ themeMode: themeMode === "light" ? "dark" : "light" });
  }

  function toggleFilterCar(carId: string) {
    const next = activeCarIds.includes(carId)
      ? activeCarIds.filter((id) => id !== carId)
      : [...activeCarIds, carId];

    updateState({ filteredCarIds: next });
  }

  function openNewFuelForm() {
    setEditingLogId(null);
    setFuelFormMode("new");
    setShowCarsPanel(false);
    setTab("Resumo");
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 0);
  }

  function openEditFuelForm(logId: string) {
    setEditingLogId(logId);
    setFuelFormMode("edit");
    setShowCarsPanel(false);
    setTab("Abastecimentos");
  }

  function closeFuelForm() {
    setEditingLogId(null);
    setFuelFormMode("closed");
  }

  function changeTab(nextTab: Tab) {
    closeFuelForm();
    setShowCarsPanel(false);
    setTab(nextTab);
  }

  function openCars() {
    closeFuelForm();
    setShowCarsPanel(true);
  }

  if (!ready) {
    return (
      <SafeAreaProvider>
        <ThemeContext.Provider value={{ mode: themeMode, theme, styles }}>
          <SafeAreaView style={styles.loading}>
            <Text style={styles.brand}>Abastece Certo</Text>
            <Text style={styles.muted}>Carregando seu histórico...</Text>
          </SafeAreaView>
        </ThemeContext.Provider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={{ mode: themeMode, theme, styles }}>
        <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
        <SafeAreaView style={styles.shell}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboard}
          >
            <Header
              user={state.user}
              onSave={(user) => updateState({ user })}
              onToggleTheme={toggleTheme}
              onNewFuel={openNewFuelForm}
              onOpenCars={openCars}
            />
            {state.user && state.cars.length > 0 ? (
              <CarFilter
                cars={state.cars}
                activeCarIds={activeCarIds}
                onToggleCar={toggleFilterCar}
              />
            ) : null}
            <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {showCarsPanel ? (
                <Cars
                  cars={state.cars}
                  selectedCarId={state.selectedCarId}
                  onSelect={(selectedCarId) => updateState({ selectedCarId })}
                  onSave={(car) =>
                    setState((current) => ({
                      ...current,
                      cars: [...current.cars, car],
                      selectedCarId: current.selectedCarId ?? car.id,
                      filteredCarIds: [...(current.filteredCarIds ?? []), car.id]
                    }))
                  }
                  onUpdate={(car) =>
                    setState((current) => ({
                      ...current,
                      cars: current.cars.map((item) => (item.id === car.id ? car : item)),
                      selectedCarId: car.id
                    }))
                  }
                />
              ) : fuelFormMode === "new" ? (
                <RegisterFuel
                  cars={state.cars}
                  selectedCar={selectedCar}
                  editingLog={undefined}
                  stations={state.stations}
                  onCancel={closeFuelForm}
                  onCarSelect={(selectedCarId) => updateState({ selectedCarId })}
                  onSave={(log) =>
                    setState((current) => ({
                      ...current,
                      logs: sortFuelLogs([log, ...current.logs]),
                      selectedCarId: log.carId,
                      filteredCarIds: current.filteredCarIds?.includes(log.carId)
                        ? current.filteredCarIds
                        : [...(current.filteredCarIds ?? []), log.carId]
                    }))
                  }
                  onUpdate={(log) =>
                    setState((current) => ({
                      ...current,
                      logs: sortFuelLogs(current.logs.map((item) => (item.id === log.id ? log : item))),
                      selectedCarId: log.carId,
                      filteredCarIds: current.filteredCarIds?.includes(log.carId)
                        ? current.filteredCarIds
                        : [...(current.filteredCarIds ?? []), log.carId]
                    }))
                  }
                />
              ) : null}
              {!showCarsPanel && tab === "Resumo" && (
                <Home
                  logs={filteredLogs}
                  cars={state.cars}
                  stations={state.stations}
                  metrics={metrics}
                  visibleMonth={visibleMonth}
                  onPreviousMonth={() => moveMonth(-1)}
                  onNextMonth={() => moveMonth(1)}
                />
              )}
              {!showCarsPanel && tab === "Abastecimentos" && (
                <StationMap
                  logs={filteredLogs}
                  cars={state.cars}
                  stations={state.stations}
                  metrics={metrics}
                  editingLogId={editingLogId}
                  onEdit={openEditFuelForm}
                  onCancelEdit={closeFuelForm}
                  onCarSelect={(selectedCarId) => updateState({ selectedCarId })}
                  onSave={(log) =>
                    setState((current) => ({
                      ...current,
                      logs: sortFuelLogs([log, ...current.logs]),
                      selectedCarId: log.carId,
                      filteredCarIds: current.filteredCarIds?.includes(log.carId)
                        ? current.filteredCarIds
                        : [...(current.filteredCarIds ?? []), log.carId]
                    }))
                  }
                  onUpdate={(log) =>
                    setState((current) => ({
                      ...current,
                      logs: sortFuelLogs(current.logs.map((item) => (item.id === log.id ? log : item))),
                      selectedCarId: log.carId,
                      filteredCarIds: current.filteredCarIds?.includes(log.carId)
                        ? current.filteredCarIds
                        : [...(current.filteredCarIds ?? []), log.carId]
                    }))
                  }
                />
              )}
            </ScrollView>
            <Tabs active={tab} onChange={changeTab} />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}

function Header({
  user,
  onSave,
  onToggleTheme,
  onNewFuel,
  onOpenCars
}: {
  user: User | null;
  onSave: (user: User) => void;
  onToggleTheme: () => void;
  onNewFuel: () => void;
  onOpenCars: () => void;
}) {
  const [name, setName] = useState("");
  const { mode, styles, theme } = useThemeStyles();

  if (user) {
    return (
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.brand}>Abastece Certo</Text>
          </View>
          <View style={styles.headerSecondaryActions}>
            <Pressable style={styles.headerSecondaryButton} onPress={onOpenCars}>
              <Text style={styles.headerSecondaryButtonText}>Carros</Text>
          </Pressable>
          <Pressable style={styles.themeButton} onPress={onToggleTheme}>
            <Text style={styles.themeButtonText}>{mode === "light" ? "☾" : "☼"}</Text>
          </Pressable>
          </View>
        </View>
        <Pressable style={styles.headerPrimaryButton} onPress={onNewFuel}>
          <Text style={styles.headerPrimaryButtonText}>Novo abastecimento</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.onboarding}>
      <Text style={styles.brand}>Abastece Certo</Text>
      <Text style={styles.title}>Controle inteligente de abastecimento</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Seu nome"
        placeholderTextColor={theme.muted}
        style={styles.input}
      />
      <Pressable
        style={styles.primaryButton}
        onPress={() => name.trim() && onSave({ name: name.trim() })}
      >
        <Text style={styles.primaryButtonText}>Começar</Text>
      </Pressable>
    </View>
  );
}

function CarFilter({
  cars,
  activeCarIds,
  onToggleCar
}: {
  cars: Car[];
  activeCarIds: string[];
  onToggleCar: (carId: string) => void;
}) {
  const { styles } = useThemeStyles();

  return (
    <View style={styles.filterBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {cars.map((car) => {
          const active = activeCarIds.includes(car.id);
          return (
            <Pressable
              key={car.id}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => onToggleCar(car.id)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{car.nickname}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Home({
  logs,
  cars,
  stations,
  metrics,
  visibleMonth,
  onPreviousMonth,
  onNextMonth
}: {
  logs: FuelLog[];
  cars: Car[];
  stations: Station[];
  metrics: DashboardMetrics;
  visibleMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}) {
  const { styles } = useThemeStyles();
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const last = logs[0];
  const lastStation = stations.find((station) => station.id === last?.stationId);
  const lastCar = cars.find((car) => car.id === last?.carId);
  const monthLabel = visibleMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <View style={styles.stack}>
      <View style={styles.monthSwitcher}>
        <Pressable style={styles.iconButton} onPress={onPreviousMonth}>
          <Text style={styles.iconButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{monthLabel}</Text>
        <Pressable style={styles.iconButton} onPress={onNextMonth}>
          <Text style={styles.iconButtonText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <MetricCard label="Gasto do mês" value={currency.format(metrics.monthTotal)} />
        <MetricCard label="Último abastecimento" value={last ? `${currency.format(last.pricePerLiter)}/L` : "Sem dados"} />
      </View>

      <Section title="Gasto mensal">
        <Bars data={metrics.monthlyTotals} />
      </Section>

      <Section title="Melhor posto recente">
        <View style={styles.detailBlock}>
          <Text style={styles.bigValue}>{metrics.bestStation?.name ?? "Sem dados"}</Text>
          <Text style={styles.muted}>
            {metrics.bestStation
              ? `${currency.format(metrics.bestStation.average)}/L em média`
              : "Registre abastecimentos para montar seu ranking."}
          </Text>
        </View>
      </Section>

      <Section title="Média por combustível">
        {metrics.fuelAverages.length === 0 ? (
          <Empty text="Registre abastecimentos para comparar combustíveis." />
        ) : (
          <View style={styles.fuelGrid}>
            {metrics.fuelAverages.map((fuel) => (
              <Pressable key={fuel.name} style={(state) => [styles.fuelCard, isHovered(state) && styles.listItemHover]}>
                <Text style={styles.itemTitle}>{fuel.name}</Text>
                <Text style={styles.itemTitle}>{currency.format(fuel.average)}/L</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Section>

      <Section title="Ranking de postos">
        <Ranking
          rows={metrics.stationRanking.slice(0, 4)}
          selectedStationId={selectedStationId}
          logs={logs}
          cars={cars}
          stations={stations}
          onSelectStation={(stationId) =>
            setSelectedStationId((current) => (current === stationId ? null : stationId))
          }
        />
      </Section>

    </View>
  );
}

function RegisterFuel({
  cars,
  selectedCar,
  editingLog,
  stations,
  onCarSelect,
  onSave,
  onUpdate,
  onCancel
}: {
  cars: Car[];
  selectedCar?: Car;
  editingLog?: FuelLog;
  stations: Station[];
  onCarSelect: (id: string) => void;
  onSave: (log: FuelLog) => void;
  onUpdate: (log: FuelLog) => void;
  onCancel: () => void;
}) {
  const { styles } = useThemeStyles();
  const [carId, setCarId] = useState(selectedCar?.id ?? "");
  const [fuel, setFuel] = useState<FuelType>(selectedCar?.defaultFuel ?? "Gasolina comum");
  const [paid, setPaid] = useState("");
  const [liters, setLiters] = useState("");
  const [date, setDate] = useState(DateFormatter.inputDate(new Date().toISOString()));
  const [stationId, setStationId] = useState(stations[0]?.id ?? "");
  const [location, setLocation] = useState(fakeCurrentLocation);
  const [draftLog, setDraftLog] = useState<FuelLog | null>(null);
  const [saveStatus, setSaveStatus] = useState("Preencha valor e litros para salvar automaticamente.");
  const currentCar = cars.find((car) => car.id === carId) ?? selectedCar;

  useEffect(() => {
    if (!selectedCar || editingLog) {
      return;
    }

    setCarId(selectedCar.id);
    setFuel(selectedCar.defaultFuel);
  }, [editingLog, selectedCar?.id]);

  useEffect(() => {
    if (!editingLog) {
      setDate(DateFormatter.inputDate(new Date().toISOString()));
      return;
    }

    setCarId(editingLog.carId);
    setFuel(editingLog.fuel);
    setPaid(String(editingLog.paid).replace(".", ","));
    setLiters(String(editingLog.liters).replace(".", ","));
    setDate(DateFormatter.inputDate(editingLog.createdAt));
    setStationId(editingLog.stationId);
    setDraftLog(null);
    setSaveStatus("Alterações salvas automaticamente.");
  }, [editingLog?.id]);

  useEffect(() => {
    if (editingLog) {
      return;
    }

    const nearest = new StationSuggestionService(stations).nearest(
      fakeCurrentLocation.latitude,
      fakeCurrentLocation.longitude
    );

    if (!nearest) {
      return;
    }

    setStationId(nearest.id);
    setLocation(fakeCurrentLocation);
  }, [editingLog, stations]);

  const parsedPaid = MoneyParser.toNumber(paid);
  const parsedLiters = MoneyParser.toNumber(liters);
  const price = new FuelPrice(parsedPaid, parsedLiters).valuePerLiter();

  function buildPayload() {
    if (!currentCar) {
      setSaveStatus("Cadastre um carro antes de registrar abastecimentos.");
      return undefined;
    }

    const paidNumber = MoneyParser.toNumber(paid);
    const litersNumber = MoneyParser.toNumber(liters);
    const fuelPrice = new FuelPrice(paidNumber, litersNumber);

    if (!fuelPrice.isValid()) {
      setSaveStatus("Preencha valor e litros para salvar automaticamente.");
      return undefined;
    }

    const createdAt = DateInputParser.toIso(date);
    if (!createdAt) {
      setSaveStatus("Data inválida. Use AAAA-MM-DD ou DD/MM/AAAA.");
      return undefined;
    }

    return {
      carId: currentCar.id,
      stationId,
      fuel,
      paid: paidNumber,
      liters: litersNumber,
      createdAt,
      latitude: location.latitude,
      longitude: location.longitude
    };
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      const payload = buildPayload();
      if (!payload) {
        return;
      }

      if (editingLog) {
        onUpdate(FuelLogFactory.update(editingLog, payload));
        setSaveStatus("Alterações salvas automaticamente.");
        return;
      }

      if (draftLog) {
        const updatedDraft = FuelLogFactory.update(draftLog, payload);
        setDraftLog(updatedDraft);
        onUpdate(updatedDraft);
        setSaveStatus("Abastecimento salvo automaticamente.");
        return;
      }

      const newLog = FuelLogFactory.create(payload);
      setDraftLog(newLog);
      onSave(newLog);
      setSaveStatus("Abastecimento salvo automaticamente.");
    }, 450);

    return () => clearTimeout(timeout);
  }, [carId, fuel, paid, liters, date, stationId, location.latitude, location.longitude, editingLog?.id, draftLog?.id]);

  return (
    <View style={styles.stack}>
      <Section
        title={editingLog ? "Editar abastecimento" : "Registro rápido"}
        rightAction={
          <Pressable style={styles.closeButton} onPress={onCancel}>
            <Text style={styles.closeButtonText}>×</Text>
          </Pressable>
        }
      >
        {cars.length === 0 ? (
          <Empty text="Cadastre um carro pelo botão Carros no topo para liberar o registro." />
        ) : (
          <>
            <Text style={styles.label}>Carro</Text>
            <Wrap>
              {cars.map((car) => (
                <Choice
                  key={car.id}
                  label={`${car.nickname} - ${car.plate}`}
                  active={car.id === currentCar?.id}
                  onPress={() => {
                    setCarId(car.id);
                    onCarSelect(car.id);
                  }}
                />
              ))}
            </Wrap>

            <Text style={styles.label}>Combustível</Text>
            <Wrap>
              {fuels.map((item) => (
                <Choice key={item} label={item} active={item === fuel} onPress={() => setFuel(item)} />
              ))}
            </Wrap>

            <View style={styles.row}>
              <Field label="Valor pago" value={paid} onChangeText={setPaid} keyboardType="decimal-pad" />
              <Field label="Litros" value={liters} onChangeText={setLiters} keyboardType="decimal-pad" />
            </View>

            <Field
              label="Data do abastecimento"
              value={date}
              onChangeText={setDate}
              placeholder="AAAA-MM-DD"
            />

            <Text style={styles.label}>Posto detectado automaticamente</Text>
            <Wrap>
              {stations.map((station) => (
                <Choice
                  key={station.id}
                  label={station.name}
                  active={station.id === stationId}
                  onPress={() => setStationId(station.id)}
                />
              ))}
            </Wrap>
            <Text style={styles.muted}>Localização fake de teste: posto mais próximo selecionado pelo app.</Text>

            <Text style={styles.autosaveText}>{saveStatus}</Text>

            <View style={styles.result}>
              <Text style={styles.label}>Preço real por litro</Text>
              <Text style={styles.bigValue}>{Number.isFinite(price) ? currency.format(price) : "R$ 0,00"}</Text>
            </View>
          </>
        )}
      </Section>
    </View>
  );
}

function StationMap({
  logs,
  cars,
  stations,
  metrics,
  editingLogId,
  onEdit,
  onCancelEdit,
  onCarSelect,
  onSave,
  onUpdate
}: {
  logs: FuelLog[];
  cars: Car[];
  stations: Station[];
  metrics: DashboardMetrics;
  editingLogId: string | null;
  onEdit: (logId: string) => void;
  onCancelEdit: () => void;
  onCarSelect: (id: string) => void;
  onSave: (log: FuelLog) => void;
  onUpdate: (log: FuelLog) => void;
}) {
  const { styles } = useThemeStyles();
  const logNumbers = new Map(
    [...logs]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((log, index) => [log.id, index + 1])
  );
  const numberedLogs = logs.map((log) => ({ log, number: logNumbers.get(log.id) ?? 0 }));

  return (
    <View style={styles.stack}>
      <Section title="Abastecimentos">
        <View style={styles.mapPanel}>
          {numberedLogs.length === 0 ? (
            <Text style={styles.muted}>Os abastecimentos aparecerão aqui.</Text>
          ) : (
            numberedLogs.map(({ log, number }, index) => (
              <View
                key={log.id}
                style={[
                  styles.mapPin,
                  { left: `${18 + (index * 29) % 62}%`, top: `${20 + (index * 23) % 55}%` }
                ]}
              >
                <Text style={styles.pinText}>{number}</Text>
              </View>
            ))
          )}
        </View>
      </Section>

      <Section title="Lista de abastecimentos">
        {numberedLogs.length === 0 ? (
          <Empty text="Registre abastecimentos para construir sua lista." />
        ) : (
          numberedLogs.map(({ log, number }) => {
            const station = stations.find((item) => item.id === log.stationId);
            const car = cars.find((item) => item.id === log.carId);
            return (
              <View key={log.id} style={styles.inlineEditGroup}>
                <Pressable
                  style={(state) => [styles.listItem, isHovered(state) && styles.listItemHover]}
                  onPress={() => onEdit(log.id)}
                >
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberBadgeText}>{number}</Text>
                  </View>
                  <View style={styles.logInfo}>
                    <Text style={styles.itemTitle}>{DateFormatter.compact(log.createdAt)}</Text>
                    <Text style={styles.muted}>
                      {station?.name ?? "Posto"} - {car?.nickname ?? "Carro"} - {log.fuel}
                    </Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.itemTitle}>{currency.format(log.pricePerLiter)}/L</Text>
                    <Text style={styles.muted}>
                      {currency.format(log.paid)} - {log.liters.toFixed(2)} L
                    </Text>
                  </View>
                </Pressable>
                {editingLogId === log.id ? (
                  <View style={styles.inlineForm}>
                    <RegisterFuel
                      cars={cars}
                      selectedCar={car}
                      editingLog={log}
                      stations={stations}
                      onCancel={onCancelEdit}
                      onCarSelect={onCarSelect}
                      onSave={onSave}
                      onUpdate={onUpdate}
                    />
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </Section>
    </View>
  );
}

function Cars({
  cars,
  selectedCarId,
  onSelect,
  onSave,
  onUpdate
}: {
  cars: Car[];
  selectedCarId: string | null;
  onSelect: (id: string) => void;
  onSave: (car: Car) => void;
  onUpdate: (car: Car) => void;
}) {
  const { styles } = useThemeStyles();
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [plate, setPlate] = useState("");
  const [nickname, setNickname] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [defaultFuel, setDefaultFuel] = useState<FuelType>("Gasolina comum");
  const editingCar = cars.find((car) => car.id === editingCarId);

  function openNewForm() {
    setEditingCarId("new");
    setPlate("");
    setNickname("");
    setBrand("");
    setModel("");
    setYear("");
    setDefaultFuel("Gasolina comum");
  }

  function openEditForm(car: Car) {
    if (editingCarId === car.id) {
      closeForm();
      return;
    }

    onSelect(car.id);
    setEditingCarId(car.id);
    setPlate(car.plate);
    setNickname(car.nickname);
    setBrand(car.brand);
    setModel(car.model);
    setYear(car.year);
    setDefaultFuel(car.defaultFuel);
  }

  function closeForm() {
    setEditingCarId(null);
  }

  function save() {
    if (!plate.trim() || !nickname.trim()) {
      Alert.alert("Dados do carro", "Informe placa e apelido do carro.");
      return;
    }

    if (editingCar && editingCarId !== "new") {
      onUpdate(CarFactory.update(editingCar, { plate, nickname, brand, model, year, defaultFuel }));
      closeForm();
      return;
    }

    onSave(CarFactory.create({ plate, nickname, brand, model, year, defaultFuel }));

    setPlate("");
    setNickname("");
    setBrand("");
    setModel("");
    setYear("");
    closeForm();
  }

  return (
    <View style={styles.stack}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Meus carros</Text>
        <Pressable style={styles.addButton} onPress={openNewForm}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>
      <Section title="">
        {cars.length === 0 ? (
          <Empty text="Cadastre seu primeiro carro pela placa." />
        ) : (
          cars.map((car) => (
            <Pressable
              key={car.id}
              style={(state) => [
                styles.listItem,
                car.id === selectedCarId && styles.selectedItem,
                isHovered(state) && styles.listItemHover
              ]}
              onPress={() => openEditForm(car)}
            >
              <View>
                <Text style={styles.itemTitle}>{car.nickname}</Text>
                <Text style={styles.muted}>
                  {car.plate} - {car.brand} {car.model} {car.year}
                </Text>
              </View>
              <Text style={styles.pill}>{car.defaultFuel}</Text>
            </Pressable>
          ))
        )}
      </Section>

      {editingCarId ? (
        <Section title={editingCarId === "new" ? "Adicionar carro" : "Editar carro"}>
          <Field label="Placa" value={plate} onChangeText={setPlate} autoCapitalize="characters" />
          <Field label="Apelido" value={nickname} onChangeText={setNickname} />
          <View style={styles.row}>
            <Field label="Marca" value={brand} onChangeText={setBrand} />
            <Field label="Modelo" value={model} onChangeText={setModel} />
          </View>
          <Field label="Ano" value={year} onChangeText={setYear} keyboardType="number-pad" />
          <Text style={styles.label}>Combustível padrão</Text>
          <Wrap>
            {fuels.map((fuel) => (
              <Choice key={fuel} label={fuel} active={fuel === defaultFuel} onPress={() => setDefaultFuel(fuel)} />
            ))}
          </Wrap>
          <View style={styles.row}>
            <Pressable style={styles.secondaryButton} onPress={closeForm}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={save}>
              <Text style={styles.primaryButtonText}>Salvar</Text>
            </Pressable>
          </View>
        </Section>
      ) : null}
    </View>
  );
}

function Tabs({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const { styles } = useThemeStyles();
  const tabs: Tab[] = ["Resumo", "Abastecimentos"];
  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => (
        <Pressable key={tab} style={[styles.tab, active === tab && styles.activeTab]} onPress={() => onChange(tab)}>
          <Text style={[styles.tabText, active === tab && styles.activeTabText]}>{tab}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Section({
  title,
  children,
  rightAction
}: {
  title: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
}) {
  const { styles } = useThemeStyles();

  return (
    <View style={styles.section}>
      {title || rightAction ? (
        <View style={styles.sectionTitleRow}>
          {title ? <Text style={styles.sectionTitle}>{title}</Text> : <View />}
          {rightAction}
        </View>
      ) : null}
      {children}
    </View>
  );
}

function MetricCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  const { styles } = useThemeStyles();

  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, small && styles.metricValueSmall]}>{value}</Text>
    </View>
  );
}

function Ranking({
  rows,
  selectedStationId,
  logs,
  cars,
  stations,
  onSelectStation
}: {
  rows: StationRankingItem[];
  selectedStationId?: string | null;
  logs: FuelLog[];
  cars: Car[];
  stations: Station[];
  onSelectStation?: (stationId: string) => void;
}) {
  const { styles } = useThemeStyles();

  if (rows.length === 0) {
    return <Empty text="O ranking nasce a partir do histórico de abastecimentos." />;
  }

  return (
    <>
      {rows.map((row, index) => (
        <React.Fragment key={row.id}>
          <Pressable
            style={(state) => [
              styles.listItem,
              selectedStationId === row.id && styles.selectedItem,
              isHovered(state) && styles.listItemHover
            ]}
            onPress={() => onSelectStation?.(row.id)}
          >
            <View style={styles.rankingInfo}>
              <Text style={styles.itemTitle}>
                {index + 1}. {row.name}
              </Text>
              <Text style={styles.muted}>{row.count} abastecimentos</Text>
            </View>
            <Text style={styles.rankingPrice}>{currency.format(row.average)}/L</Text>
          </Pressable>
          {selectedStationId === row.id ? (
            <StationDetails stationId={row.id} logs={logs} cars={cars} stations={stations} />
          ) : null}
        </React.Fragment>
      ))}
    </>
  );
}

function StationDetails({
  stationId,
  logs,
  cars,
  stations
}: {
  stationId: string;
  logs: FuelLog[];
  cars: Car[];
  stations: Station[];
}) {
  const { styles } = useThemeStyles();
  const station = stations.find((item) => item.id === stationId);
  const stationLogs = logs.filter((log) => log.stationId === stationId);

  if (!station) {
    return null;
  }

  return (
    <View style={styles.stationDetails}>
      <Text style={styles.itemTitle}>Detalhes: {station.name}</Text>
      {stationLogs.map((log) => {
        const car = cars.find((item) => item.id === log.carId);
        return (
          <Pressable key={log.id} style={(state) => [styles.detailRow, isHovered(state) && styles.listItemHover]}>
            <View>
              <Text style={styles.itemTitle}>{DateFormatter.compact(log.createdAt)}</Text>
              <Text style={styles.muted}>{car?.nickname ?? "Carro"} - {log.fuel}</Text>
            </View>
            <Text style={styles.itemTitle}>{currency.format(log.pricePerLiter)}/L</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Bars({ data }: { data: { label: string; value: number }[] }) {
  const { styles } = useThemeStyles();
  const max = Math.max(...data.map((item) => item.value), 1);
  if (data.length === 0) {
    return <Empty text="Ainda não há gastos mensais para exibir." />;
  }

  return (
    <View style={styles.bars}>
      {data.map((item) => (
        <View style={styles.barColumn} key={item.label}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { height: `${Math.max(10, (item.value / max) * 100)}%` }]} />
          </View>
          <Text style={styles.barLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { styles, theme } = useThemeStyles();
  const { label, style, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={theme.muted} style={[styles.input, style]} {...inputProps} />
    </View>
  );
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { styles } = useThemeStyles();

  return (
    <Pressable style={[styles.choice, active && styles.choiceActive]} onPress={onPress}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  const { styles } = useThemeStyles();

  return <View style={styles.wrap}>{children}</View>;
}

function Empty({ text }: { text: string }) {
  const { styles } = useThemeStyles();

  return <Text style={styles.empty}>{text}</Text>;
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: theme.background
  },
  keyboard: {
    flex: 1
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.background
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 10
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  headerSecondaryActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8
  },
  headerPrimaryButton: {
    width: "100%",
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  headerPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900"
  },
  headerSecondaryButton: {
    minHeight: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9
  },
  headerSecondaryButtonText: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    alignItems: "center"
  },
  filterScroll: {
    gap: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    flexGrow: 1
  },
  filterChip: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  filterChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  filterChipText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "800"
  },
  filterChipTextActive: {
    color: "#FFFFFF"
  },
  onboarding: {
    padding: 20,
    gap: 12,
    backgroundColor: theme.background
  },
  brand: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.text
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text
  },
  signal: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.primary
  },
  themeButton: {
    width: 34,
    minHeight: 30,
    borderRadius: 8,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0
  },
  themeButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 18,
    lineHeight: 22
  },
  content: {
    padding: 16,
    paddingBottom: 104
  },
  stack: {
    gap: 14
  },
  section: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.border
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: theme.text
  },
  sectionTitleRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.primarySoft
  },
  closeButtonText: {
    color: theme.primary,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "900"
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "800"
  },
  cta: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: theme.primary,
    justifyContent: "center",
    alignItems: "center"
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800"
  },
  grid: {
    flexDirection: "row",
    gap: 12
  },
  monthSwitcher: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10
  },
  monthTitle: {
    flex: 1,
    textAlign: "center",
    color: theme.text,
    fontSize: 16,
    fontWeight: "900",
    textTransform: "capitalize"
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.primarySoft
  },
  iconButtonText: {
    color: theme.primary,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "900"
  },
  metricCard: {
    flex: 1,
    minHeight: 104,
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 14,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: theme.border
  },
  metricLabel: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  metricValue: {
    color: theme.text,
    fontSize: 23,
    fontWeight: "900"
  },
  metricValueSmall: {
    fontSize: 18
  },
  bigValue: {
    color: theme.text,
    fontSize: 32,
    fontWeight: "900"
  },
  detailBlock: {
    gap: 4
  },
  muted: {
    color: theme.muted,
    fontSize: 13
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.input,
    color: theme.text,
    fontSize: 16
  },
  label: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "800"
  },
  field: {
    flex: 1,
    gap: 6
  },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end"
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  choice: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: theme.surface
  },
  choiceActive: {
    backgroundColor: theme.primaryDark,
    borderColor: theme.primaryDark
  },
  choiceText: {
    color: theme.text,
    fontWeight: "700",
    fontSize: 13
  },
  choiceTextActive: {
    color: "#FFFFFF"
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  secondaryButtonText: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: "800"
  },
  ghostButton: {
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  ghostButtonText: {
    color: theme.muted,
    fontSize: 14,
    fontWeight: "900"
  },
  result: {
    backgroundColor: theme.primarySoft,
    borderRadius: 8,
    padding: 12
  },
  autosaveText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  listItem: {
    minHeight: 68,
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  logInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  inlineEditGroup: {
    gap: 8
  },
  inlineForm: {
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.primary
  },
  listItemHover: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft
  },
  fuelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  fuelCard: {
    width: "48%",
    minHeight: 72,
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: "space-between",
    gap: 8
  },
  selectedItem: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft
  },
  historyItem: {
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 10
  },
  stationDetails: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 12
  },
  detailRow: {
    minHeight: 58,
    borderRadius: 8,
    padding: 10,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  historyTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  historyTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  historyPrice: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "900",
    flexShrink: 0
  },
  historyMeta: {
    paddingLeft: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  numberBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  numberBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  itemTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "800"
  },
  rankingInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  rankingPrice: {
    width: 108,
    textAlign: "right",
    color: theme.text,
    fontSize: 15,
    fontWeight: "900",
    flexShrink: 0
  },
  right: {
    alignItems: "flex-end",
    flexShrink: 0
  },
  pill: {
    maxWidth: 112,
    color: theme.primary,
    fontWeight: "800",
    fontSize: 12
  },
  empty: {
    color: theme.muted,
    lineHeight: 20
  },
  bars: {
    height: 170,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end"
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: 8
  },
  barTrack: {
    width: "100%",
    height: 128,
    backgroundColor: theme.primarySoft,
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  barFill: {
    backgroundColor: theme.primary,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8
  },
  barLabel: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: "700"
  },
  mapPanel: {
    height: 260,
    borderRadius: 8,
    backgroundColor: theme.map,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
    position: "relative"
  },
  mapPin: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF"
  },
  pinText: {
    color: "#FFFFFF",
    fontWeight: "900"
  },
  insight: {
    color: theme.text,
    lineHeight: 22,
    fontSize: 15,
    fontWeight: "600"
  },
  tabs: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 72,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    flexDirection: "row",
    gap: 5
  },
  tab: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2
  },
  activeTab: {
    backgroundColor: theme.primary
  },
  tabText: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: "800"
  },
  activeTabText: {
    color: "#FFFFFF"
  }
  });
}
