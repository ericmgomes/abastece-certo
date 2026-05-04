import AsyncStorage from "@react-native-async-storage/async-storage";
import L from "leaflet";
import { StatusBar } from "expo-status-bar";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
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
  Car,
  CarFactory,
  DashboardCalculator,
  DashboardMetrics,
  DateInputParser,
  DateFormatter,
  FuelLog,
  FuelLogFactory,
  FuelEfficiencyCalculator,
  FuelPrice,
  FuelType,
  MoneyParser,
  Station,
  StationRankingItem,
  StationSuggestionService,
  ThemePalette,
  ThemeMode,
  User,
  UserSummary,
  VehicleType,
  fuels,
  vehicleTypes
} from "./src/domain";
import { SupabaseAppRepository } from "./src/repositories/SupabaseAppRepository";
import { supabase } from "./src/supabaseClient";
import { SpeedInsights } from "@vercel/speed-insights/react";

type Tab = "Resumo" | "Abastecimentos" | "Postos" | "Veículos";
type UtilityScreen = "help" | "privacy" | "users" | null;
type OAuthConsentDetails = {
  authorization_id: string;
  redirect_uri: string;
  scope: string;
  client: {
    name: string;
    logo_uri?: string | null;
  };
  user: {
    email?: string | null;
  };
};
const storageKey = "litro-certo:v1";
const guestStorageKey = "litro-certo:guest:v1";
const appRepository = new SupabaseAppRepository();
const brazilVehicleBrands = [
  "Chevrolet",
  "Fiat",
  "Volkswagen",
  "Toyota",
  "Hyundai",
  "Honda",
  "Renault",
  "Nissan",
  "Jeep",
  "Peugeot",
  "Citroën",
  "Mitsubishi",
  "Ford",
  "Kia",
  "BYD",
  "GWM",
  "Caoa Chery",
  "Mercedes-Benz",
  "BMW",
  "Audi",
  "Volvo",
  "Ram"
];
const brazilStates = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO"
];

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
    vehicleType: "Carro",
    nickname: "Compass",
    brand: "Jeep",
    model: "Compass",
    acceptedFuel: fuels,
    defaultFuel: "Gasolina comum"
  },
  {
    id: "demo-onix",
    vehicleType: "Carro",
    nickname: "Onix",
    brand: "Chevrolet",
    model: "Onix Plus",
    acceptedFuel: fuels,
    defaultFuel: "Etanol"
  },
  {
    id: "demo-hilux",
    vehicleType: "Caminhonete",
    nickname: "Hilux",
    brand: "Toyota",
    model: "Hilux",
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

const demoState: AppState = {
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

function validFilteredCarIds(cars: Car[], filteredCarIds?: string[]) {
  const carIds = cars.map((car) => car.id);
  const validIds = (filteredCarIds ?? []).filter((id) => carIds.includes(id));
  if (validIds.length === 0) {
    return carIds;
  }

  return validIds;
}

function validSelectedCarId(cars: Car[], selectedCarId: string | null | undefined) {
  if (selectedCarId && cars.some((car) => car.id === selectedCarId)) {
    return selectedCarId;
  }

  return cars[0]?.id ?? null;
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

function currentBrowserUrl() {
  const location = (globalThis as unknown as { location?: Location }).location;
  return location?.href;
}

function oauthAuthorizationIdFromUrl() {
  const location = (globalThis as unknown as { location?: Location }).location;
  if (!location || location.pathname !== "/oauth/consent") {
    return null;
  }

  return new URLSearchParams(location.search).get("authorization_id");
}

function isOAuthConsentRoute() {
  const location = (globalThis as unknown as { location?: Location }).location;
  return location?.pathname === "/oauth/consent";
}

function redirectBrowserTo(url: string) {
  const location = (globalThis as unknown as { location?: Location }).location;
  if (location) {
    location.href = url;
  }
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
  themePalette: "green",
  demoDataLoaded: false
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}

function vehicleTypeIcon(type: VehicleType) {
  const icons: Record<VehicleType, string> = {
    Carro: "🚗",
    Moto: "🏍",
    Caminhonete: "▰",
    Caminhão: "▣",
    Van: "▥"
  };

  return icons[type] ?? icons.Carro;
}

type Theme = ReturnType<typeof buildTheme>;
type ThemeContextValue = {
  mode: ThemeMode;
  palette: ThemePalette;
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

function buildTheme(mode: ThemeMode, palette: ThemePalette) {
  const blueFont = Platform.select({ ios: "Avenir", android: "sans-serif", default: "Verdana" }) ?? "sans-serif";

  const palettes = {
    green: {
      light: {
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
        map: "#D7EDDE",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      },
      dark: {
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
        map: "#14382E",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      }
    },
    pink: {
      light: {
        background: "#FFF0F7",
        surface: "#FFFFFF",
        surfaceAlt: "#FFF6FA",
        border: "#F5B8D2",
        text: "#2A1020",
        muted: "#8D5F73",
        primary: "#D63384",
        primaryDark: "#9F1F61",
        primarySoft: "#FAD7E8",
        accent: "#FF7AB8",
        input: "#FFFFFF",
        map: "#FBE2EE",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      },
      dark: {
        background: "#210817",
        surface: "#351126",
        surfaceAlt: "#461632",
        border: "#743052",
        text: "#FFF4FA",
        muted: "#E8AFCB",
        primary: "#FF66A8",
        primaryDark: "#C72C78",
        primarySoft: "#5A1D3C",
        accent: "#FF9FCA",
        input: "#2A0C1D",
        map: "#44152F",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      }
    },
    blue: {
      light: {
        background: "#EEF6FF",
        surface: "#FFFFFF",
        surfaceAlt: "#F4F9FF",
        border: "#B9D7F5",
        text: "#0B1F33",
        muted: "#5B7188",
        primary: "#1D6FD6",
        primaryDark: "#124A93",
        primarySoft: "#D8EAFE",
        accent: "#4AA3FF",
        input: "#FFFFFF",
        map: "#DDEEFF",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      },
      dark: {
        background: "#071527",
        surface: "#10233A",
        surfaceAlt: "#15304F",
        border: "#2C547C",
        text: "#F2F8FF",
        muted: "#A9C4E0",
        primary: "#4A9BFF",
        primaryDark: "#1D63B9",
        primarySoft: "#183E66",
        accent: "#84C2FF",
        input: "#0B1D31",
        map: "#143052",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      }
    },
    orange: {
      light: {
        background: "#FFF5EC",
        surface: "#FFFFFF",
        surfaceAlt: "#FFF9F3",
        border: "#F3CBA4",
        text: "#2B1A0C",
        muted: "#7C654E",
        primary: "#D66A1D",
        primaryDark: "#9A4710",
        primarySoft: "#FFE0C4",
        accent: "#FF9B45",
        input: "#FFFFFF",
        map: "#F8E0C9",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      },
      dark: {
        background: "#1E1007",
        surface: "#301B0F",
        surfaceAlt: "#422514",
        border: "#764522",
        text: "#FFF7EF",
        muted: "#E5B98D",
        primary: "#FF8A33",
        primaryDark: "#C45C16",
        primarySoft: "#5B331A",
        accent: "#FFB274",
        input: "#261307",
        map: "#3C2414",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      }
    }
  };

  const selected = palettes[palette][mode];
  return {
      mode,
      palette,
      ...selected
  };
}

export default function App() {
  const [state, setState] = useState<AppState>(starterState);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authName, setAuthName] = useState<string | null>(null);
  const [authScreenOpen, setAuthScreenOpen] = useState(false);
  const [utilityScreen, setUtilityScreen] = useState<UtilityScreen>(null);
  const [tab, setTab] = useState<Tab>("Resumo");
  const [fuelFormMode, setFuelFormMode] = useState<"closed" | "new" | "edit">("closed");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const scrollRef = useRef<ScrollView>(null);
  const saveErrorShownRef = useRef(false);
  const themeMode = state.themeMode ?? "light";
  const themePalette = state.themePalette ?? "green";
  const theme = useMemo(() => buildTheme(themeMode, themePalette), [themeMode, themePalette]);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const oauthConsentRoute = isOAuthConsentRoute();
  const oauthAuthorizationId = oauthAuthorizationIdFromUrl();

  function emptyAuthenticatedState(name: string | null, email: string | null): AppState {
    return {
      ...starterState,
      user: { name: name ?? email?.split("@")[0] ?? "Usuário", email: email ?? undefined },
      stations: [],
      themeMode,
      themePalette
    };
  }

  async function loadGuestState() {
    try {
      const stored = await AsyncStorage.getItem(guestStorageKey);
      if (!stored) {
        setState(withDemoData(starterState));
        return;
      }

      const parsed = JSON.parse(stored) as AppState;
      setState(withDemoData({
        ...starterState,
        ...parsed,
        user: parsed.user?.email ? demoState.user : parsed.user ?? demoState.user,
        logs: sortFuelLogs(withStableLogSequences(parsed.logs ?? []))
      }));
    } catch {
      setState(withDemoData(starterState));
    }
  }

  function enterGuestMode() {
    setOwnerId(null);
    setAuthEmail(null);
    setAuthName(null);
    void loadGuestState();
    setAuthScreenOpen(false);
  }

  async function loadStateForOwner(loadedOwnerId: string, name: string | null, email: string | null) {
    const fallbackState = emptyAuthenticatedState(name, email);

    try {
      const remoteState = await appRepository.load(loadedOwnerId);
      if (remoteState) {
        const mergedRemoteState = { ...starterState, ...remoteState } as AppState;
        const cars = mergedRemoteState.cars ?? [];
        const sessionUser = {
          name: name ?? email?.split("@")[0] ?? mergedRemoteState.user?.name ?? "Usuário",
          email: email ?? mergedRemoteState.user?.email
        };
        setState({
          ...mergedRemoteState,
          user: sessionUser,
          selectedCarId: validSelectedCarId(cars, mergedRemoteState.selectedCarId),
          filteredCarIds: validFilteredCarIds(cars, mergedRemoteState.filteredCarIds),
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
          enterGuestMode();
          return;
        }

        if (!sessionUser.email) {
          await supabase.auth.signOut();
          enterGuestMode();
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
        enterGuestMode();
        return;
      }

      if (!sessionUser.email) {
        supabase.auth.signOut().catch(() => undefined);
        enterGuestMode();
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
      const localStorageKey = ownerId ? `${storageKey}:${ownerId}` : guestStorageKey;
      AsyncStorage.setItem(localStorageKey, JSON.stringify(state)).catch((error) => {
        console.warn("Não foi possível salvar localmente.", error);
      });

      if (!ownerId) {
        return;
      }

      appRepository.save(ownerId, state)
        .then(() => {
          saveErrorShownRef.current = false;
        })
        .catch((error) => {
          console.warn("Não foi possível salvar no Supabase.", error);
          if (saveErrorShownRef.current) {
            return;
          }

          saveErrorShownRef.current = true;
          Alert.alert("Não foi possível salvar", "Seu registro apareceu na tela, mas ainda não foi salvo. Confira a conexão ou o banco de dados.");
        });
    }, 650);

    return () => clearTimeout(timeout);
  }, [ownerId, ready, state]);

  const selectedCar = state.cars.find((car) => car.id === state.selectedCarId) ?? state.cars[0];
  const activeCarIds = validFilteredCarIds(state.cars, state.filteredCarIds);
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

  function saveUser(user: User) {
    updateState({ user });
    setAuthName(user.name);

    if (!ownerId) {
      return;
    }

    supabase.auth.updateUser({
      data: {
        full_name: user.name,
        name: user.name
      }
    }).catch(() => undefined);
  }

  function moveMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function toggleTheme() {
    updateState({ themeMode: themeMode === "light" ? "dark" : "light" });
  }

  function selectThemePalette(nextPalette: ThemePalette) {
    updateState({ themePalette: nextPalette });
  }

  async function signOut() {
    await supabase.auth.signOut();
    enterGuestMode();
  }

  function confirmSignOut() {
    if (Platform.OS === "web") {
      const confirmed = globalThis.confirm?.("Deseja sair da sua conta?");
      if (!confirmed) {
        return;
      }

      void signOut();
      return;
    }

    Alert.alert("Sair", "Deseja sair da sua conta?", [
      { text: "Não", style: "cancel" },
      { text: "Sim", style: "destructive", onPress: () => void signOut() }
    ]);
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
    setUtilityScreen(null);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 0);
  }

  function openEditFuelForm(logId: string) {
    if (editingLogId === logId) {
      closeFuelForm();
      return;
    }

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
    setUtilityScreen(null);
    setTab(nextTab);
  }

  function renderContent() {
    if (utilityScreen === "help") {
      return <HelpScreen onClose={() => setUtilityScreen(null)} />;
    }

    if (utilityScreen === "privacy") {
      return <PrivacyScreen onClose={() => setUtilityScreen(null)} />;
    }

    if (utilityScreen === "users") {
      return <UsersAdmin onClose={() => setUtilityScreen(null)} />;
    }

    if (fuelFormMode === "new") {
      return (
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
      );
    }

    if (tab === "Veículos") {
      return (
        <Cars
          cars={state.cars}
          logs={state.logs}
          stations={state.stations}
          selectedCarId={state.selectedCarId}
          onEditLog={openEditFuelForm}
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
      );
    }

    if (tab === "Postos") {
      return (
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
      );
    }

    if (fuelFormMode === "closed" && tab === "Resumo") {
      return (
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
      );
    }

    if (tab === "Abastecimentos") {
      return (
        <StationMap
          logs={filteredLogs}
          cars={state.cars}
          stations={state.stations}
          editingLogId={editingLogId}
          allLogs={state.logs}
          onNew={openNewFuelForm}
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
      );
    }

    return null;
  }

  if (!ready) {
    return (
      <SafeAreaProvider>
        <ThemeContext.Provider value={{ mode: themeMode, palette: themePalette, theme, styles }}>
          <SafeAreaView style={styles.loading}>
            <Text style={styles.brand}>LitroCerto</Text>
            <Text style={styles.muted}>Carregando seu histórico...</Text>
          </SafeAreaView>
        </ThemeContext.Provider>
      </SafeAreaProvider>
    );
  }

  if (authScreenOpen) {
    return (
      <SafeAreaProvider>
        <ThemeContext.Provider value={{ mode: themeMode, palette: themePalette, theme, styles }}>
          <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
          <SafeAreaView style={styles.shell}>
            <AuthScreen
              onToggleTheme={toggleTheme}
              onThemePaletteSelect={selectThemePalette}
              onCancel={() => setAuthScreenOpen(false)}
              authRedirectTo={oauthConsentRoute ? currentBrowserUrl() : undefined}
            />
          </SafeAreaView>
        </ThemeContext.Provider>
      </SafeAreaProvider>
    );
  }

  if (oauthConsentRoute) {
    return (
      <SafeAreaProvider>
        <ThemeContext.Provider value={{ mode: themeMode, palette: themePalette, theme, styles }}>
          <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
          <SafeAreaView style={styles.shell}>
            <OAuthConsentScreen
              authorizationId={oauthAuthorizationId}
              authenticated={Boolean(ownerId)}
              onOpenAuth={() => setAuthScreenOpen(true)}
            />
          </SafeAreaView>
        </ThemeContext.Provider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={{ mode: themeMode, palette: themePalette, theme, styles }}>
        <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
        <SafeAreaView style={styles.shell}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboard}
          >
            <Header
              user={state.user}
              onSave={saveUser}
              onToggleTheme={toggleTheme}
              onThemePaletteSelect={selectThemePalette}
              onNewFuel={openNewFuelForm}
              onOpenAuth={() => setAuthScreenOpen(true)}
              onOpenHelp={() => {
                closeFuelForm();
                setUtilityScreen("help");
              }}
              onOpenPrivacy={() => {
                closeFuelForm();
                setUtilityScreen("privacy");
              }}
              onOpenUsers={() => {
                closeFuelForm();
                setUtilityScreen("users");
              }}
              onSignOut={confirmSignOut}
              authEmail={authEmail}
              authName={authName}
              showNewFuelButton={fuelFormMode !== "new"}
            />
            {!ownerId ? (
              <DemoBanner onOpenAuth={() => setAuthScreenOpen(true)} />
            ) : null}
            {state.user && state.cars.length > 1 && tab !== "Veículos" && fuelFormMode !== "new" && !utilityScreen ? (
              <CarFilter
                cars={state.cars}
                activeCarIds={activeCarIds}
                onToggleCar={toggleFilterCar}
              />
            ) : null}
            <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {renderContent()}
            </ScrollView>
            <Tabs active={utilityScreen ? null : tab} onChange={changeTab} />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ThemeContext.Provider>
      {Platform.OS === "web" && <SpeedInsights />}
    </SafeAreaProvider>
  );
}

function AuthScreen({
  onToggleTheme,
  onThemePaletteSelect,
  onCancel,
  authRedirectTo
}: {
  onToggleTheme: () => void;
  onThemePaletteSelect: (palette: ThemePalette) => void;
  onCancel: () => void;
  authRedirectTo?: string;
}) {
  const { mode, palette, styles, theme } = useThemeStyles();
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSignIn = authMode === "signIn";

  function authRedirectUrl() {
    const location = (globalThis as unknown as { location?: { origin?: string } }).location;
    return authRedirectTo ?? location?.origin ?? "http://localhost:8086";
  }

  async function submit(mode: "signIn" | "signUp") {
    setFormError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (mode === "signUp" && trimmedName.length < 2) {
      setFormError("Informe seu nome para criar a conta.");
      return;
    }

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
      : await supabase.auth.signUp({
          ...credentials,
          options: {
            data: {
              full_name: trimmedName,
              name: trimmedName
            }
          }
        });
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
        <Text style={styles.brand}>LitroCerto</Text>
        <View style={styles.headerSecondaryActions}>
          <Pressable style={styles.headerSecondaryButton} onPress={onCancel}>
            <Text style={styles.headerSecondaryButtonText}>Agora não</Text>
          </Pressable>
          <ThemePalettePicker onSelect={onThemePaletteSelect} />
          <Pressable style={styles.themeButton} onPress={onToggleTheme}>
            <Text style={styles.themeButtonText}>{mode === "light" ? "☾" : "☼"}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.authCard}>
        <Text style={styles.title}>Entre para manter seus abastecimentos salvos</Text>
        <Text style={styles.muted}>Use Google para entrar mais rápido ou continue com email e senha.</Text>
        <Text style={styles.privacyText}>O app não rastreia seus trajetos. A localização só ajuda a sugerir o posto no momento do registro.</Text>
        <Pressable style={[styles.googleButton, styles.authButton]} onPress={signInWithGoogle} disabled={loading}>
          <Text style={styles.googleButtonText}>
            {isSignIn ? "Login com Google" : "Criar conta com Google"}
          </Text>
        </Pressable>
        <View style={styles.authDivider}>
          <View style={styles.authDividerLine} />
          <Text style={styles.authDividerText}>ou use email e senha</Text>
          <View style={styles.authDividerLine} />
        </View>
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
        {!isSignIn ? (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nome"
            autoCapitalize="words"
            placeholderTextColor={theme.muted}
            style={styles.input}
          />
        ) : null}
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
          <>
            <TextInput
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              placeholder="Confirmar senha"
              secureTextEntry
              placeholderTextColor={theme.muted}
              style={styles.input}
            />
            <Text style={styles.privacyText}>Depois de criar a conta, confirme o email que chegar na sua caixa de entrada antes de fazer login.</Text>
          </>
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
      </View>
    </KeyboardAvoidingView>
  );
}

function OAuthConsentScreen({
  authorizationId,
  authenticated,
  onOpenAuth
}: {
  authorizationId: string | null;
  authenticated: boolean;
  onOpenAuth: () => void;
}) {
  const { styles } = useThemeStyles();
  const [details, setDetails] = useState<OAuthConsentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authorizationId) {
      setDetails(null);
      setError("Autorização inválida ou expirada. Volte ao ChatGPT e tente iniciar sessão novamente.");
      return;
    }

    if (!authenticated) {
      setDetails(null);
      setError(null);
      return;
    }

    const currentAuthorizationId = authorizationId;
    let cancelled = false;
    async function loadAuthorization() {
      setLoading(true);
      setError(null);
      const result = await supabase.auth.oauth.getAuthorizationDetails(currentAuthorizationId);
      setLoading(false);

      if (cancelled) {
        return;
      }

      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (!result.data) {
        setError("Não foi possível carregar esta autorização.");
        return;
      }

      if ("redirect_url" in result.data) {
        redirectBrowserTo(result.data.redirect_url);
        return;
      }

      setDetails(result.data);
    }

    void loadAuthorization();
    return () => {
      cancelled = true;
    };
  }, [authorizationId, authenticated]);

  async function decide(decision: "approve" | "deny") {
    if (!authorizationId) {
      setError("Autorização inválida ou expirada. Volte ao ChatGPT e tente iniciar sessão novamente.");
      return;
    }

    setLoading(true);
    setError(null);
    const result = decision === "approve"
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (result.data?.redirect_url) {
      redirectBrowserTo(result.data.redirect_url);
    }
  }

  return (
    <View style={styles.authScreen}>
      <View style={styles.authCard}>
        <Text style={styles.brand}>LitroCerto</Text>
        <Text style={styles.title}>Autorizar acesso</Text>
        {!authenticated ? (
          <>
            <Text style={styles.helpText}>
              Faça login no LitroCerto para autorizar o ChatGPT a consultar e registrar dados na sua conta.
            </Text>
            <Text style={styles.privacyText}>
              Cada autorização vale apenas para a sua conta. Outros usuários não conseguem acessar seus veículos, postos ou abastecimentos.
            </Text>
            <Pressable style={styles.primaryButton} onPress={onOpenAuth}>
              <Text style={styles.primaryButtonText}>Login</Text>
            </Pressable>
          </>
        ) : loading && !details ? (
          <Text style={styles.muted}>Carregando autorização...</Text>
        ) : details ? (
          <>
            <Text style={styles.helpText}>
              {details.client.name} quer acessar sua conta LitroCerto.
            </Text>
            <View style={styles.consentSummary}>
              <Text style={styles.itemTitle}>{details.client.name}</Text>
              <Text style={styles.muted}>{details.user.email}</Text>
              <Text style={styles.privacyText}>Permissões solicitadas: {details.scope}</Text>
              <Text style={styles.privacyText}>Retorno: {details.redirect_uri}</Text>
            </View>
            <Text style={styles.privacyText}>
              Ao autorizar, o ChatGPT poderá executar as Actions configuradas para consultar métricas e criar ou editar registros quando você pedir.
            </Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.row}>
              <Pressable style={styles.secondaryButton} onPress={() => void decide("deny")} disabled={loading}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={() => void decide("approve")} disabled={loading}>
                <Text style={styles.primaryButtonText}>{loading ? "Autorizando..." : "Autorizar"}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.errorText}>{error ?? "Não foi possível carregar esta autorização."}</Text>
            <Pressable style={styles.secondaryButton} onPress={() => redirectBrowserTo("/")}>
              <Text style={styles.secondaryButtonText}>Voltar</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function Header({
  user,
  onSave,
  onToggleTheme,
  onThemePaletteSelect,
  onNewFuel,
  onOpenAuth,
  onOpenHelp,
  onOpenPrivacy,
  onOpenUsers,
  onSignOut,
  authEmail,
  authName,
  showNewFuelButton
}: {
  user: User | null;
  onSave: (user: User) => void;
  onToggleTheme: () => void;
  onThemePaletteSelect: (palette: ThemePalette) => void;
  onNewFuel: () => void;
  onOpenAuth: () => void;
  onOpenHelp: () => void;
  onOpenPrivacy: () => void;
  onOpenUsers: () => void;
  onSignOut: () => void;
  authEmail: string | null;
  authName: string | null;
  showNewFuelButton: boolean;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [accountOpen, setAccountOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const { mode, styles, theme } = useThemeStyles();
  const isAdmin = authEmail?.toLowerCase() === "ericgomes@gmail.com";

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  function updateOwnName(nextName: string) {
    setName(nextName);
    const trimmed = nextName.trim();
    if (!trimmed || !user) {
      return;
    }

    onSave({ ...user, name: trimmed });
  }

  function finishNameEdition() {
    const trimmed = name.trim();
    if (!trimmed || !user) {
      setName(user?.name ?? "");
    }

    setEditingName(false);
  }

  if (user) {
    return (
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>LitroCerto</Text>
          </View>
          <View style={styles.headerTools}>
            <View style={styles.colorControlCluster}>
              <ThemePalettePicker onSelect={onThemePaletteSelect} />
              <Pressable style={styles.themeButton} onPress={onToggleTheme}>
                <Text style={styles.themeButtonText}>{mode === "light" ? "☾" : "☼"}</Text>
              </Pressable>
            </View>
            <View style={styles.accountBox}>
              <Pressable style={styles.accountButton} onPress={() => setAccountOpen((current) => !current)}>
                <View style={styles.accountIcon}>
                  <View style={styles.accountIconHead} />
                  <View style={styles.accountIconBody} />
                </View>
              </Pressable>
              {accountOpen ? (
                <>
                  <Pressable style={styles.menuDismissLayer} onPress={() => setAccountOpen(false)} />
                  <View style={styles.accountMenu}>
                    {authEmail ? (
                      <View style={styles.accountIdentity}>
                        {editingName ? (
                          <TextInput
                            value={name}
                            onChangeText={updateOwnName}
                            onBlur={finishNameEdition}
                            placeholder="Seu nome"
                            placeholderTextColor={theme.muted}
                            style={styles.accountNameInput}
                            autoFocus
                          />
                        ) : (
                          <Pressable onPress={() => setEditingName(true)}>
                            <Text style={styles.accountName}>{user.name}</Text>
                          </Pressable>
                        )}
                        <Text style={styles.accountEmail}>{authEmail}</Text>
                      </View>
                    ) : (
                      <View style={styles.accountIdentity}>
                        {editingName ? (
                          <TextInput
                            value={name}
                            onChangeText={updateOwnName}
                            onBlur={finishNameEdition}
                            placeholder="Seu nome"
                            placeholderTextColor={theme.muted}
                            style={styles.accountNameInput}
                            autoFocus
                          />
                        ) : (
                          <Pressable onPress={() => setEditingName(true)}>
                            <Text style={styles.accountName}>{user.name}</Text>
                          </Pressable>
                        )}
                        <Text style={styles.accountEmail}>Faça login para salvar seus dados.</Text>
                      </View>
                    )}
                    <Pressable
                      style={styles.accountMenuItem}
                      onPress={() => {
                        setAccountOpen(false);
                        onOpenHelp();
                      }}
                    >
                      <Text style={styles.accountMenuText}>Ajuda</Text>
                    </Pressable>
                    <Pressable
                      style={styles.accountMenuItem}
                      onPress={() => {
                        setAccountOpen(false);
                        onOpenPrivacy();
                      }}
                    >
                      <Text style={styles.accountMenuText}>Privacidade</Text>
                    </Pressable>
                    {isAdmin ? (
                      <Pressable
                        style={styles.accountMenuItem}
                        onPress={() => {
                          setAccountOpen(false);
                          onOpenUsers();
                        }}
                      >
                        <Text style={styles.accountMenuText}>Usuários</Text>
                      </Pressable>
                    ) : null}
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
                </>
              ) : null}
            </View>
          </View>
      </View>
      {showNewFuelButton ? (
        <Pressable style={styles.headerPrimaryButton} onPress={onNewFuel}>
          <View style={styles.headerPrimaryButtonCircle}>
            <Text style={styles.headerPrimaryButtonPlus}>+</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

  return (
    <View style={styles.onboarding}>
      <Text style={styles.brand}>LitroCerto</Text>
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

function ThemePalettePicker({ onSelect }: { onSelect: (palette: ThemePalette) => void }) {
  const { palette, styles } = useThemeStyles();
  const options: Array<{ value: ThemePalette; color: string; label: string }> = [
    { value: "green", color: "#178A4A", label: "Verde" },
    { value: "pink", color: "#D63384", label: "Rosa" },
    { value: "blue", color: "#1D6FD6", label: "Azul" },
    { value: "orange", color: "#D66A1D", label: "Laranja" }
  ];

  return (
    <View style={styles.paletteInline}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityLabel={`Tema ${option.label}`}
          style={[
            styles.paletteDot,
            { backgroundColor: option.color },
            option.value === palette && styles.paletteDotActive
          ]}
          onPress={() => onSelect(option.value)}
        />
      ))}
    </View>
  );
}

function HelpScreen({ onClose }: { onClose: () => void }) {
  const { styles } = useThemeStyles();

  return (
    <View style={styles.stack}>
      <Section title="Ajuda" rightAction={<Pressable style={styles.closeButton} onPress={onClose}><Text style={styles.closeButtonText}>×</Text></Pressable>}>
        <View style={styles.helpBlock}>
          <Text style={styles.itemTitle}>O que é?</Text>
          <Text style={styles.helpText}>Um app simples para registrar abastecimentos, descobrir o preço real por litro e entender quais postos valem mais a pena para você.</Text>
        </View>
        <View style={styles.helpBlock}>
          <Text style={styles.itemTitle}>Como usar?</Text>
          <Text style={styles.helpText}>Cadastre seus veículos, registre cada abastecimento e confirme o posto sugerido pelo app. O Litro Certo calcula preço por litro, gasto mensal, rankings e histórico.</Text>
        </View>
        <View style={styles.helpBlock}>
          <Text style={styles.itemTitle}>Quando usar?</Text>
          <Text style={styles.helpText}>Use sempre que abastecer para guardar valor, litros, posto e data. Se esquecer de registrar na hora, você pode lançar depois escolhendo a data correta.</Text>
        </View>
      </Section>
    </View>
  );
}

function PrivacyScreen({ onClose }: { onClose: () => void }) {
  const { styles } = useThemeStyles();

  return (
    <View style={styles.stack}>
      <Section title="Privacidade" rightAction={<Pressable style={styles.closeButton} onPress={onClose}><Text style={styles.closeButtonText}>×</Text></Pressable>}>
        <Text style={styles.helpText}>O Litro Certo não rastreia seus trajetos. A localização é usada no momento do registro para sugerir o posto próximo, e seus abastecimentos não aparecem para outros usuários do app.</Text>
        <Text style={styles.helpText}>Você não fica sendo acompanhado em segundo plano. A ideia é registrar combustível, não vigiar onde você anda.</Text>
      </Section>
    </View>
  );
}

function UsersAdmin({ onClose }: { onClose: () => void }) {
  const { styles } = useThemeStyles();
  const [summaries, setSummaries] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    appRepository.listUserSummaries()
      .then((items) => {
        if (cancelled) {
          return;
        }

        setSummaries(items);
        setError(null);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setError("Não foi possível carregar usuários. Confira as policies de admin no Supabase.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const totalVehicles = summaries.reduce((sum, item) => sum + item.vehicles, 0);
  const totalStations = summaries.reduce((sum, item) => sum + item.stations, 0);
  const totalFuelLogs = summaries.reduce((sum, item) => sum + item.fuelLogs, 0);

  return (
    <View style={styles.stack}>
      <Section title="Usuários" rightAction={<Pressable style={styles.closeButton} onPress={onClose}><Text style={styles.closeButtonText}>×</Text></Pressable>}>
        <View style={styles.grid}>
          <MetricCard label="Usuários" value={String(summaries.length)} />
          <MetricCard label="Abastecimentos" value={String(totalFuelLogs)} />
          <MetricCard label="Postos" value={String(totalStations)} />
          <MetricCard label="Veículos" value={String(totalVehicles)} />
        </View>
        <View style={styles.mapListDivider} />
        {loading ? <Text style={styles.muted}>Carregando usuários...</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!loading && !error && summaries.length === 0 ? (
          <Empty text="Nenhum usuário encontrado." />
        ) : null}
        {summaries.map((summary) => (
          <View key={summary.ownerId} style={styles.listItem}>
            <View style={styles.logInfo}>
              <Text style={styles.itemTitle}>{summary.name}</Text>
              <Text style={styles.muted}>{summary.email}</Text>
              <Text style={styles.muted}>{DateFormatter.compact(summary.updatedAt)}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.itemTitle}>{summary.vehicles} veículos</Text>
              <Text style={styles.muted}>{summary.stations} postos</Text>
              <Text style={styles.muted}>{summary.fuelLogs} abastecimentos</Text>
            </View>
          </View>
        ))}
      </Section>
    </View>
  );
}

function DemoBanner({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { styles } = useThemeStyles();

  return (
    <View style={styles.demoBanner}>
      <View style={styles.demoBannerTextGroup}>
        <Text style={styles.demoBannerTitle}>Você está vendo dados de exemplo</Text>
        <Text style={styles.demoBannerText}>Estes abastecimentos não são reais. Faça login para começar com seus próprios dados.</Text>
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
  const [open, setOpen] = useState(false);
  const activeCars = cars.filter((car) => activeCarIds.includes(car.id));
  const label = activeCars.length === cars.length
    ? "Todos veículos"
    : `${activeCars.length} ${activeCars.length === 1 ? "veículo" : "veículos"}`;

  return (
    <View style={styles.filterBar}>
      <Pressable style={styles.filterCompactButton} onPress={() => setOpen((current) => !current)}>
        <Text style={styles.filterCompactText}>
          {activeCars.slice(0, 2).map((car) => vehicleTypeIcon(car.vehicleType)).join(" ")} {label}
        </Text>
        <Text style={styles.filterCompactArrow}>{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open ? (
        <View style={styles.filterDropdown}>
          {cars.map((car) => {
            const active = activeCarIds.includes(car.id);
            return (
              <Pressable
                key={car.id}
                style={[styles.filterDropdownItem, active && styles.filterDropdownItemActive]}
                onPress={() => onToggleCar(car.id)}
              >
                <Text style={[styles.filterChipIcon, active && styles.filterChipTextActive]}>
                  {vehicleTypeIcon(car.vehicleType)}
                </Text>
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{car.nickname}</Text>
                <Text style={[styles.filterCheck, active && styles.filterChipTextActive]}>{active ? "✓" : ""}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
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
  const previousMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  const currentMonthLogs = logsForMonth(logs, visibleMonth);
  const previousMonthLogs = logsForMonth(logs, previousMonth);
  const last = currentMonthLogs[0];
  const previousMetrics = new DashboardCalculator({ user: null, cars, stations, logs, selectedCarId: null }, previousMonth).calculate();
  const previousLast = previousMonthLogs[0];
  const hasPreviousMonth = previousMonthLogs.length > 0;
  const monthTrend = hasPreviousMonth
    ? metricTrend(metrics.monthTotal, previousMetrics.monthTotal, "lower")
    : undefined;
  const priceTrend = hasPreviousMonth && last && previousLast
    ? metricTrend(last.pricePerLiter, previousLast.pricePerLiter, "lower")
    : undefined;
  const efficiencyTrend = hasPreviousMonth && metrics.averageKmPerLiter && previousMetrics.averageKmPerLiter
    ? metricTrend(metrics.averageKmPerLiter, previousMetrics.averageKmPerLiter, "higher")
    : undefined;
  const monthLabel = visibleMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <View style={styles.stack}>
      <Section title="">
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
          <MetricCard label="Gasto mês" value={formatCurrency(metrics.monthTotal)} small={metrics.monthTotal >= 100} trend={monthTrend} />
          <MetricCard label="Último R$/L" value={last ? formatCurrency(last.pricePerLiter) : ""} small trend={priceTrend} />
          <MetricCard label="Média km/L" value={metrics.averageKmPerLiter ? metrics.averageKmPerLiter.toFixed(1) : ""} small trend={efficiencyTrend} />
        </View>

        <View style={styles.mapListDivider} />
        <Text style={styles.sectionTitle}>Gasto mensal</Text>
        <Bars data={metrics.monthlyTotals} />

        <View style={styles.mapListDivider} />
        <Text style={styles.sectionTitle}>Média por combustível</Text>
        {metrics.fuelAverages.length === 0 ? (
          <Empty text="Registre abastecimentos para comparar combustíveis." />
        ) : (
          <View style={styles.fuelGrid}>
            {metrics.fuelAverages.map((fuel) => (
              <Pressable key={fuel.name} style={(state) => [styles.fuelCard, isHovered(state) && styles.listItemHover]}>
                <Text style={styles.itemTitle}>{fuel.name}</Text>
                <Text style={styles.itemTitle}>{formatCurrency(fuel.average)}/L</Text>
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
  const [odometerKm, setOdometerKm] = useState("");
  const [date, setDate] = useState(DateFormatter.inputDate(new Date().toISOString()));
  const [time, setTime] = useState(DateFormatter.inputTime(new Date().toISOString()));
  const [stationId, setStationId] = useState(stations[0]?.id ?? "");
  const [location, setLocation] = useState(fakeCurrentLocation);
  const [draftLog, setDraftLog] = useState<FuelLog | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<ToastNotice | null>(null);
  const [activeField, setActiveField] = useState("paid");
  const [dirty, setDirty] = useState(false);
  const currentCar = cars.find((car) => car.id === carId) ?? selectedCar;
  const fuelOptions = currentCar?.acceptedFuel?.length ? currentCar.acceptedFuel : fuels;

  useEffect(() => {
    if (!selectedCar || editingLog) {
      return;
    }

    setCarId(selectedCar.id);
    setFuel(selectedCar.defaultFuel);
  }, [editingLog, selectedCar?.id]);

  useEffect(() => {
    if (!currentCar || editingLog) {
      return;
    }

    if (currentCar.acceptedFuel.includes(fuel)) {
      return;
    }

    setFuel(currentCar.defaultFuel ?? currentCar.acceptedFuel[0] ?? "Gasolina comum");
  }, [carId, currentCar?.id, editingLog, fuel]);

  useEffect(() => {
    if (!editingLog) {
      const now = new Date().toISOString();
      setDate(DateFormatter.inputDate(now));
      setTime(DateFormatter.inputTime(now));
      return;
    }

    setCarId(editingLog.carId);
    setFuel(editingLog.fuel);
    setPaid(String(editingLog.paid).replace(".", ","));
    setLiters(String(editingLog.liters).replace(".", ","));
    setOdometerKm(editingLog.odometerKm ? String(editingLog.odometerKm).replace(".", ",") : "");
    setDate(DateFormatter.inputDate(editingLog.createdAt));
    setTime(DateFormatter.inputTime(editingLog.createdAt));
    setStationId(editingLog.stationId);
    setDraftLog(null);
    setSaveStatus(null);
    setDirty(false);
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
  const parsedOdometerKm = odometerKm.trim() ? MoneyParser.toNumber(odometerKm) : undefined;

  function buildPayload() {
    if (!currentCar) {
      setSaveStatus("Cadastre um veículo antes de registrar abastecimentos.");
      return undefined;
    }

    const paidNumber = MoneyParser.toNumber(paid);
    const litersNumber = MoneyParser.toNumber(liters);
    const odometerNumber = odometerKm.trim() ? MoneyParser.toNumber(odometerKm) : undefined;
    const fuelPrice = new FuelPrice(paidNumber, litersNumber);

    if (!fuelPrice.isValid()) {
      setSaveStatus("Preencha valor e litros para salvar automaticamente.");
      return undefined;
    }

    if (odometerKm.trim() && (!Number.isFinite(odometerNumber) || Number(odometerNumber) <= 0)) {
      setSaveStatus("Informe uma quilometragem válida.");
      return undefined;
    }

    const createdAt = DateInputParser.toIso(date, time);
    if (!createdAt) {
      setSaveStatus("Data inválida. Use DD-MM-AAAA e HH:MM:SS.");
      return undefined;
    }

    return {
      carId: currentCar.id,
      stationId,
      fuel,
      paid: paidNumber,
      liters: litersNumber,
      odometerKm: odometerNumber,
      createdAt,
      latitude: location.latitude,
      longitude: location.longitude
    };
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!dirty) {
        return;
      }

      const payload = buildPayload();
      if (!payload) {
        return;
      }

      if (editingLog) {
        onUpdate(FuelLogFactory.update(editingLog, payload));
        showFieldNotice(setNotice, "Abastecimento atualizado.", activeField);
        return;
      }

      if (draftLog) {
        const updatedDraft = FuelLogFactory.update(draftLog, payload);
        setDraftLog(updatedDraft);
        onUpdate(updatedDraft);
        showFieldNotice(setNotice, "Abastecimento atualizado.", activeField);
        return;
      }

      const newLog = FuelLogFactory.create(payload);
      setDraftLog(newLog);
      onSave(newLog);
      showFieldNotice(setNotice, "Abastecimento criado.", activeField);
    }, 450);

    return () => clearTimeout(timeout);
  }, [dirty, carId, fuel, paid, liters, odometerKm, date, time, stationId, location.latitude, location.longitude, editingLog?.id, draftLog?.id]);

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
        <SideToast notice={notice} />
        {cars.length === 0 ? (
          <Empty text="Cadastre um veículo pela tela Veículos para liberar o registro." />
        ) : (
          <>
            <View style={styles.fieldToastAnchor}>
              <View style={styles.inlineField}>
                <Text style={styles.inlineLabel}>Veículo</Text>
                <View style={styles.choiceFieldWrap}>
                  {cars.map((car) => (
                    <Choice
                      key={car.id}
                      label={car.nickname}
                      active={car.id === currentCar?.id}
                      onPress={() => {
                        setActiveField("car");
                        setDirty(true);
                        setCarId(car.id);
                        onCarSelect(car.id);
                      }}
                    />
                  ))}
                </View>
              </View>
              <FieldToast notice={notice} anchor="car" />
            </View>

            <View style={styles.fieldToastAnchor}>
              <View style={styles.inlineField}>
                <Text style={styles.inlineLabel}>Combustível</Text>
                <View style={styles.choiceFieldWrap}>
                  {fuelOptions.map((item) => (
                    <Choice
                      key={item}
                      label={item}
                      active={item === fuel}
                      onPress={() => {
                        setActiveField("fuel");
                        setDirty(true);
                        setFuel(item);
                      }}
                    />
                  ))}
                </View>
              </View>
              <FieldToast notice={notice} anchor="fuel" />
            </View>

            <View style={styles.fieldToastAnchor}>
              <Field
                label="Valor pago"
                value={paid}
                onFocus={() => setActiveField("paid")}
                onChangeText={(value) => {
                  setActiveField("paid");
                  setDirty(true);
                  setPaid(value);
                }}
                keyboardType="decimal-pad"
              />
              <FieldToast notice={notice} anchor="paid" />
            </View>
            <View style={styles.fieldToastAnchor}>
              <Field
                label="Litros"
                value={liters}
                onFocus={() => setActiveField("liters")}
                onChangeText={(value) => {
                  setActiveField("liters");
                  setDirty(true);
                  setLiters(value);
                }}
                keyboardType="decimal-pad"
              />
              <FieldToast notice={notice} anchor="liters" />
            </View>
            <View style={styles.fieldToastAnchor}>
              <Field
                label="Km atual"
                value={odometerKm}
                onFocus={() => setActiveField("odometerKm")}
                onChangeText={(value) => {
                  setActiveField("odometerKm");
                  setDirty(true);
                  setOdometerKm(value);
                }}
                keyboardType="decimal-pad"
              />
              <FieldToast notice={notice} anchor="odometerKm" />
            </View>

            <View style={styles.fieldToastAnchor}>
              <DateSelector
                label="Data"
                value={date}
                onFocus={() => setActiveField("date")}
                onChange={(value) => {
                  setActiveField("date");
                  setDirty(true);
                  setDate(value);
                }}
              />
              <FieldToast notice={notice} anchor="date" />
            </View>
            <View style={styles.fieldToastAnchor}>
              <TimeSelector
                label="Hora"
                value={time}
                onFocus={() => setActiveField("time")}
                onChange={(value) => {
                  setActiveField("time");
                  setDirty(true);
                  setTime(value);
                }}
              />
              <FieldToast notice={notice} anchor="time" />
            </View>

            <View style={styles.fieldToastAnchor}>
              <View style={styles.inlineField}>
                <Text style={styles.inlineLabel}>Posto</Text>
                <View style={styles.choiceFieldWrap}>
                  {stations.map((station) => (
                    <Choice
                      key={station.id}
                      label={station.name}
                      active={station.id === stationId}
                      onPress={() => {
                        setActiveField("station");
                        setDirty(true);
                        setStationId(station.id);
                      }}
                    />
                  ))}
                </View>
              </View>
              <FieldToast notice={notice} anchor="station" />
            </View>
            <Text style={styles.muted}>Localização fake de teste: posto mais próximo selecionado pelo app.</Text>

            <View style={styles.result}>
              <Text style={styles.label}>Preço real por litro</Text>
              <Text style={styles.bigValue}>{Number.isFinite(price) ? formatCurrency(price) : "R$ 0"}</Text>
              <Text style={styles.muted}>
                {parsedOdometerKm ? `Km atual: ${parsedOdometerKm.toLocaleString("pt-BR")} km` : "Informe a km atual para calcular km/L nos próximos abastecimentos."}
              </Text>
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
  onNew,
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
  onNew: () => void;
  onEdit: (logId: string) => void;
  onCancelEdit: () => void;
  onCarSelect: (id: string) => void;
  onSave: (log: FuelLog) => void;
  onUpdate: (log: FuelLog) => void;
}) {
  const { styles } = useThemeStyles();
  const [mapExpanded, setMapExpanded] = useState(false);
  const logNumbers = logNumberMap(allLogs);
  const numberedLogs = logs.map((log) => ({ log, number: logNumbers.get(log.id) ?? 0 }));

  return (
    <View style={styles.stack}>
      <Section
        title="Abastecimentos"
        rightAction={
          <Pressable style={styles.addButton} onPress={onNew}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        }
      >
        <View style={[styles.mapPanel, mapExpanded && styles.mapPanelExpanded]}>
          <FuelMap numberedLogs={numberedLogs} stations={stations} />
          <Pressable
            accessibilityLabel={mapExpanded ? "Reduzir mapa" : "Maximizar mapa"}
            style={styles.mapExpandButton}
            onPress={() => setMapExpanded((current) => !current)}
          >
            <Text style={styles.mapHeaderIconText}>{mapExpanded ? "↙" : "⛶"}</Text>
          </Pressable>
        </View>

        <View style={styles.mapListDivider} />
        {numberedLogs.length === 0 ? (
          <Empty text="Registre abastecimentos para construir sua lista." />
        ) : (
          numberedLogs.map(({ log, number }) => {
            const station = stations.find((item) => item.id === log.stationId);
            const car = cars.find((item) => item.id === log.carId);
            const efficiency = FuelEfficiencyCalculator.valueForLog(log, allLogs);
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
                      {station?.name ?? "Posto"} - {car?.nickname ?? "Veículo"} - {log.fuel}
                    </Text>
                    <Text style={styles.muted}>
                      {log.odometerKm ? `${log.odometerKm.toLocaleString("pt-BR")} km` : "Km não informada"}
                      {efficiency ? ` - ${efficiency.kmPerLiter.toFixed(1)} km/L` : ""}
                    </Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.itemTitle}>{formatCurrency(log.pricePerLiter)}/L</Text>
                    <Text style={styles.muted}>
                      {formatCurrency(log.paid)} - {log.liters.toFixed(2)} L
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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

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
    resizeObserverRef.current = new ResizeObserver(() => {
      window.setTimeout(() => map.invalidateSize(), 0);
    });
    resizeObserverRef.current.observe(mapRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) {
      return;
    }

    window.setTimeout(() => map.invalidateSize(), 0);
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

function StationOverviewMap({ stations }: { stations: Station[] }) {
  const numberedLogs = stations.map((station, index) => ({
    number: index + 1,
    log: {
      id: `station-map-${station.id}`,
      carId: "",
      stationId: station.id,
      fuel: "Gasolina comum" as FuelType,
      paid: 1,
      liters: 1,
      pricePerLiter: 1,
      createdAt: new Date().toISOString(),
      latitude: station.latitude,
      longitude: station.longitude
    }
  }));

  return <FuelMap numberedLogs={numberedLogs} stations={stations} />;
}

function Cars({
  cars,
  logs,
  stations,
  selectedCarId,
  onEditLog,
  onSelect,
  onSave,
  onUpdate,
  onDeleteCar
}: {
  cars: Car[];
  logs: FuelLog[];
  stations: Station[];
  selectedCarId: string | null;
  onEditLog: (logId: string) => void;
  onSelect: (id: string) => void;
  onSave: (car: Car) => void;
  onUpdate: (car: Car) => void;
  onDeleteCar: (carId: string) => void;
}) {
  const { styles } = useThemeStyles();
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [selectedDetailsCarId, setSelectedDetailsCarId] = useState<string | null>(null);
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
      <Section
        title="Veículos"
        rightAction={
          <Pressable style={styles.addButton} onPress={openNewForm}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        }
      >
        {editingCarId === "new" ? (
          <View style={styles.inlineEditGroup}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Adicionar veículo</Text>
              <Pressable style={styles.closeButton} onPress={closeForm}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.inlineForm}>
              <CarEditor onSave={onSave} onUpdate={onUpdate} onDelete={onDeleteCar} onCancel={closeForm} />
            </View>
            <View style={styles.mapListDivider} />
          </View>
        ) : null}

        {cars.length === 0 ? (
          <Empty text="Cadastre seu primeiro veículo." />
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
                    {[car.vehicleType ?? "Carro", car.brand, car.model].filter(Boolean).join(" - ")}
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

        <View style={styles.mapListDivider} />
        <Text style={styles.sectionTitle}>Veículos que mais gastaram</Text>
        {carRanking.length === 0 ? (
          <Empty text="O ranking nasce a partir dos abastecimentos registrados." />
        ) : (
          <>
            {carRanking.map((item, index) => (
              <React.Fragment key={item.car.id}>
                <Pressable
                  style={(state) => [
                    styles.listItem,
                    item.car.id === selectedCarId && styles.selectedItem,
                    isHovered(state) && styles.listItemHover
                  ]}
                  onPress={() =>
                    setSelectedDetailsCarId((current) => (current === item.car.id ? null : item.car.id))
                  }
                >
                  <View style={styles.rankingInfo}>
                    <Text style={styles.itemTitle}>
                      {index + 1}. {item.car.nickname}
                    </Text>
                    <Text style={styles.muted}>{item.count} abastecimentos</Text>
                  </View>
                  <Text style={styles.rankingPrice}>{formatCurrency(item.total)}</Text>
                </Pressable>
                {selectedDetailsCarId === item.car.id ? (
                  <CarFuelLogDetails carId={item.car.id} logs={logs} allLogs={logs} stations={stations} onEditLog={onEditLog} />
                ) : null}
              </React.Fragment>
            ))}
          </>
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
  const [vehicleType, setVehicleType] = useState<VehicleType>(car?.vehicleType ?? "Carro");
  const [nickname, setNickname] = useState(car?.nickname ?? "");
  const [brand, setBrand] = useState(car?.brand ?? "");
  const [model, setModel] = useState(car?.model ?? "");
  const [acceptedFuel, setAcceptedFuel] = useState<FuelType[]>(car?.acceptedFuel?.length ? car.acceptedFuel : [car?.defaultFuel ?? "Gasolina comum"]);
  const [defaultFuel, setDefaultFuel] = useState<FuelType>(car?.defaultFuel ?? "Gasolina comum");
  const [status, setStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<ToastNotice | null>(null);
  const [activeField, setActiveField] = useState("nickname");

  useEffect(() => {
    if (!car) {
      return;
    }

    setVehicleType(car.vehicleType ?? "Carro");
    setNickname(car.nickname);
    setBrand(car.brand);
    setModel(car.model);
    setAcceptedFuel(car.acceptedFuel?.length ? car.acceptedFuel : [car.defaultFuel]);
    setDefaultFuel(car.defaultFuel);
    setDraftCar(null);
  }, [car?.id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!nickname.trim()) {
        setStatus("Preencha o apelido para salvar.");
        return;
      }

      if (car) {
        onUpdate(CarFactory.update(car, { vehicleType, nickname, brand, model, acceptedFuel, defaultFuel }));
        showFieldNotice(setNotice, "Veículo atualizado.", activeField);
        return;
      }

      if (draftCar) {
        const updated = CarFactory.update(draftCar, { vehicleType, nickname, brand, model, acceptedFuel, defaultFuel });
        setDraftCar(updated);
        onUpdate(updated);
        showFieldNotice(setNotice, "Veículo atualizado.", activeField);
        return;
      }

      const created = CarFactory.create({ vehicleType, nickname, brand, model, acceptedFuel, defaultFuel });
      setDraftCar(created);
      onSave(created);
      showFieldNotice(setNotice, "Veículo criado.", activeField);
    }, 450);

    return () => clearTimeout(timeout);
  }, [vehicleType, nickname, brand, model, acceptedFuel, defaultFuel, car?.id, draftCar?.id]);

  useEffect(() => {
    if (acceptedFuel.includes(defaultFuel)) {
      return;
    }

    setDefaultFuel(acceptedFuel[0] ?? "Gasolina comum");
  }, [acceptedFuel, defaultFuel]);

  function updateCarField(anchor: string, update: (value: string) => void) {
    return (value: string) => {
      setActiveField(anchor);
      update(value);
    };
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
      <View style={styles.fieldToastAnchor}>
        <View style={styles.inlineField}>
          <Text style={styles.inlineLabel}>Tipo</Text>
          <View style={styles.choiceFieldWrap}>
            {vehicleTypes.map((type) => (
              <Choice
                key={type}
                label={type}
                active={vehicleType === type}
                onPress={() => {
                  setActiveField("vehicleType");
                  setVehicleType(type);
                }}
              />
            ))}
          </View>
        </View>
        <FieldToast notice={notice} anchor="vehicleType" />
      </View>
      <View style={styles.fieldToastAnchor}>
        <Field label="Apelido" value={nickname} onFocus={() => setActiveField("nickname")} onChangeText={updateCarField("nickname", setNickname)} />
        <FieldToast notice={notice} anchor="nickname" />
      </View>
      <View style={styles.fieldToastAnchor}>
        <Field label="Marca" value={brand} onFocus={() => setActiveField("brand")} onChangeText={updateCarField("brand", setBrand)} />
        <View style={styles.inlineField}>
          <Text style={styles.inlineLabel} />
          <View style={styles.choiceFieldWrap}>
            {brazilVehicleBrands.map((item) => (
              <Choice
                key={item}
                label={item}
                active={brand.trim().toLowerCase() === item.toLowerCase()}
                onPress={() => {
                  setActiveField("brand");
                  setBrand(item);
                }}
              />
            ))}
          </View>
        </View>
        <FieldToast notice={notice} anchor="brand" />
      </View>
      <View style={styles.fieldToastAnchor}>
        <Field label="Modelo" value={model} onFocus={() => setActiveField("model")} onChangeText={updateCarField("model", setModel)} />
        <FieldToast notice={notice} anchor="model" />
      </View>
      <View style={styles.fieldToastAnchor}>
        <View style={styles.inlineField}>
          <Text style={styles.inlineLabel}>Combustíveis</Text>
          <View style={styles.choiceFieldWrap}>
            {fuels.map((fuel) => (
              <Choice
                key={fuel}
                label={fuel}
                active={acceptedFuel.includes(fuel)}
                onPress={() => {
                  setActiveField("acceptedFuel");
                  toggleAcceptedFuel(fuel);
                }}
              />
            ))}
          </View>
        </View>
        <FieldToast notice={notice} anchor="acceptedFuel" />
      </View>
      <Pressable style={styles.deleteButton} onPress={confirmDelete}>
        <Text style={styles.deleteButtonText}>Apagar veículo</Text>
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
  const [mapExpanded, setMapExpanded] = useState(false);

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
      <Section
        title="Postos"
        rightAction={
          <Pressable style={styles.addButton} onPress={openNewForm}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        }
      >
        {editingStationId === "new" ? (
          <View style={styles.inlineEditGroup}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Adicionar posto</Text>
              <Pressable style={styles.closeButton} onPress={() => setEditingStationId(null)}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.inlineForm}>
              <StationEditor
                onSave={onSave}
                onUpdate={onUpdate}
                onDelete={onDeleteStation}
                onCancel={() => setEditingStationId(null)}
              />
            </View>
            <View style={styles.mapListDivider} />
          </View>
        ) : null}

        <View style={[styles.mapPanel, mapExpanded && styles.mapPanelExpanded]}>
          <StationOverviewMap stations={stations} />
          <Pressable
            accessibilityLabel={mapExpanded ? "Reduzir mapa" : "Maximizar mapa"}
            style={styles.mapExpandButton}
            onPress={() => setMapExpanded((current) => !current)}
          >
            <Text style={styles.mapHeaderIconText}>{mapExpanded ? "↙" : "⛶"}</Text>
          </Pressable>
        </View>

        <View style={styles.mapListDivider} />
        {stations.length === 0 ? (
          <Empty text="Cadastre seu primeiro posto." />
        ) : (
          stations.map((station) => (
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
          ))
        )}

        <View style={styles.mapListDivider} />
        <Text style={styles.sectionTitle}>Postos mais baratos</Text>
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
  const [status, setStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<ToastNotice | null>(null);
  const [activeField, setActiveField] = useState("name");

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
        showFieldNotice(setNotice, "Posto atualizado.", activeField);
        return;
      }

      if (draftStation) {
        setDraftStation(payload);
        onUpdate(payload);
        showFieldNotice(setNotice, "Posto atualizado.", activeField);
        return;
      }

      setDraftStation(payload);
      onSave(payload);
      showFieldNotice(setNotice, "Posto criado.", activeField);
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

  function updateStationField(anchor: string, update: (value: string) => void) {
    return (value: string) => {
      setActiveField(anchor);
      update(value);
    };
  }

  return (
    <View style={styles.formStack}>
      <View style={styles.fieldToastAnchor}>
        <Field label="Nome" value={name} onFocus={() => setActiveField("name")} onChangeText={updateStationField("name", setName)} />
        <FieldToast notice={notice} anchor="name" />
      </View>
      <View style={styles.fieldToastAnchor}>
        <Field label="Endereço" value={address} onFocus={() => setActiveField("address")} onChangeText={updateStationField("address", setAddress)} />
        <FieldToast notice={notice} anchor="address" />
      </View>
      <View style={styles.fieldToastAnchor}>
        <Field label="Cidade" value={city} onFocus={() => setActiveField("city")} onChangeText={updateStationField("city", setCity)} />
        <FieldToast notice={notice} anchor="city" />
      </View>
      <View style={styles.fieldToastAnchor}>
        <View style={styles.inlineField}>
          <Text style={styles.inlineLabel}>Estado</Text>
          <StateSelect
            value={stateName}
            onFocus={() => setActiveField("state")}
            onChange={(value) => {
              setActiveField("state");
              setStateName(value);
            }}
          />
        </View>
        <FieldToast notice={notice} anchor="state" />
      </View>
      <Pressable style={styles.deleteButton} onPress={confirmDelete}>
        <Text style={styles.deleteButtonText}>Apagar posto</Text>
      </Pressable>
    </View>
  );
}

function Tabs({ active, onChange }: { active: Tab | null; onChange: (tab: Tab) => void }) {
  const { styles } = useThemeStyles();
  const tabs: Tab[] = ["Resumo", "Abastecimentos", "Postos", "Veículos"];
  const labels: Record<Tab, string> = {
    Resumo: "Resumo",
    Abastecimentos: "Abastecimentos",
    Postos: "Postos",
    Veículos: "Veículos"
  };

  return (
    <View style={styles.tabsBar}>
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, { flexGrow: labels[tab].length, flexBasis: 0 }, active === tab && styles.activeTab]}
            onPress={() => onChange(tab)}
          >
            <Text style={[styles.tabText, active === tab && styles.activeTabText]}>{labels[tab]}</Text>
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

type MetricTrend = {
  label: string;
  status: "good" | "bad" | "neutral";
};

function MetricCard({
  label,
  value,
  small,
  trend
}: {
  label: string;
  value: string;
  small?: boolean;
  trend?: MetricTrend;
}) {
  const { styles } = useThemeStyles();

  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, small && styles.metricValueSmall]}>{value}</Text>
      {trend ? (
        <Text
          style={[
            styles.metricTrend,
            trend.status === "good" && styles.metricTrendGood,
            trend.status === "bad" && styles.metricTrendBad
          ]}
        >
          {trend.label}
        </Text>
      ) : null}
    </View>
  );
}

function logsForMonth(logs: FuelLog[], referenceDate: Date) {
  return logs.filter((log) => {
    const date = new Date(log.createdAt);
    return date.getMonth() === referenceDate.getMonth() && date.getFullYear() === referenceDate.getFullYear();
  });
}

function metricTrend(current: number, previous: number, betterWhen: "higher" | "lower"): MetricTrend | undefined {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) {
    return undefined;
  }

  const change = ((current - previous) / previous) * 100;
  const rounded = Math.abs(change).toLocaleString("pt-BR", {
    maximumFractionDigits: 0
  });
  const improved = betterWhen === "higher" ? change > 0 : change < 0;
  const status = Math.abs(change) < 0.5 ? "neutral" : improved ? "good" : "bad";
  const prefix = change > 0 ? "+" : change < 0 ? "-" : "";

  return {
    label: `${prefix}${rounded}% vs mês anterior`,
    status
  };
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
            <Text style={styles.rankingPrice}>{formatCurrency(row.average)}/L</Text>
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
      <Text style={styles.itemTitle}>Abastecimentos</Text>
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
              <Text style={styles.muted}>{car?.nickname ?? "Veículo"} - {log.fuel}</Text>
            </View>
            <Text style={styles.itemTitle}>{formatCurrency(log.pricePerLiter)}/L</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CarFuelLogDetails({
  carId,
  logs,
  allLogs,
  stations,
  onEditLog
}: {
  carId: string;
  logs: FuelLog[];
  allLogs: FuelLog[];
  stations: Station[];
  onEditLog?: (logId: string) => void;
}) {
  const { styles } = useThemeStyles();
  const carLogs = logs.filter((log) => log.carId === carId);
  const logNumbers = logNumberMap(allLogs);

  if (carLogs.length === 0) {
    return (
      <View style={styles.stationDetails}>
        <Text style={styles.itemTitle}>Abastecimentos</Text>
        <Empty text="Nenhum abastecimento registrado para este veículo." />
      </View>
    );
  }

  return (
    <View style={styles.stationDetails}>
      <Text style={styles.itemTitle}>Abastecimentos</Text>
      {carLogs.map((log) => {
        const station = stations.find((item) => item.id === log.stationId);
        return (
          <Pressable
            key={log.id}
            style={(state) => [styles.detailRow, isHovered(state) && styles.listItemHover]}
            onPress={() => onEditLog?.(log.id)}
          >
            <View>
              <Text style={styles.itemTitle}>#{logNumbers.get(log.id)} - {DateFormatter.compact(log.createdAt)}</Text>
              <Text style={styles.muted}>{station?.name ?? "Posto"} - {log.fuel}</Text>
            </View>
            <Text style={styles.itemTitle}>{formatCurrency(log.pricePerLiter)}/L</Text>
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

function DateSelector({
  label,
  value,
  onChange,
  onFocus
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
}) {
  const { styles } = useThemeStyles();
  const [day = "", month = "", year = ""] = value.split("-");
  const now = new Date();
  const parsedDay = clampNumber(day, 1, 31, now.getDate());
  const parsedMonth = clampNumber(month, 1, 12, now.getMonth() + 1);
  const parsedYear = clampNumber(year, 1970, 2100, now.getFullYear());
  const maxDay = new Date(parsedYear, parsedMonth, 0).getDate();

  function updateDate(nextDay: number, nextMonth: number, nextYear: number) {
    const safeMonth = clamp(nextMonth, 1, 12);
    const safeYear = clamp(nextYear, 1970, 2100);
    const safeDay = clamp(nextDay, 1, new Date(safeYear, safeMonth, 0).getDate());
    onChange(`${pad2(safeDay)}-${pad2(safeMonth)}-${safeYear}`);
  }

  return (
    <View style={styles.inlineField}>
      <Text style={styles.inlineLabel}>{label}</Text>
      <View style={styles.dateSelector}>
        <NumberSelect
          value={parsedDay}
          min={1}
          max={maxDay}
          digits={2}
          onFocus={onFocus}
          onChange={(nextDay) => updateDate(nextDay, parsedMonth, parsedYear)}
        />
        <NumberSelect
          value={parsedMonth}
          min={1}
          max={12}
          digits={2}
          onFocus={onFocus}
          onChange={(nextMonth) => updateDate(parsedDay, nextMonth, parsedYear)}
        />
        <NumberSelect
          value={parsedYear}
          min={1970}
          max={2100}
          digits={4}
          wide
          onFocus={onFocus}
          onChange={(nextYear) => updateDate(parsedDay, parsedMonth, nextYear)}
        />
      </View>
    </View>
  );
}

function TimeSelector({
  label,
  value,
  onChange,
  onFocus
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
}) {
  const { styles } = useThemeStyles();
  const [hour = "", minute = "", second = ""] = value.split(":");
  const parsedHour = clampNumber(hour, 0, 23, new Date().getHours());
  const parsedMinute = clampNumber(minute, 0, 59, new Date().getMinutes());
  const parsedSecond = clampNumber(second, 0, 59, 0);

  function updateTime(nextHour: number, nextMinute: number) {
    onChange(`${pad2(clamp(nextHour, 0, 23))}:${pad2(clamp(nextMinute, 0, 59))}:${pad2(parsedSecond)}`);
  }

  return (
    <View style={styles.inlineField}>
      <Text style={styles.inlineLabel}>{label}</Text>
      <View style={styles.timeSelector}>
        <NumberSelect
          value={parsedHour}
          min={0}
          max={23}
          digits={2}
          onFocus={onFocus}
          onChange={(nextHour) => updateTime(nextHour, parsedMinute)}
        />
        <NumberSelect
          value={parsedMinute}
          min={0}
          max={59}
          digits={2}
          onFocus={onFocus}
          onChange={(nextMinute) => updateTime(parsedHour, nextMinute)}
        />
      </View>
    </View>
  );
}

function NumberSelect({
  value,
  min,
  max,
  digits,
  wide,
  onChange,
  onFocus
}: {
  value: number;
  min: number;
  max: number;
  digits: number;
  wide?: boolean;
  onChange: (value: number) => void;
  onFocus?: () => void;
}) {
  const { styles, theme } = useThemeStyles();
  const options = range(min, max);

  function selectValue(nextValue: number) {
    onFocus?.();
    onChange(clamp(nextValue, min, max));
  }

  if (Platform.OS === "web") {
    return React.createElement(
      "select",
      {
        value: String(value),
        onFocus,
        onChange: (event: { target: { value: string } }) => selectValue(Number(event.target.value)),
        style: StyleSheet.flatten([styles.numberSelect, wide && styles.numberSelectWide]) as never
      },
      options.map((item) =>
        React.createElement(
          "option",
          { key: item, value: String(item) },
          String(item).padStart(digits, "0")
        )
      )
    );
  }

  return (
    <TextInput
      value={String(value).padStart(digits, "0")}
      onFocus={onFocus}
      onChangeText={(text) => {
        const parsed = Number(text.replace(/\D/g, ""));
        if (!Number.isFinite(parsed)) {
          return;
        }

        selectValue(parsed);
      }}
      placeholder={digits === 4 ? "AAAA" : "00"}
      placeholderTextColor={theme.muted}
      keyboardType="number-pad"
      maxLength={digits}
      style={[styles.numberSelect, wide && styles.numberSelectWide]}
    />
  );
}

function StateSelect({
  value,
  onChange,
  onFocus
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
}) {
  const { styles, theme } = useThemeStyles();
  const normalizedValue = value.trim().toUpperCase();

  function selectValue(nextValue: string) {
    onFocus?.();
    onChange(nextValue);
  }

  if (Platform.OS === "web") {
    return React.createElement(
      "select",
      {
        value: brazilStates.includes(normalizedValue) ? normalizedValue : "",
        onFocus,
        onChange: (event: { target: { value: string } }) => selectValue(event.target.value),
        style: StyleSheet.flatten(styles.stateSelect) as never
      },
      [
        React.createElement("option", { key: "empty", value: "" }, "UF"),
        ...brazilStates.map((item) =>
          React.createElement("option", { key: item, value: item }, item)
        )
      ]
    );
  }

  return (
    <TextInput
      value={normalizedValue}
      onFocus={onFocus}
      onChangeText={(text) => selectValue(text.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2))}
      placeholder="UF"
      placeholderTextColor={theme.muted}
      autoCapitalize="characters"
      maxLength={2}
      style={styles.stateSelect}
    />
  );
}

function range(min: number, max: number) {
  return Array.from({ length: max - min + 1 }, (_item, index) => min + index);
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampNumber(value: string, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed === 0 && value.trim() === "") {
    return clamp(fallback, min, max);
  }

  return clamp(parsed, min, max);
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

type ToastNotice = {
  id: number;
  message: string;
  anchor: string;
};

function showFieldNotice(
  setNotice: React.Dispatch<React.SetStateAction<ToastNotice | null>>,
  message: string,
  anchor = "form"
) {
  setNotice({ id: Date.now(), message, anchor });
}

function FieldToast({ notice, anchor }: { notice: ToastNotice | null; anchor: string }) {
  if (notice?.anchor !== anchor) {
    return null;
  }

  return <SideToast notice={notice} />;
}

function SideToast({ notice }: { notice: ToastNotice | null }) {
  const { styles } = useThemeStyles();
  const translateX = useRef(new Animated.Value(36)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!notice) {
      return;
    }

    translateX.setValue(36);
    opacity.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true })
      ]),
      Animated.delay(1100),
      Animated.parallel([
        Animated.timing(translateX, { toValue: 36, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true })
      ])
    ]).start();
  }, [notice?.id]);

  if (!notice) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.sideToast, { opacity, transform: [{ translateX }] }]}
    >
      <Text style={styles.sideToastText}>{notice.message}</Text>
    </Animated.View>
  );
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
    padding: 14,
    gap: 14,
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
    padding: 14,
    gap: 10,
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
    fontSize: 16,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  authTabTextActive: {
    color: "#FFFFFF"
  },
  authDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 4
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.border
  },
  authDividerText: {
    color: theme.muted,
    fontSize: 14,
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
    fontSize: 15,
    lineHeight: 20
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
    fontSize: 18,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 7,
    zIndex: 20
  },
  headerTop: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    zIndex: 30
  },
  brandBlock: {
    flex: 1,
    minWidth: 0
  },
  headerSecondaryActions: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    zIndex: 40
  },
  headerTools: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexShrink: 0,
    zIndex: 40
  },
  colorControlCluster: {
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    paddingRight: 3,
    gap: 6
  },
  headerPrimaryButton: {
    position: "relative",
    width: "100%",
    minHeight: 80,
    borderRadius: 0,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    zIndex: 1
  },
  headerPrimaryButtonCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 0
  },
  headerPrimaryButtonPlus: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 44
  },
  headerPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 15,
    fontFamily: theme.fontFamily
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
    fontSize: 13,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  demoBanner: {
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.primary,
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
    fontSize: 17,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily
  },
  demoBannerText: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: theme.fontFamily
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
    fontSize: 14,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  accountBox: {
    position: "relative",
    zIndex: 1000,
    flexShrink: 0
  },
  accountButton: {
    width: 34,
    minHeight: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border
  },
  accountButtonText: {
    color: theme.primary,
    fontSize: 18,
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 2,
    zIndex: 1001,
    elevation: 20
  },
  menuDismissLayer: {
    position: "fixed" as never,
    top: -1000,
    right: -1000,
    bottom: -1000,
    left: -1000,
    backgroundColor: "transparent",
    zIndex: 1000
  },
  accountEmail: {
    color: theme.muted,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    fontFamily: theme.fontFamily
  },
  accountIdentity: {
    gap: 3,
    alignItems: "flex-end",
    paddingHorizontal: 2,
    paddingBottom: 2
  },
  accountName: {
    color: theme.text,
    textAlign: "right",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20,
    fontFamily: theme.headingFontFamily
  },
  accountNameInput: {
    minHeight: 34,
    alignSelf: "stretch",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.input,
    color: theme.text,
    textAlign: "right",
    paddingHorizontal: 9,
    fontSize: 16,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily
  },
  accountMenuItem: {
    minHeight: 32,
    justifyContent: "center",
    alignItems: "flex-end",
    backgroundColor: "transparent",
    paddingVertical: 6,
    paddingHorizontal: 2
  },
  accountMenuText: {
    color: theme.text,
    textAlign: "right",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    alignItems: "center"
  },
  filterCompactButton: {
    minHeight: 34,
    minWidth: 164,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  filterCompactText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  filterCompactArrow: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  filterDropdown: {
    width: "100%",
    maxWidth: 360,
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    padding: 6,
    gap: 5,
    zIndex: 15
  },
  filterDropdownItem: {
    minHeight: 36,
    borderRadius: 7,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.surfaceAlt
  },
  filterDropdownItemActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  filterScroll: {
    gap: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    flexGrow: 1
  },
  filterChip: {
    minHeight: 34,
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
    fontSize: 15,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  filterChipIcon: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  filterChipTextActive: {
    color: "#FFFFFF"
  },
  filterCheck: {
    marginLeft: "auto",
    color: theme.primary,
    fontSize: 16,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  onboarding: {
    padding: 14,
    gap: 10,
    backgroundColor: theme.background
  },
  brand: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.text,
    fontFamily: theme.headingFontFamily
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.text,
    fontFamily: theme.headingFontFamily
  },
  signal: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.primary
  },
  themeButton: {
    width: 30,
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0
  },
  themeButtonText: {
    color: theme.primary,
    fontWeight: "900",
    fontSize: 20,
    lineHeight: 22,
    fontFamily: theme.fontFamily
  },
  paletteInline: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  paletteDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)"
  },
  paletteDotActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.text
  },
  privacyText: {
    color: theme.muted,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: theme.fontFamily
  },
  helpBlock: {
    gap: 5
  },
  helpText: {
    color: theme.text,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: theme.fontFamily
  },
  content: {
    padding: 8,
    paddingBottom: 88
  },
  stack: {
    gap: 10
  },
  section: {
    position: "relative",
    backgroundColor: "transparent",
    borderRadius: 8,
    padding: 0,
    gap: 9,
    borderWidth: 0,
    borderColor: "transparent"
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: theme.text,
    fontFamily: theme.headingFontFamily
  },
  sectionHint: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: theme.fontFamily
  },
  sectionTitleRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  sectionActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
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
    fontWeight: "900",
    fontFamily: theme.fontFamily
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
    fontWeight: "800",
    fontFamily: theme.fontFamily
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
    fontSize: 20,
    fontWeight: "800"
  },
  grid: {
    flexDirection: "row",
    gap: 8
  },
  monthSwitcher: {
    minHeight: 48,
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
    fontSize: 18,
    fontWeight: "900",
    textTransform: "capitalize",
    fontFamily: theme.headingFontFamily
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
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  metricCard: {
    flex: 1,
    minHeight: 82,
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
    gap: 4
  },
  metricLabel: {
    color: theme.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 15,
    fontFamily: theme.fontFamily,
    textAlign: "center"
  },
  metricValue: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 21,
    fontFamily: theme.headingFontFamily,
    textAlign: "center"
  },
  metricValueSmall: {
    fontSize: 16,
    lineHeight: 19
  },
  metricTrend: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 15,
    fontWeight: "900",
    fontFamily: theme.fontFamily,
    textAlign: "center"
  },
  metricTrendGood: {
    color: "#178A4A"
  },
  metricTrendBad: {
    color: "#D94A4A"
  },
  bigValue: {
    color: theme.text,
    fontSize: 32,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily
  },
  detailBlock: {
    gap: 4
  },
  muted: {
    color: theme.muted,
    fontSize: 15,
    fontFamily: theme.fontFamily
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.input,
    color: theme.text,
    fontSize: 18,
    fontFamily: theme.fontFamily
  },
  label: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  field: {
    flex: 1,
    gap: 6
  },
  formStack: {
    position: "relative",
    gap: 8
  },
  fieldToastAnchor: {
    position: "relative"
  },
  inlineField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44
  },
  inlineLabel: {
    width: 88,
    color: theme.text,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: theme.fontFamily
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
  timeSelector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    justifyContent: "flex-start"
  },
  numberSelect: {
    width: 56,
    minHeight: 36,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.input,
    color: theme.text,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  numberSelectWide: {
    width: 76
  },
  stateSelect: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.input,
    color: theme.text,
    paddingHorizontal: 10,
    fontSize: 17,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  dateInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.input,
    color: theme.text,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  datePartInput: {
    width: 54,
    minHeight: 40,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.input,
    color: theme.text,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: theme.fontFamily
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
    fontWeight: "900",
    fontFamily: theme.headingFontFamily
  },
  stepperInput: {
    width: 92,
    minHeight: 40,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.input,
    color: theme.text,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: theme.fontFamily
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
    fontSize: 16,
    fontWeight: "900",
    fontFamily: theme.fontFamily
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
    paddingVertical: 8,
    paddingHorizontal: 9,
    backgroundColor: theme.surface
  },
  choiceActive: {
    backgroundColor: theme.primaryDark,
    borderColor: theme.primaryDark
  },
  choiceText: {
    color: theme.text,
    fontWeight: "700",
    fontSize: 15,
    fontFamily: theme.fontFamily
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
    fontSize: 18,
    fontWeight: "800",
    fontFamily: theme.fontFamily
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
    fontSize: 18,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  ghostButton: {
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  ghostButtonText: {
    color: theme.muted,
    fontSize: 16,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  result: {
    backgroundColor: theme.primarySoft,
    borderRadius: 8,
    padding: 12
  },
  consentSummary: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceAlt,
    padding: 10,
    gap: 6
  },
  autosaveText: {
    color: theme.muted,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  errorText: {
    color: "#D94A4A",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: theme.fontFamily
  },
  listItem: {
    minHeight: 64,
    borderRadius: 8,
    padding: 10,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
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
    gap: 8
  },
  fuelCard: {
    width: "48%",
    minHeight: 68,
    borderRadius: 8,
    padding: 10,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: "center",
    alignItems: "center",
    gap: 6
  },
  selectedItem: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft
  },
  historyItem: {
    borderRadius: 8,
    padding: 10,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 8
  },
  stationDetails: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: theme.border
  },
  detailRow: {
    minHeight: 54,
    borderRadius: 8,
    padding: 9,
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
    fontSize: 16,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily,
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
    fontSize: 15,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily
  },
  itemTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: "800",
    fontFamily: theme.headingFontFamily
  },
  rankingInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  rankingPrice: {
    width: 112,
    textAlign: "right",
    color: theme.text,
    fontSize: 17,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily,
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
    fontSize: 14,
    fontFamily: theme.fontFamily
  },
  empty: {
    color: theme.muted,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: theme.fontFamily
  },
  bars: {
    height: 148,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end"
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: 8
  },
  barTrack: {
    width: "100%",
    height: 106,
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
    fontSize: 13,
    fontWeight: "700",
    fontFamily: theme.fontFamily
  },
  mapPanel: {
    height: 230,
    borderRadius: 8,
    backgroundColor: theme.map,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
    position: "relative"
  },
  mapPanelExpanded: {
    height: Platform.OS === "web" ? "calc(100vh - 240px)" as never : 560,
    minHeight: 420
  },
  mapHeaderIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border
  },
  mapHeaderIconText: {
    color: theme.primary,
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  mapExpandButton: {
    position: "absolute",
    right: 8,
    top: 8,
    zIndex: 2000,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3
  },
  mapExpandButtonText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "900",
    fontFamily: theme.fontFamily
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
    fontWeight: "900",
    fontFamily: theme.headingFontFamily
  },
  insight: {
    color: theme.text,
    lineHeight: 23,
    fontSize: 17,
    fontWeight: "600",
    fontFamily: theme.fontFamily
  },
  tabsBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 68,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    alignItems: "center"
  },
  tabs: {
    width: "100%",
    maxWidth: 470,
    paddingHorizontal: 7,
    flexDirection: "row",
    gap: 5
  },
  tab: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7
  },
  activeTab: {
    backgroundColor: theme.primary
  },
  tabText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    fontFamily: theme.fontFamily
  },
  activeTabText: {
    color: "#FFFFFF"
  },
  sideToast: {
    position: "absolute",
    top: 6,
    right: 6,
    maxWidth: 240,
    borderRadius: 999,
    backgroundColor: theme.mode === "dark" ? "#DDF3E5" : "#102018",
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 30
  },
  sideToastText: {
    color: theme.mode === "dark" ? "#102018" : "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    fontFamily: theme.fontFamily
  }
  });
}
