import React, { createContext, useContext } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

type FormControlStyles = Record<string, any>;
type FormControlTheme = { muted: string };
type FormControlContextValue = {
  styles: FormControlStyles;
  theme: FormControlTheme;
};

const FormControlContext = createContext<FormControlContextValue | null>(null);

export function FormControlsProvider({
  value,
  children
}: {
  value: FormControlContextValue;
  children: React.ReactNode;
}) {
  return (
    <FormControlContext.Provider value={value}>
      {children}
    </FormControlContext.Provider>
  );
}

export function Field(props: React.ComponentProps<typeof TextInput> & { label: string; compact?: boolean }) {
  const { styles, theme } = useFormControls();
  const { label, compact, style, ...inputProps } = props;
  return (
    <View style={[styles.inlineField, compact && styles.compactInlineField]}>
      <Text style={[styles.inlineLabel, compact && styles.compactInlineLabel]}>{label}</Text>
      <TextInput placeholderTextColor={theme.muted} style={[styles.input, style]} {...inputProps} />
    </View>
  );
}

export function BrandSelect({
  value,
  onChange,
  onFocus
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
}) {
  const { styles, theme } = useFormControls();
  const normalizedValue = value.trim();
  const selectedValue = brazilVehicleBrands.find((brand) => brand.toLowerCase() === normalizedValue.toLowerCase()) ?? "";

  function selectValue(nextValue: string) {
    onFocus?.();
    onChange(nextValue);
  }

  if (Platform.OS === "web") {
    return (
      <View style={styles.inlineField}>
        <Text style={styles.inlineLabel}>Marca</Text>
        {React.createElement(
          "select",
          {
            value: selectedValue,
            onFocus,
            onChange: (event: { target: { value: string } }) => selectValue(event.target.value),
            style: StyleSheet.flatten(styles.input) as never
          },
          [
            React.createElement("option", { key: "empty", value: "" }, "Selecionar"),
            ...brazilVehicleBrands.map((item) =>
              React.createElement("option", { key: item, value: item }, item)
            )
          ]
        )}
      </View>
    );
  }

  return (
    <Field
      label="Marca"
      value={value}
      onFocus={onFocus}
      onChangeText={selectValue}
      placeholder="Marca"
      placeholderTextColor={theme.muted}
    />
  );
}

export function DateSelector({
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
  const { styles } = useFormControls();
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

export function TimeSelector({
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
  const { styles } = useFormControls();
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

export function DateTimeSelector({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  onFocus
}: {
  label: string;
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onFocus?: () => void;
}) {
  const { styles } = useFormControls();
  const [day = "", month = "", year = ""] = date.split("-");
  const [hour = "", minute = "", second = ""] = time.split(":");
  const now = new Date();
  const parsedDay = clampNumber(day, 1, 31, now.getDate());
  const parsedMonth = clampNumber(month, 1, 12, now.getMonth() + 1);
  const parsedYear = clampNumber(year, 1970, 2100, now.getFullYear());
  const parsedHour = clampNumber(hour, 0, 23, now.getHours());
  const parsedMinute = clampNumber(minute, 0, 59, now.getMinutes());
  const parsedSecond = clampNumber(second, 0, 59, 0);
  const maxDay = new Date(parsedYear, parsedMonth, 0).getDate();

  function updateDate(nextDay: number, nextMonth: number, nextYear: number) {
    const safeMonth = clamp(nextMonth, 1, 12);
    const safeYear = clamp(nextYear, 1970, 2100);
    const safeDay = clamp(nextDay, 1, new Date(safeYear, safeMonth, 0).getDate());
    onDateChange(`${pad2(safeDay)}-${pad2(safeMonth)}-${safeYear}`);
  }

  function updateTime(nextHour: number, nextMinute: number) {
    onTimeChange(`${pad2(clamp(nextHour, 0, 23))}:${pad2(clamp(nextMinute, 0, 59))}:${pad2(parsedSecond)}`);
  }

  return (
    <View style={styles.inlineField}>
      <Text style={styles.inlineLabel}>{label}</Text>
      <View style={styles.dateTimeSelector}>
        <NumberSelect value={parsedDay} min={1} max={maxDay} digits={2} onFocus={onFocus} onChange={(nextDay) => updateDate(nextDay, parsedMonth, parsedYear)} />
        <NumberSelect value={parsedMonth} min={1} max={12} digits={1} onFocus={onFocus} onChange={(nextMonth) => updateDate(parsedDay, nextMonth, parsedYear)} />
        <NumberSelect value={parsedYear} min={1970} max={2100} digits={4} wide onFocus={onFocus} onChange={(nextYear) => updateDate(parsedDay, parsedMonth, nextYear)} />
        <NumberSelect value={parsedHour} min={0} max={23} digits={2} onFocus={onFocus} onChange={(nextHour) => updateTime(nextHour, parsedMinute)} />
        <NumberSelect value={parsedMinute} min={0} max={59} digits={2} onFocus={onFocus} onChange={(nextMinute) => updateTime(parsedHour, nextMinute)} />
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
  const { styles, theme } = useFormControls();
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

export function StateSelect({
  value,
  onChange,
  onFocus
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
}) {
  const { styles, theme } = useFormControls();
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

export function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { styles } = useFormControls();

  return (
    <Pressable style={[styles.choice, active && styles.choiceActive]} onPress={onPress}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

function useFormControls() {
  const context = useContext(FormControlContext);
  if (!context) {
    throw new Error("Form controls must be rendered inside FormControlsProvider.");
  }

  return context;
}

const brazilVehicleBrands = [
  "Chevrolet",
  "Fiat",
  "Volkswagen",
  "Toyota",
  "Hyundai",
  "Honda",
  "Ford",
  "Renault",
  "Jeep",
  "Nissan",
  "Peugeot",
  "Citroën",
  "Mitsubishi",
  "Mercedes-Benz",
  "BMW",
  "Audi",
  "Volvo",
  "Kia",
  "Chery",
  "Caoa Chery",
  "BYD",
  "GWM",
  "Ram",
  "Land Rover",
  "Porsche",
  "Suzuki",
  "Subaru",
  "Yamaha",
  "Honda Motos",
  "BMW Motorrad",
  "Kawasaki",
  "Triumph",
  "Dafra"
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
