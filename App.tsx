import AsyncStorage from "@react-native-async-storage/async-storage";
import L from "leaflet";
import { StatusBar } from "expo-status-bar";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
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
  BrazilianPlate,
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
import { SupabaseAppRepository } from "./src/repositories/SupabaseAppRepository";
import { supabase } from "./src/supabaseClient";

type Tab = "Resumo" | "Abastecimentos" | "Postos" | "Carros";
const storageKey = "litro-certo:v1";
const appRepository = new SupabaseAppRepository();

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

const fakeCurrentLocation = {
  latitude: -23.5529,
  longitude: -46.6397
};

async function geocodeStationAddress(address: string, city: string, stateName: string) {
  const addressParts = [address, city, stateName].map((part) => part.trim()).filter(Boolean);
  if (addressParts.length === 0) {
    return null;
  }

  try {
    const query = [...addressParts, "Brasil"].join(", ");
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
    if (!response.ok) {
      return null;
    }

    const [result] = await response.json() as Array<{ lat?: string; lon?: string }>;
    const latitude = Number(result?.lat);
    const longitude = Number(result?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return { latitude, longitude };
  } catch {
    return null;
  }
}

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
  sequence: number;
  carId: string;
  stationId: string;
  fuel: FuelType;
  paid: number;
  liters: number;
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
    createdAt: daysAgo(input.daysAgo)
  };
}

