import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  AppState,
  DashboardCalculator,
  FuelLog,
  ThemePalette,
  ThemeMode,
  User
} from "./src/domain";
import { SupabaseAppRepository } from "./src/repositories/SupabaseAppRepository";
import { supabase } from "./src/supabaseClient";
import { FormControlsProvider } from "./src/components/formControls";
import { AppTab, Header, Tabs, ThemePalettePicker } from "./src/components/AppChrome";
import { Empty, LayoutProvider, Section } from "./src/components/layout";
import {
  AssistantMessage,
  AssistantScreen,
  initialAssistantMessages
} from "./src/features/assistant/AssistantScreen";
import { AuthScreen } from "./src/features/auth/AuthScreen";
import { OAuthAuthorizeRequest, OAuthConsentScreen } from "./src/features/auth/OAuthConsentScreen";
import { RegisterFuel } from "./src/features/fuelLogs/RegisterFuel";
import { StationMap } from "./src/features/fuelLogs/FuelLogMapScreen";
import { Cars } from "./src/features/vehicles/VehiclesScreen";
import { Stations } from "./src/features/stations/StationsScreen";
import { SummaryScreen } from "./src/features/summary/SummaryScreen";
import { DemoBanner, HelpScreen, PrivacyScreen, UsersAdmin } from "./src/features/utility/UtilityScreens";
import { AppStyles, buildTheme, createStyles, Theme } from "./src/theme/appTheme";
import {
  demoState,
  nextLogSequence,
  sortFuelLogs,
  starterState,
  validFilteredCarIds,
  validSelectedCarId,
  withDemoData,
  withStableLogSequences
} from "./src/state/appStateHelpers";
import { initAnalytics, trackEvent, trackScreen } from "./src/analytics";
import { useRevenueCat } from "./src/revenuecat/useRevenueCat";

type Tab = AppTab;
type UtilityScreen = "help" | "privacy" | "users" | null;
const storageKey = "litro-certo:v1";
const guestStorageKey = "litro-certo:guest:v1";
const appRepository = new SupabaseAppRepository();
function getAuthUserName(metadata: Record<string, unknown> | null | undefined) {
  const possibleName = metadata?.full_name ?? metadata?.name;
  if (typeof possibleName !== "string") {
    return null;
  }

  const trimmedName = possibleName.trim();
  return trimmedName || null;
}

function currentBrowserUrl() {
  const location = (globalThis as unknown as { location?: Location }).location;
  return location?.href;
}

function oauthAuthorizeRequestFromUrl(): OAuthAuthorizeRequest | null {
  const location = (globalThis as unknown as { location?: Location }).location;
  if (!location || location.pathname !== "/oauth/consent") {
    return null;
  }

  const params = new URLSearchParams(location.search);
  const responseType = params.get("response_type");
  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  if (!responseType || !clientId || !redirectUri) {
    return null;
  }

  return {
    response_type: responseType,
    client_id: clientId,
    redirect_uri: redirectUri,
    state: params.get("state") ?? undefined,
    scope: params.get("scope") ?? "openid email profile",
    code_challenge: params.get("code_challenge") ?? undefined,
    code_challenge_method: params.get("code_challenge_method") ?? undefined,
    resource: params.get("resource") ?? undefined
  };
}

function isOAuthConsentRoute() {
  const location = (globalThis as unknown as { location?: Location }).location;
  return location?.pathname === "/oauth/consent";
}

type ThemeContextValue = {
  mode: ThemeMode;
  palette: ThemePalette;
  theme: Theme;
  styles: AppStyles;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function useThemeStyles() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("ThemeContext indisponivel");
  }

  return value;
}

