import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  AppState,
  Car,
  DateFormatter,
  DateInputParser,
  FuelLog,
  FuelLogFactory,
  FuelPrice,
  FuelType,
  MoneyParser,
  Station,
  StationSuggestionService,
  fuels
} from "../../domain";
import { FieldToast, SideToast, ToastNotice, showFieldNotice } from "../../components/formFeedback";
import { Choice, DateTimeSelector, Field } from "../../components/formControls";

type SharedComponent = React.ComponentType<any>;
type RegisterFuelStyles = Record<string, any> & {
  sideToast: any;
  sideToastText: any;
};

const visibleFuels = fuels.filter((fuel) => fuel !== "Gás Natural" && fuel !== "Eletricidade");
const fakeCurrentLocation = {
  latitude: -23.5614,
  longitude: -46.6559
};

export function RegisterFuel({
  cars,
  selectedCar,
  editingLog,
  stations,
  onCarSelect,
  onSave,
  onUpdate,
  onCancel,
  styles,
  Section,
  Empty
}: {
  cars: Car[];
  selectedCar?: Car;
  editingLog?: FuelLog;
  stations: Station[];
  onCarSelect: (id: string) => void;
  onSave: (log: FuelLog) => void;
  onUpdate: (log: FuelLog) => void;
  onCancel: () => void;
  styles: RegisterFuelStyles;
  Section: SharedComponent;
  Empty: SharedComponent;
}) {
  const [carId, setCarId] = useState(selectedCar?.id ?? "");
  const [fuel, setFuel] = useState<FuelType>("Gasolina comum");
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
  const fuelOptions = visibleFuels;

  useEffect(() => {
    if (!selectedCar || editingLog) {
      return;
    }

    setCarId(selectedCar.id);
  }, [editingLog, selectedCar?.id]);

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
      setSaveStatus("Preencha valor e litros para registrar.");
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

  function saveCurrentFuelLog(feedbackField = activeField) {
    setSaveStatus(null);
    const payload = buildPayload();
    if (!payload) {
      return false;
    }

    if (editingLog) {
      onUpdate(FuelLogFactory.update(editingLog, payload));
      setDirty(false);
      showFieldNotice(setNotice, "Abastecimento atualizado.", feedbackField);
      return true;
    }

    if (draftLog) {
      const updatedDraft = FuelLogFactory.update(draftLog, payload);
      setDraftLog(updatedDraft);
      onUpdate(updatedDraft);
      setDirty(false);
      showFieldNotice(setNotice, "Abastecimento atualizado.", feedbackField);
      return true;
    }

    const newLog = FuelLogFactory.create(payload);
    setDraftLog(newLog);
    onSave(newLog);
    setDirty(false);
    showFieldNotice(setNotice, "Novo abastecimento criado.", feedbackField);
    return true;
  }

  function submitFuelLog() {
    saveCurrentFuelLog("submit");
  }

  useEffect(() => {
    if (!dirty) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      saveCurrentFuelLog();
    }, 550);

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
        <SideToast notice={notice} styles={styles} />
        {cars.length === 0 ? (
          <Empty text="Cadastre um veículo pela tela Veículos para liberar o registro." />
        ) : (
          <>
            <View style={styles.fieldToastAnchor}>
              <DateTimeSelector
                label="Data/hora"
                date={date}
                time={time}
                onFocus={() => setActiveField("dateTime")}
                onDateChange={(value: string) => {
                  setActiveField("dateTime");
                  setDirty(true);
                  setDate(value);
                }}
                onTimeChange={(value: string) => {
                  setActiveField("dateTime");
                  setDirty(true);
                  setTime(value);
                }}
              />
              <FieldToast notice={notice} anchor="dateTime" styles={styles} />
            </View>

            <View style={styles.fieldToastAnchor}>
              <View style={styles.blockField}>
                <Text style={styles.blockLabel}>Veículo</Text>
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
              <FieldToast notice={notice} anchor="car" styles={styles} />
            </View>

            <View style={styles.fieldToastAnchor}>
              <View style={[styles.compactBlockField, styles.fuelOdometerField]}>
                <Text style={styles.blockLabel}>Km</Text>
                <Field
                  block
                  hideLabel
                  label=""
                  value={odometerKm}
                  onFocus={() => setActiveField("odometerKm")}
                  onChangeText={(value: string) => {
                    setActiveField("odometerKm");
                    setDirty(true);
                    setOdometerKm(value);
                  }}
                  keyboardType="decimal-pad"
                  style={styles.compactBlockInput}
                />
              </View>
              <FieldToast notice={notice} anchor="odometerKm" styles={styles} />
            </View>

            <View style={styles.fieldToastAnchor}>
              <View style={styles.blockField}>
                <Text style={styles.blockLabel}>Combustível</Text>
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
              <FieldToast notice={notice} anchor="fuel" styles={styles} />
            </View>

            <View style={styles.compactFieldRow}>
              <View style={styles.compactFieldToastAnchor}>
                <Field
                  label="Valor"
                  value={paid}
                  onFocus={() => setActiveField("paid")}
                  onChangeText={(value: string) => {
                    setActiveField("paid");
                    setDirty(true);
                    setPaid(value);
                  }}
                  keyboardType="decimal-pad"
                  compact
                />
                <FieldToast notice={notice} anchor="paid" styles={styles} />
              </View>
              <View style={styles.compactFieldToastAnchor}>
                <Field
                  label="Litros"
                  value={liters}
                  onFocus={() => setActiveField("liters")}
                  onChangeText={(value: string) => {
                    setActiveField("liters");
                    setDirty(true);
                    setLiters(value);
                  }}
                  keyboardType="decimal-pad"
                  compact
                />
                <FieldToast notice={notice} anchor="liters" styles={styles} />
              </View>
              <View style={styles.compactFieldToastAnchor}>
                <View style={styles.compactInlineField}>
                  <Text style={[styles.compactInlineLabel, styles.priceInlineLabel]}>Preço/L</Text>
                  <View style={styles.priceInlineBox}>
                    <Text style={styles.priceInlineValue}>{Number.isFinite(price) ? formatCurrency(price) : "R$ 0"}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.fieldToastAnchor}>
              <View style={styles.blockField}>
                <Text style={styles.blockLabel}>Posto</Text>
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
              <FieldToast notice={notice} anchor="station" styles={styles} />
            </View>
            {saveStatus ? <Text style={styles.errorText}>{saveStatus}</Text> : null}
            <Pressable style={styles.primaryButton} onPress={submitFuelLog}>
              <Text style={styles.primaryButtonText}>
                {editingLog ? "Atualizar" : "Abastecer"}
              </Text>
            </Pressable>
          </>
        )}
      </Section>
    </View>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}