const demoLogs: FuelLog[] = [
  demoLog({ id: "demo-log-1", sequence: 8, carId: "demo-compass", stationId: "auto-centro", fuel: "Gasolina comum", paid: 150, liters: 22, daysAgo: 1 }),
  demoLog({ id: "demo-log-2", sequence: 7, carId: "demo-onix", stationId: "rede-economia", fuel: "Etanol", paid: 126, liters: 31.5, daysAgo: 4 }),
  demoLog({ id: "demo-log-3", sequence: 6, carId: "demo-compass", stationId: "posto-avenida", fuel: "Gasolina aditivada", paid: 210, liters: 29.8, daysAgo: 8 }),
  demoLog({ id: "demo-log-4", sequence: 5, carId: "demo-hilux", stationId: "rede-economia", fuel: "Diesel", paid: 320, liters: 48.2, daysAgo: 12 }),
  demoLog({ id: "demo-log-5", sequence: 4, carId: "demo-onix", stationId: "auto-centro", fuel: "Etanol", paid: 118, liters: 30, daysAgo: 19 }),
  demoLog({ id: "demo-log-6", sequence: 3, carId: "demo-compass", stationId: "rede-economia", fuel: "Gasolina comum", paid: 180, liters: 27.6, daysAgo: 34 }),
  demoLog({ id: "demo-log-7", sequence: 2, carId: "demo-hilux", stationId: "posto-avenida", fuel: "Diesel", paid: 290, liters: 42.7, daysAgo: 42 }),
  demoLog({ id: "demo-log-8", sequence: 1, carId: "demo-onix", stationId: "posto-avenida", fuel: "Gasolina comum", paid: 160, liters: 24.5, daysAgo: 66 })
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

function sortFuelLogs(logs: FuelLog[]) {
  return [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function withStableLogSequences(logs: FuelLog[]) {
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

function nextLogSequence(logs: FuelLog[]) {
  return Math.max(0, ...logs.map((log) => log.sequence ?? 0)) + 1;
}

function logNumberMap(logs: FuelLog[]) {
  return new Map(logs.map((log) => [log.id, log.sequence ?? 0]));
}

function isHovered(state: unknown) {
  const maybeState = state as { hovered?: boolean; pressed?: boolean };
  return Boolean(maybeState.hovered || maybeState.pressed);
}

function getAuthUserName(metadata: Record<string, unknown> | null | undefined) {
  const possibleName = metadata?.full_name ?? metadata?.name;
  if (typeof possibleName !== "string") {
    return null;
  }

  const trimmedName = possibleName.trim();
  return trimmedName || null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function authErrorMessage(message: string) {
  if (message === "Invalid login credentials") {
    return "Senha errada ou usuário não existe.";
  }

  return message;
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
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authName, setAuthName] = useState<string | null>(null);
  const [authScreenOpen, setAuthScreenOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("Resumo");
  const [fuelFormMode, setFuelFormMode] = useState<"closed" | "new" | "edit">("closed");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const scrollRef = useRef<ScrollView>(null);
  const themeMode = state.themeMode ?? "light";
  const theme = useMemo(() => buildTheme(themeMode), [themeMode]);
  const styles = useMemo(() => createStyles(theme), [theme]);

  function emptyAuthenticatedState(name: string | null, email: string | null): AppState {
    return {
      ...starterState,
      user: { name: name ?? email?.split("@")[0] ?? "Usuário" },
      stations: [],
      themeMode
    };
  }

  function loadDemoState() {
    setState(withDemoData(starterState));
  }

  async function loadStateForOwner(loadedOwnerId: string, name: string | null, email: string | null) {
    const fallbackState = emptyAuthenticatedState(name, email);

    try {
      const remoteState = await appRepository.load(loadedOwnerId);
      if (remoteState) {
        const mergedRemoteState = { ...starterState, ...remoteState } as AppState;
        setState({
          ...mergedRemoteState,
          user: mergedRemoteState.user ?? fallbackState.user,
          stations: mergedRemoteState.stations ?? [],
          logs: sortFuelLogs(withStableLogSequences(mergedRemoteState.logs))
        });
        return;
      }
    } catch {
      // The SQL schema or RLS policies may still be pending. The logged account starts empty.
    }

    setState(fallbackState);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user;

        if (!sessionUser) {
          setOwnerId(null);
          setAuthEmail(null);
          setAuthName(null);
          loadDemoState();
          return;
        }

        const sessionEmail = sessionUser.email ?? null;
        const sessionName = getAuthUserName(sessionUser.user_metadata);
        setAuthEmail(sessionEmail);
        setAuthName(sessionName);
        await loadStateForOwner(sessionUser.id, sessionName, sessionEmail);
        setOwnerId(sessionUser.id);
        setAuthScreenOpen(false);
      } catch {
        if (!cancelled) {
          Alert.alert("Ops", "Não foi possível carregar sua sessão.");
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      if (!sessionUser) {
        setOwnerId(null);
        setAuthEmail(null);
        setAuthName(null);
        loadDemoState();
        return;
      }

      const sessionEmail = sessionUser.email ?? null;
      const sessionName = getAuthUserName(sessionUser.user_metadata);
      setAuthEmail(sessionEmail);
      setAuthName(sessionName);
      loadStateForOwner(sessionUser.id, sessionName, sessionEmail)
        .then(() => {
          setOwnerId(sessionUser.id);
          setAuthScreenOpen(false);
        })
        .catch(() => undefined);
    });

    loadSession();
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      AsyncStorage.setItem(storageKey, JSON.stringify(state)).catch(() => undefined);

      if (!ownerId) {
        return;
      }

      appRepository.save(ownerId, state).catch(() => undefined);
    }, 650);

    return () => clearTimeout(timeout);
  }, [ownerId, ready, state]);

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

  async function signOut() {
    await supabase.auth.signOut();
    setOwnerId(null);
    setAuthEmail(null);
    setAuthName(null);
    loadDemoState();
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
    setTab("Resumo");
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 0);
  }

  function openEditFuelForm(logId: string) {
    setEditingLogId(logId);
    setFuelFormMode("edit");
    setTab("Abastecimentos");
  }

  function closeFuelForm() {
    setEditingLogId(null);
    setFuelFormMode("closed");
  }

  function changeTab(nextTab: Tab) {
    closeFuelForm();
    setTab(nextTab);
  }

  if (!ready) {
    return (
      <SafeAreaProvider>
        <ThemeContext.Provider value={{ mode: themeMode, theme, styles }}>
          <SafeAreaView style={styles.loading}>
            <Text style={styles.brand}>Litro Certo</Text>
            <Text style={styles.muted}>Carregando seu histórico...</Text>
          </SafeAreaView>
        </ThemeContext.Provider>
      </SafeAreaProvider>
    );
  }

  if (authScreenOpen) {
    return (
      <SafeAreaProvider>
        <ThemeContext.Provider value={{ mode: themeMode, theme, styles }}>
          <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
          <SafeAreaView style={styles.shell}>
            <AuthScreen onToggleTheme={toggleTheme} onCancel={() => setAuthScreenOpen(false)} />
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
              onOpenAuth={() => setAuthScreenOpen(true)}
              onSignOut={signOut}
              authEmail={authEmail}
              authName={authName}
            />
            {!ownerId ? (
              <DemoBanner onOpenAuth={() => setAuthScreenOpen(true)} />
            ) : null}
            {state.user && state.cars.length > 1 && tab !== "Carros" && fuelFormMode !== "new" ? (
              <CarFilter
                cars={state.cars}
                activeCarIds={activeCarIds}
                onToggleCar={toggleFilterCar}
              />
            ) : null}
            <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {fuelFormMode === "new" ? (
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
                      logs: sortFuelLogs([{ ...log, sequence: nextLogSequence(current.logs) }, ...current.logs]),
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
              ) : tab === "Carros" ? (
                <Cars
                  cars={state.cars}
                  logs={state.logs}
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
                  onDeleteCar={(carId) =>
                    setState((current) => {
                      const cars = current.cars.filter((car) => car.id !== carId);
                      const logs = current.logs.filter((log) => log.carId !== carId);
                      const filteredCarIds = (current.filteredCarIds ?? []).filter((id) => id !== carId);
                      return {
                        ...current,
                        cars,
                        logs,
                        filteredCarIds,
                        selectedCarId: current.selectedCarId === carId ? cars[0]?.id ?? null : current.selectedCarId
                      };
                    })
                  }
                />
              ) : tab === "Postos" ? (
                <Stations
                  stations={state.stations}
                  logs={filteredLogs}
                  allLogs={state.logs}
                  cars={state.cars}
                  metrics={metrics}
                  onEditLog={openEditFuelForm}
                  onSave={(station) =>
                    setState((current) => ({
                      ...current,
                      stations: [...current.stations, station]
                    }))
                  }
                  onUpdate={(station) =>
                    setState((current) => ({
                      ...current,
                      stations: current.stations.map((item) => (item.id === station.id ? station : item))
                    }))
                  }
                  onDeleteStation={(stationId) =>
                    setState((current) => ({
                      ...current,
                      stations: current.stations.filter((station) => station.id !== stationId),
                      logs: current.logs.filter((log) => log.stationId !== stationId)
                    }))
                  }
                />
              ) : null}
              {fuelFormMode === "closed" && tab === "Resumo" && (
                <Home
                  logs={filteredLogs}
                  cars={state.cars}
                  stations={state.stations}
                  metrics={metrics}
                  visibleMonth={visibleMonth}
                  onPreviousMonth={() => moveMonth(-1)}
                  onNextMonth={() => moveMonth(1)}
                  onEditLog={openEditFuelForm}
                />
              )}
              {fuelFormMode !== "new" && tab === "Abastecimentos" && (
                <StationMap
                  logs={filteredLogs}
                  cars={state.cars}
                  stations={state.stations}
                  editingLogId={editingLogId}
                  allLogs={state.logs}
                  onEdit={openEditFuelForm}
                  onCancelEdit={closeFuelForm}
                  onCarSelect={(selectedCarId) => updateState({ selectedCarId })}
                  onSave={(log) =>
                    setState((current) => ({
                      ...current,
                      logs: sortFuelLogs([{ ...log, sequence: nextLogSequence(current.logs) }, ...current.logs]),
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

function AuthScreen({ onToggleTheme, onCancel }: { onToggleTheme: () => void; onCancel: () => void }) {
  const { mode, styles, theme } = useThemeStyles();
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSignIn = authMode === "signIn";

  function authRedirectUrl() {
    const location = (globalThis as unknown as { location?: { origin?: string } }).location;
    return location?.origin ?? "http://localhost:8086";
  }

  async function submit(mode: "signIn" | "signUp") {
    setFormError(null);
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setFormError("Informe um email válido para continuar.");
      return;
    }

    if (!password) {
      setFormError("Informe sua senha para continuar.");
      return;
    }

    if (password.length < 6) {
      setFormError("Use uma senha com pelo menos 6 caracteres.");
      return;
    }

    if (mode === "signUp" && password !== passwordConfirmation) {
      setFormError("A confirmação de senha precisa ser igual à senha.");
      return;
    }

    setLoading(true);
    const credentials = { email: trimmedEmail, password };
    const result = mode === "signIn"
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp(credentials);
    setLoading(false);

    if (result.error) {
      setFormError(authErrorMessage(result.error.message));
      return;
    }

    if (mode === "signUp" && !result.data.session) {
      Alert.alert("Conta criada", "Confira seu email para confirmar a conta antes de fazer login.");
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    const result = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authRedirectUrl()
      }
    });
    setLoading(false);

    if (result.error) {
      Alert.alert("Ops", result.error.message);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.authScreen}
    >
      <View style={styles.authTop}>
        <Text style={styles.brand}>Litro Certo</Text>
        <View style={styles.headerSecondaryActions}>
          <Pressable style={styles.headerSecondaryButton} onPress={onCancel}>
            <Text style={styles.headerSecondaryButtonText}>Agora não</Text>
          </Pressable>
          <Pressable style={styles.themeButton} onPress={onToggleTheme}>
            <Text style={styles.themeButtonText}>{mode === "light" ? "☾" : "☼"}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.authCard}>
        <Text style={styles.title}>Entre para manter seus abastecimentos salvos</Text>
        <Text style={styles.muted}>Use email e senha ou continue com Google.</Text>
        <View style={styles.authTabs}>
          <Pressable
            style={[styles.authTab, isSignIn && styles.authTabActive]}
            onPress={() => setAuthMode("signIn")}
          >
            <Text style={[styles.authTabText, isSignIn && styles.authTabTextActive]}>Login</Text>
          </Pressable>
          <Pressable
            style={[styles.authTab, !isSignIn && styles.authTabActive]}
            onPress={() => setAuthMode("signUp")}
          >
            <Text style={[styles.authTabText, !isSignIn && styles.authTabTextActive]}>Criar conta</Text>
          </Pressable>
        </View>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={theme.muted}
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
          secureTextEntry
          placeholderTextColor={theme.muted}
          style={styles.input}
        />
        {!isSignIn ? (
          <TextInput
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            placeholder="Confirmar senha"
            secureTextEntry
            placeholderTextColor={theme.muted}
            style={styles.input}
          />
        ) : null}
        {formError ? (
          <View style={styles.formErrorBox}>
            <Text style={styles.formErrorText}>{formError}</Text>
          </View>
        ) : null}
        <Pressable style={[styles.primaryButton, styles.authButton]} onPress={() => submit(authMode)} disabled={loading}>
          <Text style={styles.primaryButtonText}>
            {loading ? "Aguarde..." : isSignIn ? "Login" : "Criar conta"}
          </Text>
        </Pressable>
        <View style={styles.authDivider}>
          <View style={styles.authDividerLine} />
          <Text style={styles.authDividerText}>ou</Text>
          <View style={styles.authDividerLine} />
        </View>
        <Pressable style={[styles.googleButton, styles.authButton]} onPress={signInWithGoogle} disabled={loading}>
          <Text style={styles.googleButtonText}>
            {isSignIn ? "Login com Google" : "Criar conta com Google"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Header({
  user,
  onSave,
  onToggleTheme,
  onNewFuel,
  onOpenAuth,
  onSignOut,
  authEmail,
  authName
}: {
  user: User | null;
  onSave: (user: User) => void;
  onToggleTheme: () => void;
  onNewFuel: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  authEmail: string | null;
  authName: string | null;
}) {
  const [name, setName] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const { mode, styles, theme } = useThemeStyles();

  if (user) {
    return (
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.brand}>Litro Certo</Text>
          </View>
          <View style={styles.headerSecondaryActions}>
            <View style={styles.accountBox}>
              <Pressable style={styles.accountButton} onPress={() => setAccountOpen((current) => !current)}>
                <View style={styles.accountIcon}>
                  <View style={styles.accountIconHead} />
                  <View style={styles.accountIconBody} />
                </View>
              </Pressable>
              {accountOpen ? (
                <View style={styles.accountMenu}>
                  {authEmail ? (
                    <>
                      {authName ? <Text style={styles.accountName}>{authName}</Text> : null}
                      <Text style={styles.accountEmail}>{authEmail}</Text>
                    </>
                  ) : (
                    <Text style={styles.accountEmail}>Faça login para salvar seus dados.</Text>
                  )}
                  {authEmail ? (
                    <Pressable
                      style={styles.accountMenuItem}
                      onPress={() => {
                        setAccountOpen(false);
                        onSignOut();
                      }}
                    >
                      <Text style={styles.accountMenuText}>Sair</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.accountMenuItem}
                      onPress={() => {
                        setAccountOpen(false);
                        onOpenAuth();
                      }}
                    >
                      <Text style={styles.accountMenuText}>Login / criar conta</Text>
                    </Pressable>
                  )}
                </View>
              ) : null}
            </View>
            <Pressable style={styles.themeButton} onPress={onToggleTheme}>
              <Text style={styles.themeButtonText}>{mode === "light" ? "☾" : "☼"}</Text>
            </Pressable>
          </View>
      </View>
      <Pressable style={styles.headerPrimaryButton} onPress={onNewFuel}>
        <View style={styles.headerPrimaryButtonCircle}>
          <Text style={styles.headerPrimaryButtonPlus}>+</Text>
          <Text style={styles.headerPrimaryButtonText}>Abastecer</Text>
        </View>
      </Pressable>
    </View>
  );
}

  return (
    <View style={styles.onboarding}>
      <Text style={styles.brand}>Litro Certo</Text>
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

function DemoBanner({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { styles } = useThemeStyles();

  return (
    <View style={styles.demoBanner}>
      <View style={styles.demoBannerTextGroup}>
        <Text style={styles.demoBannerTitle}>Dados de exemplo</Text>
        <Text style={styles.demoBannerText}>Entre para começar com seus próprios abastecimentos.</Text>
      </View>
      <Pressable style={styles.demoBannerButton} onPress={onOpenAuth}>
        <Text style={styles.demoBannerButtonText}>Login</Text>
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
  onNextMonth,
  onEditLog
}: {
  logs: FuelLog[];
  cars: Car[];
  stations: Station[];
  metrics: DashboardMetrics;
  visibleMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onEditLog: (logId: string) => void;
}) {
  const { styles } = useThemeStyles();
  const last = logs[0];
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
      setSaveStatus("Data inválida. Use DD-MM-AAAA.");
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
        title={editingLog ? "Editar abastecimento" : ""}
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
            <View style={styles.inlineField}>
              <Text style={styles.inlineLabel}>Carro</Text>
              <View style={styles.choiceFieldWrap}>
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
              </View>
            </View>

            <View style={styles.inlineField}>
              <Text style={styles.inlineLabel}>Combustível</Text>
              <View style={styles.choiceFieldWrap}>
                {fuels.map((item) => (
                  <Choice key={item} label={item} active={item === fuel} onPress={() => setFuel(item)} />
                ))}
              </View>
            </View>

            <Field label="Valor pago" value={paid} onChangeText={setPaid} keyboardType="decimal-pad" />
            <Field label="Litros" value={liters} onChangeText={setLiters} keyboardType="decimal-pad" />

            <DateSelector label="Data" value={date} onChange={setDate} />

            <View style={styles.inlineField}>
              <Text style={styles.inlineLabel}>Posto</Text>
              <View style={styles.choiceFieldWrap}>
                {stations.map((station) => (
                  <Choice
                    key={station.id}
                    label={station.name}
                    active={station.id === stationId}
                    onPress={() => setStationId(station.id)}
                  />
                ))}
              </View>
            </View>
            <Text style={styles.muted}>Localização fake de teste: posto mais próximo selecionado pelo app.</Text>

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
  allLogs,
  cars,
  stations,
  editingLogId,
  onEdit,
  onCancelEdit,
  onCarSelect,
  onSave,
  onUpdate
}: {
  logs: FuelLog[];
  allLogs: FuelLog[];
  cars: Car[];
  stations: Station[];
  editingLogId: string | null;
  onEdit: (logId: string) => void;
  onCancelEdit: () => void;
  onCarSelect: (id: string) => void;
  onSave: (log: FuelLog) => void;
  onUpdate: (log: FuelLog) => void;
}) {
  const { styles } = useThemeStyles();
  const logNumbers = logNumberMap(allLogs);
  const numberedLogs = logs.map((log) => ({ log, number: logNumbers.get(log.id) ?? 0 }));

  return (
    <View style={styles.stack}>
      <Section title="Abastecimentos">
        <View style={styles.mapPanel}>
          <FuelMap numberedLogs={numberedLogs} stations={stations} />
        </View>

        <View style={styles.mapListDivider} />
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

function FuelMap({
  numberedLogs,
  stations
}: {
  numberedLogs: Array<{ log: FuelLog; number: number }>;
  stations: Station[];
}) {
  const { styles, theme } = useThemeStyles();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const points = numberedLogs.map(({ log, number }, index) => {
    const station = stations.find((item) => item.id === log.stationId);
    return {
      number,
      name: station?.name ?? `Abastecimento ${number}`,
      latitude: station?.latitude ?? log.latitude ?? fakeCurrentLocation.latitude,
      longitude: station?.longitude ?? log.longitude ?? fakeCurrentLocation.longitude,
      offset: index
    };
  });

  useEffect(() => {
    if (Platform.OS !== "web" || !mapRef.current || leafletMapRef.current) {
      return;
    }

    const cssId = "leaflet-css";
    const documentRef = globalThis.document;
    if (documentRef && !documentRef.getElementById(cssId)) {
      const link = documentRef.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      documentRef.head.appendChild(link);
    }

    const styleId = "fuel-map-pin-css";
    if (documentRef && !documentRef.getElementById(styleId)) {
      const style = documentRef.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        .fuel-map-pin {
          width: 34px;
          height: 34px;
          border-radius: 17px;
          border: 3px solid #fff;
          background: ${theme.primary};
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          box-shadow: 0 6px 14px rgba(0,0,0,.24);
        }
        .fuel-map-pin span {
          line-height: 1;
        }
      `;
      documentRef.head.appendChild(style);
    }

    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);
    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (points.length === 0) {
      map.setView([fakeCurrentLocation.latitude, fakeCurrentLocation.longitude], 14);
      return;
    }

    const bounds = L.latLngBounds([]);
    points.forEach((point) => {
      const latitude = point.latitude + point.offset * 0.00008;
      const longitude = point.longitude + point.offset * 0.00008;
      const marker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: "fuel-map-pin",
          html: `<span>${point.number}</span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        })
      })
        .bindPopup(point.name)
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([latitude, longitude]);
    });

    map.fitBounds(bounds, { padding: [26, 26], maxZoom: 15 });
  }, [JSON.stringify(points)]);

  if (Platform.OS !== "web") {
    return (
      <>
        <Image
          source={{ uri: "https://tile.openstreetmap.org/15/12143/14102.png" }}
          style={styles.mapImage}
        />
        {points.length === 0 ? (
          <Text style={styles.muted}>Os abastecimentos aparecerão aqui.</Text>
        ) : (
          points.map((point, index) => (
            <View
              key={`${point.number}-${index}`}
              style={[
                styles.mapPin,
                { left: `${18 + (index * 29) % 62}%`, top: `${20 + (index * 23) % 55}%` }
              ]}
            >
              <Text style={styles.pinText}>{point.number}</Text>
            </View>
          ))
        )}
      </>
    );
  }

  return React.createElement("div", {
    ref: mapRef,
    style: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.map
    }
  });
}

function Cars({
  cars,
  logs,
  selectedCarId,
  onSelect,
  onSave,
  onUpdate,
  onDeleteCar
}: {
  cars: Car[];
  logs: FuelLog[];
  selectedCarId: string | null;
  onSelect: (id: string) => void;
  onSave: (car: Car) => void;
  onUpdate: (car: Car) => void;
  onDeleteCar: (carId: string) => void;
}) {
  const { styles } = useThemeStyles();
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const carRanking = cars
    .map((car) => {
      const carLogs = logs.filter((log) => log.carId === car.id);
      const total = carLogs.reduce((sum, log) => sum + log.paid, 0);
      return { car, total, count: carLogs.length };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.total - a.total);

  function openNewForm() {
    setEditingCarId("new");
  }

  function openEditForm(car: Car) {
    if (editingCarId === car.id) {
      closeForm();
      return;
    }

    onSelect(car.id);
    setEditingCarId(car.id);
  }

  function closeForm() {
    setEditingCarId(null);
  }

  return (
    <View style={styles.stack}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Meus carros</Text>
        <Pressable style={styles.addButton} onPress={openNewForm}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {editingCarId === "new" ? (
        <Section title="Adicionar carro" rightAction={<Pressable style={styles.closeButton} onPress={closeForm}><Text style={styles.closeButtonText}>×</Text></Pressable>}>
          <CarEditor onSave={onSave} onUpdate={onUpdate} onDelete={onDeleteCar} onCancel={closeForm} />
        </Section>
      ) : null}

      <Section title="">
        {cars.length === 0 ? (
          <Empty text="Cadastre seu primeiro carro pela placa." />
        ) : (
          cars.map((car) => (
            <View key={car.id} style={styles.inlineEditGroup}>
              <Pressable
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
              {editingCarId === car.id ? (
                <View style={styles.inlineForm}>
                  <CarEditor
                    car={car}
                    onSave={onSave}
                    onUpdate={onUpdate}
                    onDelete={onDeleteCar}
                    onCancel={closeForm}
                  />
                </View>
              ) : null}
            </View>
          ))
        )}
      </Section>

      <Section title="Ranking de carros">
        {carRanking.length === 0 ? (
          <Empty text="O ranking nasce a partir dos abastecimentos registrados." />
        ) : (
          carRanking.map((item, index) => (
            <Pressable
              key={item.car.id}
              style={(state) => [
                styles.listItem,
                item.car.id === selectedCarId && styles.selectedItem,
                isHovered(state) && styles.listItemHover
              ]}
              onPress={() => openEditForm(item.car)}
            >
              <View style={styles.rankingInfo}>
                <Text style={styles.itemTitle}>
                  {index + 1}. {item.car.nickname}
                </Text>
                <Text style={styles.muted}>{item.count} abastecimentos</Text>
              </View>
              <Text style={styles.rankingPrice}>{currency.format(item.total)}</Text>
            </Pressable>
          ))
        )}
      </Section>
    </View>
  );
}

function CarEditor({
  car,
  onSave,
  onUpdate,
  onDelete,
  onCancel
}: {
  car?: Car;
  onSave: (car: Car) => void;
  onUpdate: (car: Car) => void;
  onDelete: (carId: string) => void;
  onCancel: () => void;
}) {
  const { styles } = useThemeStyles();
  const [draftCar, setDraftCar] = useState<Car | null>(null);
  const [plate, setPlate] = useState(car?.plate ?? "");
  const [nickname, setNickname] = useState(car?.nickname ?? "");
  const [brand, setBrand] = useState(car?.brand ?? "");
  const [model, setModel] = useState(car?.model ?? "");
  const [year, setYear] = useState(car?.year || String(new Date().getFullYear()));
  const [acceptedFuel, setAcceptedFuel] = useState<FuelType[]>(car?.acceptedFuel?.length ? car.acceptedFuel : [car?.defaultFuel ?? "Gasolina comum"]);
  const [defaultFuel, setDefaultFuel] = useState<FuelType>(car?.defaultFuel ?? "Gasolina comum");
  const [status, setStatus] = useState(car ? "Alterações salvas automaticamente." : "Preencha placa e apelido para salvar.");
  const plateIsInvalid = plate.trim().length > 0 && !BrazilianPlate.isValid(plate);

  useEffect(() => {
    if (!car) {
      return;
    }

    setPlate(car.plate);
    setNickname(car.nickname);
    setBrand(car.brand);
    setModel(car.model);
    setYear(car.year);
    setAcceptedFuel(car.acceptedFuel?.length ? car.acceptedFuel : [car.defaultFuel]);
    setDefaultFuel(car.defaultFuel);
    setDraftCar(null);
  }, [car?.id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!plate.trim() || !nickname.trim()) {
        setStatus("Preencha placa e apelido para salvar.");
        return;
      }

      if (!BrazilianPlate.isValid(plate)) {
        setStatus("Use uma placa no padrão ABC-1234 ou ABC1D23.");
        return;
      }

      if (car) {
        onUpdate(CarFactory.update(car, { plate, nickname, brand, model, year, acceptedFuel, defaultFuel }));
        setStatus("Alterações salvas automaticamente.");
        return;
      }

      if (draftCar) {
        const updated = CarFactory.update(draftCar, { plate, nickname, brand, model, year, acceptedFuel, defaultFuel });
        setDraftCar(updated);
        onUpdate(updated);
        setStatus("Carro salvo automaticamente.");
        return;
      }

      const created = CarFactory.create({ plate, nickname, brand, model, year, acceptedFuel, defaultFuel });
      setDraftCar(created);
      onSave(created);
      setStatus("Carro salvo automaticamente.");
    }, 450);

    return () => clearTimeout(timeout);
  }, [plate, nickname, brand, model, year, acceptedFuel, defaultFuel, car?.id, draftCar?.id]);

  useEffect(() => {
    if (acceptedFuel.includes(defaultFuel)) {
      return;
    }

    setDefaultFuel(acceptedFuel[0] ?? "Gasolina comum");
  }, [acceptedFuel, defaultFuel]);

  function changeYear(offset: number) {
    const numericYear = Number(year) || new Date().getFullYear();
    updateYear(String(Math.min(2035, Math.max(1950, numericYear + offset))));
  }

  function updateYear(nextYear: string) {
    const normalizedYear = nextYear.replace(/\D/g, "").slice(0, 4);
    setYear(normalizedYear);

    if (!plate.trim() || !nickname.trim()) {
      return;
    }

    if (car) {
      onUpdate(CarFactory.update(car, { plate, nickname, brand, model, year: normalizedYear, acceptedFuel, defaultFuel }));
      return;
    }

    if (draftCar) {
      const updated = CarFactory.update(draftCar, { plate, nickname, brand, model, year: normalizedYear, acceptedFuel, defaultFuel });
      setDraftCar(updated);
      onUpdate(updated);
    }
  }

  function updatePlate(nextPlate: string) {
    setPlate(BrazilianPlate.normalize(nextPlate));
  }

  function toggleAcceptedFuel(fuel: FuelType) {
    setAcceptedFuel((current) => {
      if (current.includes(fuel)) {
        if (current.length === 1) {
          return current;
        }

        return current.filter((item) => item !== fuel);
      }

      return [...current, fuel];
    });
  }

  function confirmDelete() {
    const carToDelete = car ?? draftCar;
    if (!carToDelete) {
      onCancel();
      return;
    }

    onDelete(carToDelete.id);
    onCancel();
  }

  return (
    <View style={styles.formStack}>
      <Field label="Placa" value={plate} onChangeText={updatePlate} autoCapitalize="characters" maxLength={8} />
      {plateIsInvalid ? (
        <Text style={styles.errorText}>Placa inválida. Use ABC-1234 ou ABC1D23.</Text>
      ) : null}
      <Field label="Apelido" value={nickname} onChangeText={setNickname} />
      <Field label="Marca" value={brand} onChangeText={setBrand} />
      <Field label="Modelo" value={model} onChangeText={setModel} />
      <View style={styles.inlineField}>
        <Text style={styles.inlineLabel}>Ano</Text>
        <View style={styles.stepper}>
          <Pressable style={styles.stepperButton} onPress={() => changeYear(-1)}>
            <Text style={styles.stepperButtonText}>−</Text>
          </Pressable>
          <TextInput
            value={year}
            onChangeText={updateYear}
            keyboardType="number-pad"
            style={styles.stepperInput}
          />
          <Pressable style={styles.stepperButton} onPress={() => changeYear(1)}>
            <Text style={styles.stepperButtonText}>+</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.inlineField}>
        <Text style={styles.inlineLabel}>Combustíveis</Text>
        <View style={styles.choiceFieldWrap}>
          {fuels.map((fuel) => (
            <Choice key={fuel} label={fuel} active={acceptedFuel.includes(fuel)} onPress={() => toggleAcceptedFuel(fuel)} />
          ))}
        </View>
      </View>
      <Pressable style={styles.deleteButton} onPress={confirmDelete}>
        <Text style={styles.deleteButtonText}>Apagar carro</Text>
      </Pressable>
    </View>
  );
}

function Stations({
  stations,
  logs,
  allLogs,
  cars,
  metrics,
  onEditLog,
  onSave,
  onUpdate,
  onDeleteStation
}: {
  stations: Station[];
  logs: FuelLog[];
  allLogs: FuelLog[];
  cars: Car[];
  metrics: DashboardMetrics;
  onEditLog: (logId: string) => void;
  onSave: (station: Station) => void;
  onUpdate: (station: Station) => void;
  onDeleteStation: (stationId: string) => void;
}) {
  const { styles } = useThemeStyles();
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  function openNewForm() {
    setEditingStationId("new");
  }

  function openEditForm(station: Station) {
    if (editingStationId === station.id) {
      setEditingStationId(null);
      return;
    }

    setEditingStationId(station.id);
  }

  return (
    <View style={styles.stack}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Postos</Text>
        <Pressable style={styles.addButton} onPress={openNewForm}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {editingStationId === "new" ? (
        <Section
          title="Adicionar posto"
          rightAction={
            <Pressable style={styles.closeButton} onPress={() => setEditingStationId(null)}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          }
        >
          <StationEditor
            onSave={onSave}
            onUpdate={onUpdate}
            onDelete={onDeleteStation}
            onCancel={() => setEditingStationId(null)}
          />
        </Section>
      ) : null}

      <Section title="">
        {stations.map((station) => (
          <View key={station.id} style={styles.inlineEditGroup}>
            <Pressable
              style={(state) => [styles.listItem, isHovered(state) && styles.listItemHover]}
              onPress={() => openEditForm(station)}
            >
              <View style={styles.logInfo}>
                <Text style={styles.itemTitle}>{station.name}</Text>
                <Text style={styles.muted}>
                  {[station.address, station.city, station.state].filter(Boolean).join(" - ")}
                </Text>
              </View>
            </Pressable>
            {editingStationId === station.id ? (
              <View style={styles.inlineForm}>
                <StationEditor
                  station={station}
                  onSave={onSave}
                  onUpdate={onUpdate}
                  onDelete={onDeleteStation}
                  onCancel={() => setEditingStationId(null)}
                />
              </View>
            ) : null}
          </View>
        ))}
      </Section>

      <Section title="Ranking de postos">
        <Ranking
          rows={metrics.stationRanking}
          selectedStationId={selectedStationId}
          logs={logs}
          allLogs={allLogs}
          cars={cars}
          stations={stations}
          onEditLog={onEditLog}
          onSelectStation={(stationId) =>
            setSelectedStationId((current) => (current === stationId ? null : stationId))
          }
        />
      </Section>
    </View>
  );
}

function StationEditor({
  station,
  onSave,
  onUpdate,
  onDelete,
  onCancel
}: {
  station?: Station;
  onSave: (station: Station) => void;
  onUpdate: (station: Station) => void;
  onDelete: (stationId: string) => void;
  onCancel: () => void;
}) {
  const { styles } = useThemeStyles();
  const [draftStation, setDraftStation] = useState<Station | null>(null);
  const [name, setName] = useState(station?.name ?? "");
  const [address, setAddress] = useState(station?.address ?? "");
  const [city, setCity] = useState(station?.city ?? "");
  const [stateName, setStateName] = useState(station?.state ?? "");
  const [latitude, setLatitude] = useState(station?.latitude ?? fakeCurrentLocation.latitude);
  const [longitude, setLongitude] = useState(station?.longitude ?? fakeCurrentLocation.longitude);
  const [status, setStatus] = useState(station ? "Alterações salvas automaticamente." : "Preencha o nome para salvar.");

  useEffect(() => {
    if (!station) {
      return;
    }

    setName(station.name);
    setAddress(station.address);
    setCity(station.city ?? "");
    setStateName(station.state ?? "");
    setLatitude(station.latitude ?? fakeCurrentLocation.latitude);
    setLongitude(station.longitude ?? fakeCurrentLocation.longitude);
    setDraftStation(null);
  }, [station?.id]);

  useEffect(() => {
    let isActive = true;
    const timeout = setTimeout(async () => {
      if (!name.trim()) {
        setStatus("Preencha o nome para salvar.");
        return;
      }

      const geocoded = await geocodeStationAddress(address, city, stateName);
      if (!isActive) {
        return;
      }

      const nextLatitude = geocoded?.latitude ?? latitude;
      const nextLongitude = geocoded?.longitude ?? longitude;
      if (geocoded) {
        setLatitude(nextLatitude);
        setLongitude(nextLongitude);
      }

      const payload: Station = {
        id: station?.id ?? draftStation?.id ?? `posto-${Date.now()}`,
        name: name.trim(),
        address: address.trim() || "Sem endereço",
        city: city.trim(),
        state: stateName.trim().toUpperCase(),
        latitude: nextLatitude,
        longitude: nextLongitude
      };

      if (station) {
        onUpdate(payload);
        setStatus("Alterações salvas automaticamente.");
        return;
      }

      if (draftStation) {
        setDraftStation(payload);
        onUpdate(payload);
        setStatus("Posto salvo automaticamente.");
        return;
      }

      setDraftStation(payload);
      onSave(payload);
      setStatus("Posto salvo automaticamente.");
    }, 800);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [name, address, city, stateName, station?.id, draftStation?.id, latitude, longitude]);

  function confirmDelete() {
    const stationToDelete = station ?? draftStation;
    if (!stationToDelete) {
      onCancel();
      return;
    }

    onDelete(stationToDelete.id);
    onCancel();
  }

  return (
    <View style={styles.formStack}>
      <Field label="Nome" value={name} onChangeText={setName} />
      <Field label="Endereço" value={address} onChangeText={setAddress} />
      <Field label="Cidade" value={city} onChangeText={setCity} />
      <Field label="Estado" value={stateName} onChangeText={setStateName} autoCapitalize="characters" maxLength={2} />
      <Pressable style={styles.deleteButton} onPress={confirmDelete}>
        <Text style={styles.deleteButtonText}>Apagar posto</Text>
      </Pressable>
    </View>
  );
}

function Tabs({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const { styles } = useThemeStyles();
  const tabs: Tab[] = ["Resumo", "Abastecimentos", "Postos", "Carros"];
  return (
    <View style={styles.tabsBar}>
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <Pressable key={tab} style={[styles.tab, active === tab && styles.activeTab]} onPress={() => onChange(tab)}>
            <Text style={[styles.tabText, active === tab && styles.activeTabText]}>{tab}</Text>
          </Pressable>
        ))}
      </View>
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
  allLogs,
  cars,
  stations,
  onSelectStation,
  onEditLog
}: {
  rows: StationRankingItem[];
  selectedStationId?: string | null;
  logs: FuelLog[];
  allLogs: FuelLog[];
  cars: Car[];
  stations: Station[];
  onSelectStation?: (stationId: string) => void;
  onEditLog?: (logId: string) => void;
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
            <StationDetails
              stationId={row.id}
              logs={logs}
              allLogs={allLogs}
              cars={cars}
              stations={stations}
              onEditLog={onEditLog}
            />
          ) : null}
        </React.Fragment>
      ))}
    </>
  );
}