export default function App() {
  const [state, setState] = useState<AppState>(starterState);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authName, setAuthName] = useState<string | null>(null);
  const [authScreenOpen, setAuthScreenOpen] = useState(false);
  const [utilityScreen, setUtilityScreen] = useState<UtilityScreen>(null);
  const [tab, setTab] = useState<Tab>("Resumo");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>(initialAssistantMessages);
  const [fuelFormMode, setFuelFormMode] = useState<"closed" | "new" | "edit">("closed");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const scrollRef = useRef<ScrollView>(null);
  const saveErrorShownRef = useRef(false);
  const themeMode = state.themeMode ?? "light";
  const themePalette = state.themePalette ?? "blue";
  const theme = useMemo(() => buildTheme(themeMode, themePalette), [themeMode, themePalette]);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const oauthConsentRoute = isOAuthConsentRoute();
  const oauthRequest = oauthAuthorizeRequestFromUrl();
  const revenueCat = useRevenueCat(ownerId);

  useEffect(() => {
    if (Platform.OS === "web") {
      document.title = "LitroCerto";
      initAnalytics();
      trackEvent("app_loaded");
    }
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const screenName = authScreenOpen
      ? "Login"
      : oauthConsentRoute
        ? "OAuth consent"
        : utilityScreen === "help"
          ? "Ajuda"
          : utilityScreen === "privacy"
            ? "Privacidade"
            : utilityScreen === "users"
              ? "Usuários"
              : fuelFormMode === "new"
                ? "Novo abastecimento"
                : fuelFormMode === "edit"
                  ? "Editar abastecimento"
                  : tab;

    trackScreen(screenName, {
      auth_state: ownerId ? "authenticated" : "guest"
    });
  }, [authScreenOpen, fuelFormMode, oauthConsentRoute, ownerId, ready, tab, utilityScreen]);

  useEffect(() => {
    if (tab !== "IA") {
      return;
    }

    const timeoutId = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timeoutId);
  }, [assistantMessages.length, tab]);

  useEffect(() => {
    if (!revenueCat.lastError) {
      return;
    }

    Alert.alert("Assinatura", revenueCat.lastError);
  }, [revenueCat.lastError]);

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
        if (oauthConsentRoute) {
          setState(emptyAuthenticatedState(sessionName, sessionEmail));
          setOwnerId(sessionUser.id);
          setAuthScreenOpen(false);
          return;
        }

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
      if (oauthConsentRoute) {
        setState(emptyAuthenticatedState(sessionName, sessionEmail));
        setOwnerId(sessionUser.id);
        setAuthScreenOpen(false);
        return;
      }

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

  function saveFuelLog(log: FuelLog) {
    trackEvent("fuel_log_created", {
      auth_state: ownerId ? "authenticated" : "guest",
      fuel_type: log.fuel,
      has_odometer: Boolean(log.odometerKm)
    });
    setState((current) => ({
      ...current,
      cars: updateCarCurrentOdometer(current.cars, log),
      logs: sortFuelLogs([{ ...log, sequence: nextLogSequence(current.logs) }, ...current.logs]),
      selectedCarId: log.carId,
      filteredCarIds: current.filteredCarIds?.includes(log.carId)
        ? current.filteredCarIds
        : [...(current.filteredCarIds ?? []), log.carId]
    }));
  }

  function saveUser(user: User) {
    trackEvent("profile_updated", {
      auth_state: ownerId ? "authenticated" : "guest"
    });
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
    trackEvent("month_changed", {
      direction: offset < 0 ? "previous" : "next",
      auth_state: ownerId ? "authenticated" : "guest"
    });
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function toggleTheme() {
    trackEvent("theme_mode_changed", {
      mode: themeMode === "light" ? "dark" : "light"
    });
    updateState({ themeMode: themeMode === "light" ? "dark" : "light" });
  }

  function selectThemePalette(nextPalette: ThemePalette) {
    trackEvent("theme_palette_changed", {
      palette: nextPalette
    });
    updateState({ themePalette: nextPalette });
  }

  async function signOut() {
    trackEvent("logout");
    await revenueCat.logout();
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

    trackEvent("vehicle_filter_changed", {
      selected_vehicle_count: next.length
    });
    updateState({ filteredCarIds: next });
  }

  function openNewFuelForm() {
    trackEvent("fuel_log_form_opened", {
      mode: "new",
      auth_state: ownerId ? "authenticated" : "guest"
    });
    setEditingLogId(null);
    setFuelFormMode("new");
    setUtilityScreen(null);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 0);
  }

  function openEditFuelForm(logId: string) {
    if (editingLogId === logId) {
      closeFuelForm();
      return;
    }

    trackEvent("fuel_log_form_opened", {
      mode: "edit",
      auth_state: ownerId ? "authenticated" : "guest"
    });
    setEditingLogId(logId);
    setFuelFormMode("edit");
    setTab("Abastecimentos");
  }

  function closeFuelForm() {
    if (fuelFormMode !== "closed") {
      trackEvent("fuel_log_form_closed", {
        mode: fuelFormMode,
        auth_state: ownerId ? "authenticated" : "guest"
      });
    }
    setEditingLogId(null);
    setFuelFormMode("closed");
  }

  function changeTab(nextTab: Tab) {
    closeFuelForm();
    setUtilityScreen(null);
    trackEvent("tab_selected", {
      tab: nextTab,
      auth_state: ownerId ? "authenticated" : "guest"
    });
    setTab(nextTab);
  }

  function renderContent() {
    if (utilityScreen === "help") {
      return <HelpScreen onClose={() => setUtilityScreen(null)} styles={styles} components={{ Section }} />;
    }

    if (utilityScreen === "privacy") {
      return <PrivacyScreen onClose={() => setUtilityScreen(null)} styles={styles} components={{ Section }} />;
    }

    if (utilityScreen === "users") {
      return (
        <UsersAdmin
          onClose={() => setUtilityScreen(null)}
          listUserSummaries={() => appRepository.listUserSummaries()}
          styles={styles}
          components={{ Section, Empty }}
        />
      );
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
          onSave={saveFuelLog}
          onUpdate={(log) =>
            {
              trackEvent("fuel_log_updated", {
                auth_state: ownerId ? "authenticated" : "guest",
                fuel_type: log.fuel,
                has_odometer: Boolean(log.odometerKm)
              });
              setState((current) => ({
                ...current,
                cars: updateCarCurrentOdometer(current.cars, log),
                logs: sortFuelLogs(current.logs.map((item) => (item.id === log.id ? log : item))),
                selectedCarId: log.carId,
                filteredCarIds: current.filteredCarIds?.includes(log.carId)
                  ? current.filteredCarIds
                  : [...(current.filteredCarIds ?? []), log.carId]
              }));
            }
          }
          styles={styles}
          Section={Section}
          Empty={Empty}
        />
      );
    }

    if (tab === "Veículos") {
      return (
        <Cars
          cars={state.cars}
          logs={state.logs}
          stations={state.stations}
          onEditLog={openEditFuelForm}
          onSelect={(selectedCarId) => updateState({ selectedCarId })}
          onSave={(car) =>
            {
              trackEvent("vehicle_created", {
                auth_state: ownerId ? "authenticated" : "guest",
                vehicle_type: car.vehicleType
              });
              setState((current) => ({
                ...current,
                cars: [...current.cars, car],
                selectedCarId: current.selectedCarId ?? car.id,
                filteredCarIds: [...(current.filteredCarIds ?? []), car.id]
              }));
            }
          }
          onUpdate={(car) =>
            {
              trackEvent("vehicle_updated", {
                auth_state: ownerId ? "authenticated" : "guest",
                vehicle_type: car.vehicleType
              });
              setState((current) => ({
                ...current,
                cars: current.cars.map((item) => (item.id === car.id ? car : item)),
                selectedCarId: car.id
              }));
            }
          }
          onDeleteCar={(carId) =>
            {
              trackEvent("vehicle_deleted", {
                auth_state: ownerId ? "authenticated" : "guest"
              });
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
              });
            }
          }
          styles={styles}
          components={{
            Section,
            Empty
          }}
        />
      );
    }

    if (tab === "IA") {
      return (
        <AssistantScreen
          state={state}
          messages={assistantMessages}
          setMessages={setAssistantMessages}
          onOpenAuth={() => {
            trackEvent("login_opened", {
              source: "assistant"
            });
            setAuthScreenOpen(true);
          }}
          onSaveFuelLog={saveFuelLog}
          Section={Section}
          styles={styles}
          theme={theme}
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
            {
              trackEvent("station_created", {
                auth_state: ownerId ? "authenticated" : "guest"
              });
              setState((current) => ({
                ...current,
                stations: [...current.stations, station]
              }));
            }
          }
          onUpdate={(station) =>
            {
              trackEvent("station_updated", {
                auth_state: ownerId ? "authenticated" : "guest"
              });
              setState((current) => ({
                ...current,
                stations: current.stations.map((item) => (item.id === station.id ? station : item))
              }));
            }
          }
          onDeleteStation={(stationId) =>
            {
              trackEvent("station_deleted", {
                auth_state: ownerId ? "authenticated" : "guest"
              });
              setState((current) => ({
                ...current,
                stations: current.stations.filter((station) => station.id !== stationId),
                logs: current.logs.filter((log) => log.stationId !== stationId)
              }));
            }
          }
          styles={styles}
          theme={theme}
          components={{
            Section,
            Empty
          }}
        />
      );
    }

    if (fuelFormMode === "closed" && tab === "Resumo") {
      return (
        <SummaryScreen
          logs={filteredLogs}
          cars={state.cars}
          stations={state.stations}
          metrics={metrics}
          visibleMonth={visibleMonth}
          onPreviousMonth={() => moveMonth(-1)}
          onNextMonth={() => moveMonth(1)}
          activeCarIds={activeCarIds}
          onToggleCar={toggleFilterCar}
          onEditLog={openEditFuelForm}
          styles={styles}
          Section={Section}
          Empty={Empty}
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
          onSave={saveFuelLog}
          onUpdate={(log) =>
            {
              trackEvent("fuel_log_updated", {
                auth_state: ownerId ? "authenticated" : "guest",
                fuel_type: log.fuel,
                has_odometer: Boolean(log.odometerKm)
              });
              setState((current) => ({
                ...current,
                cars: updateCarCurrentOdometer(current.cars, log),
                logs: sortFuelLogs(current.logs.map((item) => (item.id === log.id ? log : item))),
                selectedCarId: log.carId,
                filteredCarIds: current.filteredCarIds?.includes(log.carId)
                  ? current.filteredCarIds
                  : [...(current.filteredCarIds ?? []), log.carId]
              }));
            }
          }
          styles={styles}
          theme={theme}
          Section={Section}
          Empty={Empty}
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
              mode={themeMode}
              styles={styles}
              theme={theme}
              PalettePicker={({ onSelect }) => (
                <ThemePalettePicker palette={themePalette} styles={styles} onSelect={onSelect} />
              )}
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
              request={oauthRequest}
              authenticated={Boolean(ownerId)}
              onOpenAuth={() => setAuthScreenOpen(true)}
              userEmail={authEmail}
              styles={styles}
            />
          </SafeAreaView>
        </ThemeContext.Provider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={{ mode: themeMode, palette: themePalette, theme, styles }}>
        <LayoutProvider value={{ styles }}>
          <FormControlsProvider value={{ styles, theme }}>
            <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
            <SafeAreaView style={styles.shell}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.keyboard}
              >
                <Header
                  user={state.user}
                  onSave={saveUser}
                  onOpenSummary={() => changeTab("Resumo")}
                  onToggleTheme={toggleTheme}
                  onThemePaletteSelect={selectThemePalette}
                  onNewFuel={openNewFuelForm}
                  onOpenAuth={() => {
                    trackEvent("login_opened", {
                      source: "header"
                    });
                    setAuthScreenOpen(true);
                  }}
                  onOpenHelp={() => {
                    closeFuelForm();
                    trackEvent("help_opened");
                    setUtilityScreen("help");
                  }}
                  onOpenPrivacy={() => {
                    closeFuelForm();
                    trackEvent("privacy_opened");
                    setUtilityScreen("privacy");
                  }}
                  onOpenUsers={() => {
                    closeFuelForm();
                    trackEvent("users_admin_opened");
                    setUtilityScreen("users");
                  }}
                  onOpenPremium={() => {
                    trackEvent("premium_opened", {
                      is_premium: revenueCat.isPremium
                    });
                    void revenueCat.openPaywall();
                  }}
                  onOpenCustomerCenter={() => {
                    trackEvent("subscription_management_opened");
                    void revenueCat.openCustomerCenter();
                  }}
                  onSignOut={confirmSignOut}
                  authEmail={authEmail}
                  isPremium={revenueCat.isPremium}
                  subscriptionLoading={revenueCat.loading || !revenueCat.ready}
                  showNewFuelButton={fuelFormMode !== "new"}
                  cars={state.cars}
                  activeCarIds={activeCarIds}
                  showCarFilter={false}
                  onToggleCar={toggleFilterCar}
                  mode={themeMode}
                  palette={themePalette}
                  styles={styles}
                  theme={theme}
                />
                <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                  {renderContent()}
                </ScrollView>
                {fuelFormMode !== "new" ? (
                  <Pressable style={styles.floatingFuelButton} onPress={openNewFuelForm}>
                    <Text style={styles.floatingFuelButtonText}>+</Text>
                  </Pressable>
                ) : null}
                {!ownerId ? (
                  <DemoBanner onOpenAuth={() => {
                    trackEvent("login_opened", {
                      source: "demo_banner"
                    });
                    setAuthScreenOpen(true);
                  }} styles={styles} />
                ) : null}
                <Tabs active={utilityScreen || fuelFormMode === "new" ? null : tab} onChange={changeTab} styles={styles} />
              </KeyboardAvoidingView>
            </SafeAreaView>
          </FormControlsProvider>
        </LayoutProvider>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}

function updateCarCurrentOdometer(cars: AppState["cars"], log: FuelLog) {
  if (typeof log.odometerKm !== "number" || !Number.isFinite(log.odometerKm)) {
    return cars;
  }

  const nextOdometerKm = log.odometerKm;
  return cars.map((car) => {
    if (car.id !== log.carId) {
      return car;
    }

    const currentKm = car.currentOdometerKm;
    if (typeof currentKm === "number" && currentKm > nextOdometerKm) {
      return car;
    }

    return {
      ...car,
      currentOdometerKm: nextOdometerKm
    };
  });
}

