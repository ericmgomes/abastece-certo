import React, { useEffect, useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View
} from "react-native";
import { Car, ThemeMode, ThemePalette, User, VehicleType } from "../domain";

export type AppTab = "Resumo" | "Abastecimentos" | "Postos" | "Veículos" | "IA";

type ChromeStyles = Record<string, any>;
type ChromeTheme = { muted: string; primary: string; primaryDark: string; text: string };

export function Header({
  user,
  onSave,
  onOpenSummary,
  onToggleTheme,
  onThemePaletteSelect,
  onNewFuel,
  onOpenAuth,
  onOpenHelp,
  onOpenPrivacy,
  onOpenUsers,
  onOpenPremium,
  onOpenCustomerCenter,
  onSignOut,
  authEmail,
  isPremium,
  subscriptionLoading,
  showNewFuelButton,
  cars,
  activeCarIds,
  showCarFilter,
  onToggleCar,
  mode,
  palette,
  styles,
  theme
}: {
  user: User | null;
  onSave: (user: User) => void;
  onOpenSummary: () => void;
  onToggleTheme: () => void;
  onThemePaletteSelect: (palette: ThemePalette) => void;
  onNewFuel: () => void;
  onOpenAuth: () => void;
  onOpenHelp: () => void;
  onOpenPrivacy: () => void;
  onOpenUsers: () => void;
  onOpenPremium: () => void;
  onOpenCustomerCenter: () => void;
  onSignOut: () => void;
  authEmail: string | null;
  isPremium: boolean;
  subscriptionLoading: boolean;
  showNewFuelButton: boolean;
  cars: Car[];
  activeCarIds: string[];
  showCarFilter: boolean;
  onToggleCar: (carId: string) => void;
  mode: ThemeMode;
  palette: ThemePalette;
  styles: ChromeStyles;
  theme: ChromeTheme;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [accountOpen, setAccountOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
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

  if (!user) {
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

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Pressable style={styles.brandBlock} onPress={onOpenSummary}>
          <HeaderLogo mode={mode} styles={styles} />
        </Pressable>
        <View style={styles.headerTools}>
          <Pressable style={styles.themeButton} onPress={onToggleTheme}>
            <Text style={styles.themeButtonText}>{mode === "light" ? "☾" : "☼"}</Text>
          </Pressable>
          <View style={styles.accountBox}>
            <Pressable style={styles.accountButton} onPress={() => setAccountOpen((current) => !current)}>
              <View style={styles.accountIcon}>
                <View style={styles.accountIconHead} />
                <View style={styles.accountIconBody} />
              </View>
            </Pressable>
            {showCarFilter ? (
              <HeaderCarFilter cars={cars} activeCarIds={activeCarIds} onToggleCar={onToggleCar} styles={styles} />
            ) : null}
            {accountOpen ? (
              <>
                <Pressable style={styles.menuDismissLayer} onPress={() => setAccountOpen(false)} />
                <View style={styles.accountMenu}>
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
                    <Text style={styles.accountEmail}>
                      {authEmail ?? "Faça login para salvar seus dados."}
                    </Text>
                  </View>
                  <View style={styles.accountThemeRow}>
                    <Text style={styles.accountThemeLabel}>Tema</Text>
                    <ThemePalettePicker palette={palette} styles={styles} onSelect={onThemePaletteSelect} />
                  </View>
                  <AccountMenuItem label="Ajuda" styles={styles} onPress={() => {
                    setAccountOpen(false);
                    onOpenHelp();
                  }} />
                  <AccountMenuItem label="Privacidade" styles={styles} onPress={() => {
                    setAccountOpen(false);
                    onOpenPrivacy();
                  }} />
                  {isAdmin ? (
                    <AccountMenuItem label="Usuários" styles={styles} onPress={() => {
                      setAccountOpen(false);
                      onOpenUsers();
                    }} />
                  ) : null}
                  {authEmail ? (
                    <AccountMenuItem label="Sair" styles={styles} onPress={() => {
                      setAccountOpen(false);
                      onSignOut();
                    }} />
                  ) : (
                    <AccountMenuItem label="Login / criar conta" styles={styles} onPress={() => {
                      setAccountOpen(false);
                      onOpenAuth();
                    }} />
                  )}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </View>
      {showNewFuelButton ? (
        <View />
      ) : null}
    </View>
  );
}

function HeaderLogo({ mode, styles }: { mode: ThemeMode; styles: ChromeStyles }) {
  return (
    <View style={styles.headerLogo}>
      <View style={styles.headerLogoMark}>
        <Text style={styles.headerLogoCheck}>✓</Text>
      </View>
      <View style={styles.headerLogoTextRow}>
        <Text style={[styles.headerLogoText, mode === "dark" ? styles.headerLogoTextDark : null]}>Litro</Text>
        <Text style={[styles.headerLogoText, styles.headerLogoTextAccent]}>Certo</Text>
      </View>
    </View>
  );
}

export function ThemePalettePicker({
  palette,
  styles,
  onSelect
}: {
  palette: ThemePalette;
  styles: ChromeStyles;
  onSelect: (palette: ThemePalette) => void;
}) {
  const options: Array<{ value: ThemePalette; color: string; label: string }> = [
    { value: "blue", color: "#1D6FD6", label: "Azul" },
    { value: "clean", color: "#17C6C3", label: "Clean" },
    { value: "green", color: "#178A4A", label: "Verde" },
    { value: "pink", color: "#D63384", label: "Rosa" },
    { value: "orange", color: "#D66A1D", label: "Laranja" }
  ];

  return (
    <View style={styles.paletteInline}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={[
            styles.paletteDot,
            { backgroundColor: option.color },
            option.value === palette && styles.paletteDotActive
          ]}
          onPress={() => onSelect(option.value)}
        >
          <Text style={styles.visuallyHidden}>Tema {option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Tabs({
  active,
  onChange,
  onNewFuel,
  showNewFuelButton,
  styles
}: {
  active: AppTab | null;
  onChange: (tab: AppTab) => void;
  onNewFuel: () => void;
  showNewFuelButton: boolean;
  styles: ChromeStyles;
}) {
  const tabs: AppTab[] = ["Resumo", "IA", "Abastecimentos", "Postos", "Veículos"];
  const labels: Record<AppTab, string> = {
    Resumo: "Resumo",
    Abastecimentos: "Abastec.",
    Postos: "Postos",
    Veículos: "Veículos",
    IA: "IA"
  };
  return (
    <View style={styles.tabsBar}>
      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const isFuelTab = tab === "Abastecimentos";
          const raisedFuelAction = isFuelTab && showNewFuelButton;

          return (
            <Pressable
              key={tab}
              style={(state) => [
                styles.tab,
                raisedFuelAction && styles.tabWithRaisedAction,
                { flexGrow: labels[tab].length, flexBasis: 0 },
                isHovered(state) && active !== tab && !raisedFuelAction && styles.tabHover,
                active === tab && !raisedFuelAction && styles.activeTab
              ]}
              onPress={() => onChange(tab)}
            >
              {raisedFuelAction ? (
                <Pressable
                  accessibilityLabel="Novo abastecimento"
                  style={(state) => [
                    styles.tabRaisedAction,
                    isHovered(state) && styles.tabRaisedActionHover
                  ]}
                  onPress={(event) => {
                    event.stopPropagation();
                    onNewFuel();
                  }}
                >
                  <Text style={styles.tabRaisedActionText}>+</Text>
                </Pressable>
              ) : null}
              {raisedFuelAction ? (
                <View style={styles.tabRaisedSpacer} />
              ) : (
                <TabIcon tab={tab} active={active === tab} styles={styles} />
              )}
              <Text
                style={[
                  styles.tabText,
                  active === tab && !raisedFuelAction && styles.activeTabText,
                  active === tab && raisedFuelAction && styles.tabRaisedActiveText
                ]}
              >
                {labels[tab]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TabIcon({ tab, active, styles }: { tab: AppTab; active: boolean; styles: ChromeStyles }) {
  const colorStyle = active ? styles.tabIconShapeActive : styles.tabIconShape;
  if (tab === "Resumo") {
    return (
      <View style={styles.tabMiniIcon}>
        <View style={[styles.tabBarColumn, styles.tabBarColumnShort, colorStyle]} />
        <View style={[styles.tabBarColumn, styles.tabBarColumnTall, colorStyle]} />
        <View style={[styles.tabBarColumn, styles.tabBarColumnMid, colorStyle]} />
      </View>
    );
  }

  if (tab === "IA") {
    return <Text style={[styles.tabIcon, active && styles.activeTabText]}>✦</Text>;
  }

  if (tab === "Abastecimentos") {
    return (
      <View style={styles.tabMiniIcon}>
        <View style={[styles.tabPumpBody, colorStyle]}>
          <View style={styles.tabPumpWindow} />
        </View>
        <View style={[styles.tabPumpHose, colorStyle]} />
      </View>
    );
  }

  if (tab === "Postos") {
    return (
      <View style={styles.tabMiniIcon}>
        <View style={[styles.tabPinHead, colorStyle]} />
        <View style={[styles.tabPinPoint, colorStyle]} />
      </View>
    );
  }

  return (
    <View style={styles.tabMiniIcon}>
      <View style={[styles.tabCarBody, colorStyle]} />
      <View style={[styles.tabCarRoof, colorStyle]} />
      <View style={[styles.tabCarWheel, styles.tabCarWheelLeft, colorStyle]} />
      <View style={[styles.tabCarWheel, styles.tabCarWheelRight, colorStyle]} />
    </View>
  );
}

function isHovered(state: unknown) {
  const maybeState = state as { hovered?: boolean; pressed?: boolean };
  return Boolean(maybeState.hovered || maybeState.pressed);
}

function HeaderCarFilter({
  cars,
  activeCarIds,
  onToggleCar,
  styles
}: {
  cars: Car[];
  activeCarIds: string[];
  onToggleCar: (carId: string) => void;
  styles: ChromeStyles;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.headerFilterBox}>
      <Pressable
        accessibilityLabel="Filtrar veículos"
        style={styles.headerFilterButton}
        onPress={() => setOpen((current) => !current)}
      >
        <Text style={styles.wheelsIcon}>◉</Text>
      </Pressable>
      {open ? (
        <>
          <Pressable style={styles.menuDismissLayer} onPress={() => setOpen(false)} />
          <View style={styles.headerFilterMenu}>
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
        </>
      ) : null}
    </View>
  );
}

function AccountMenuItem({
  label,
  styles,
  onPress
}: {
  label: string;
  styles: ChromeStyles;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.accountMenuItem} onPress={onPress}>
      <Text style={styles.accountMenuText}>{label}</Text>
    </Pressable>
  );
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