function StationDetails({
  stationId,
  logs,
  allLogs,
  cars,
  stations,
  onEditLog
}: {
  stationId: string;
  logs: FuelLog[];
  allLogs: FuelLog[];
  cars: Car[];
  stations: Station[];
  onEditLog?: (logId: string) => void;
}) {
  const { styles } = useThemeStyles();
  const station = stations.find((item) => item.id === stationId);
  const stationLogs = logs.filter((log) => log.stationId === stationId);
  const logNumbers = logNumberMap(allLogs);

  if (!station) {
    return null;
  }

  return (
    <View style={styles.stationDetails}>
      <Text style={styles.itemTitle}>Detalhes: {station.name}</Text>
      {stationLogs.map((log) => {
        const car = cars.find((item) => item.id === log.carId);
        return (
          <Pressable
            key={log.id}
            style={(state) => [styles.detailRow, isHovered(state) && styles.listItemHover]}
            onPress={() => onEditLog?.(log.id)}
          >
            <View>
              <Text style={styles.itemTitle}>#{logNumbers.get(log.id)} - {DateFormatter.compact(log.createdAt)}</Text>
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
            <View style={[styles.barFill, { height: item.value > 0 ? `${Math.max(10, (item.value / max) * 100)}%` : "0%" }]} />
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
    <View style={styles.inlineField}>
      <Text style={styles.inlineLabel}>{label}</Text>
      <TextInput placeholderTextColor={theme.muted} style={[styles.input, style]} {...inputProps} />
    </View>
  );
}

function DateSelector({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { styles, theme } = useThemeStyles();
  const [day = "", month = "", year = ""] = value.split("-");

  function updatePart(part: "day" | "month" | "year", nextValue: string) {
    const onlyNumbers = nextValue.replace(/\D/g, "");
    const nextDay = part === "day" ? onlyNumbers.slice(0, 2) : day;
    const nextMonth = part === "month" ? onlyNumbers.slice(0, 2) : month;
    const nextYear = part === "year" ? onlyNumbers.slice(0, 4) : year;
    onChange(`${nextDay}-${nextMonth}-${nextYear}`);
  }

  return (
    <View style={styles.inlineField}>
      <Text style={styles.inlineLabel}>{label}</Text>
      <View style={styles.dateSelector}>
        <TextInput
          value={day}
          onChangeText={(text) => updatePart("day", text)}
          placeholder="DD"
          placeholderTextColor={theme.muted}
          keyboardType="number-pad"
          maxLength={2}
          style={styles.datePartInput}
        />
        <TextInput
          value={month}
          onChangeText={(text) => updatePart("month", text)}
          placeholder="MM"
          placeholderTextColor={theme.muted}
          keyboardType="number-pad"
          maxLength={2}
          style={styles.datePartInput}
        />
        <TextInput
          value={year}
          onChangeText={(text) => updatePart("year", text)}
          placeholder="YYYY"
          placeholderTextColor={theme.muted}
          keyboardType="number-pad"
          maxLength={4}
          style={[styles.datePartInput, styles.dateYearInput]}
        />
      </View>
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
  authScreen: {
    flex: 1,
    padding: 20,
    gap: 18,
    backgroundColor: theme.background,
    justifyContent: "center"
  },
  authTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  authCard: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.border
  },
  authButton: {
    flex: 0,
    width: "100%"
  },
  authTabs: {
    flexDirection: "row",
    backgroundColor: theme.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 4,
    gap: 4
  },
  authTab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  authTabActive: {
    backgroundColor: theme.primary
  },
  authTabText: {
    color: theme.muted,
    fontSize: 14,
    fontWeight: "800"
  },
  authTabTextActive: {
    color: "#FFFFFF"
  },
  authDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.border
  },
  authDividerText: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  formErrorBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D94A4A",
    backgroundColor: theme.mode === "dark" ? "rgba(217,74,74,0.14)" : "#FCEAEA",
    padding: 10
  },
  formErrorText: {
    color: "#D94A4A",
    fontSize: 13,
    lineHeight: 18
  },
  googleButton: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  googleButtonText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "900"
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 14,
    zIndex: 20
  },
  headerTop: {
    position: "relative",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    zIndex: 30
  },
  headerSecondaryActions: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    zIndex: 40
  },
  headerPrimaryButton: {
    position: "relative",
    width: "100%",
    minHeight: 94,
    borderRadius: 0,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    zIndex: 1
  },
  headerPrimaryButtonCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 0
  },
  headerPrimaryButtonPlus: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 32
  },
  headerPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14
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
  demoBanner: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.primarySoft,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  demoBannerTextGroup: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  demoBannerTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "900"
  },
  demoBannerText: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 16
  },
  demoBannerButton: {
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  demoBannerButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900"
  },
  accountBox: {
    position: "relative",
    zIndex: 1000
  },
  accountButton: {
    width: 34,
    minHeight: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  accountButtonText: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: "900"
  },
  accountIcon: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 2
  },
  accountIconHead: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.primary
  },
  accountIconBody: {
    width: 14,
    height: 7,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: theme.primary
  },
  accountMenu: {
    position: "absolute",
    top: 36,
    right: 0,
    minWidth: 210,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 8,
    gap: 8,
    zIndex: 1001,
    elevation: 20
  },
  accountEmail: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18
  },
  accountName: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20
  },
  accountMenuItem: {
    minHeight: 34,
    borderRadius: 6,
    justifyContent: "center",
    backgroundColor: theme.primarySoft,
    paddingHorizontal: 10
  },
  accountMenuText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: "900"
  },
  settingsBox: {
    position: "relative",
    zIndex: 1000
  },
  configButton: {
    width: 34,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surface
  },
  configButtonText: {
    color: theme.muted,
    fontSize: 17,
    fontWeight: "900"
  },
  settingsMenu: {
    position: "absolute",
    top: 36,
    right: 0,
    minWidth: 116,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 6,
    gap: 4,
    zIndex: 1001,
    elevation: 20
  },
  settingsMenuItem: {
    minHeight: 34,
    borderRadius: 6,
    justifyContent: "center",
    paddingHorizontal: 10
  },
  settingsMenuText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "800"
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
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0
  },
  themeButtonText: {
    color: theme.primary,
    fontWeight: "900",
    fontSize: 18,
    lineHeight: 22
  },
  content: {
    padding: 16,
    paddingBottom: 112
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
    flex: 1,
    minWidth: 0,
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
  formStack: {
    gap: 10
  },
  inlineField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48
  },
  inlineLabel: {
    width: 86,
    color: theme.text,
    fontSize: 13,
    fontWeight: "800"
  },
  stepper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    minWidth: 0
  },
  dateSelector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0
  },
  dateInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.input,
    color: theme.text,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800"
  },
  datePartInput: {
    width: 54,
    minHeight: 42,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.input,
    color: theme.text,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800"
  },
  dateYearInput: {
    flex: 1,
    minWidth: 76
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  stepperButtonText: {
    color: theme.primary,
    fontSize: 22,
    fontWeight: "900"
  },
  stepperInput: {
    width: 92,
    minHeight: 42,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.input,
    color: theme.text,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800"
  },
  deleteButton: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D95D5D",
    alignItems: "center",
    justifyContent: "center"
  },
  deleteButtonText: {
    color: "#D95D5D",
    fontSize: 14,
    fontWeight: "900"
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
  choiceFieldWrap: {
    flex: 1,
    minWidth: 0,
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
  errorText: {
    color: "#D94A4A",
    fontSize: 13,
    lineHeight: 18
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
  mapImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.68
  },
  mapListDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 12
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
  tabsBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 76,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    alignItems: "center"
  },
  tabs: {
    width: "100%",
    maxWidth: 430,
    paddingHorizontal: 8,
    flexDirection: "row",
    gap: 5
  },
  tab: {
    flex: 1,
    minHeight: 52,
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
    fontSize: 12,
    fontWeight: "800"
  },
  activeTabText: {
    color: "#FFFFFF"
  }
  });
}
