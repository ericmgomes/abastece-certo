import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import {
  Car,
  CarFactory,
  FuelLog,
  Station,
  VehicleName,
  VehicleType,
  vehicleTypes
} from "../../domain";
import { FieldToast, ToastNotice, showFieldNotice } from "../../components/formFeedback";
import { BrandSelect, Choice, Field } from "../../components/formControls";
import { CarFuelLogDetails, EntityDetails } from "../../components/fuelLogDetails";
import { TrashIcon } from "../../components/icons";
import { trackEvent } from "../../analytics";

type SharedComponent = React.ComponentType<any>;
type VehicleStyles = Record<string, any> & {
  sideToast: any;
  sideToastText: any;
};

type VehicleComponents = {
  Section: SharedComponent;
  Empty: SharedComponent;
};

export function Cars({
  cars,
  logs,
  stations,
  onEditLog,
  onSelect,
  onSave,
  onUpdate,
  onDeleteCar,
  styles,
  initialEditingCarId,
  onRouteEditChange,
  components
}: {
  cars: Car[];
  logs: FuelLog[];
  stations: Station[];
  onEditLog: (logId: string) => void;
  onSelect: (id: string) => void;
  onSave: (car: Car) => void;
  onUpdate: (car: Car) => void;
  onDeleteCar: (carId: string) => void;
  styles: VehicleStyles;
  initialEditingCarId?: string | null;
  onRouteEditChange?: (carId: string | null) => void;
  components: VehicleComponents;
}) {
  const { Section, Empty } = components;
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [selectedDetailsCarId, setSelectedDetailsCarId] = useState<string | null>(null);
  const carRows = cars
    .map((car) => carSummary(car, logs))
    .sort((a, b) => b.total - a.total);

  useEffect(() => {
    if (!initialEditingCarId) {
      return;
    }

    if (initialEditingCarId === "new") {
      setEditingCarId("new");
      setSelectedDetailsCarId(null);
      return;
    }

    if (cars.some((car) => car.id === initialEditingCarId)) {
      setEditingCarId(initialEditingCarId);
      setSelectedDetailsCarId(initialEditingCarId);
      onSelect(initialEditingCarId);
    }
  }, [initialEditingCarId, cars.length]);

  function openNewForm() {
    trackEvent("vehicle_form_opened", { mode: "new" });
    setEditingCarId("new");
    onRouteEditChange?.("new");
  }

  function selectCarDetails(car: Car) {
    trackEvent("vehicle_details_toggled", {
      open: selectedDetailsCarId !== car.id,
      has_logs: logs.some((log) => log.carId === car.id)
    });
    onSelect(car.id);
    setSelectedDetailsCarId((current) => (current === car.id ? null : car.id));
    setEditingCarId(null);
    onRouteEditChange?.(null);
  }

  function closeForm() {
    trackEvent("vehicle_form_closed", {
      mode: editingCarId === "new" ? "new" : "edit"
    });
    setEditingCarId(null);
    onRouteEditChange?.(null);
  }

  return (
    <View style={styles.stack}>
      <Section
        title={`${cars.length} ${cars.length === 1 ? "Veículo" : "Veículos"}`}
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
              <CarEditor
                cars={cars}
                onSave={onSave}
                onUpdate={onUpdate}
                onDelete={onDeleteCar}
                onCancel={closeForm}
                styles={styles}
                components={components}
              />
            </View>
            <View style={styles.mapListDivider} />
          </View>
        ) : null}

        {cars.length === 0 ? (
          <Empty text="Cadastre seu primeiro veículo." />
        ) : (
          carRows.map(({ car, total, count, currentOdometerKm }) => (
            <View key={car.id} style={styles.inlineEditGroup}>
              <Pressable
                style={(state) => [
                  styles.listItem,
                  car.id === selectedDetailsCarId && styles.selectedItem,
                  isHovered(state) && styles.listItemHover
                ]}
                onPress={() => selectCarDetails(car)}
              >
                <View style={styles.rankingInfo}>
                  <Text style={styles.itemTitle}>{car.nickname}</Text>
                  <Text style={styles.muted}>
                    {currentOdometerKm ? `Km atual: ${currentOdometerKm.toLocaleString("pt-BR")} km` : `${count} abastecimentos`}
                  </Text>
                </View>
                <View style={styles.listItemActions}>
                  <Text style={styles.rankingPrice}>{formatCurrency(total)}</Text>
                  <Pressable
                    accessibilityLabel="Editar veículo"
                    style={styles.inlineIconButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      trackEvent("vehicle_form_opened", {
                        mode: editingCarId === car.id ? "close_edit" : "edit"
                      });
                      onSelect(car.id);
                      setSelectedDetailsCarId(car.id);
                      setEditingCarId((current) => {
                        const next = current === car.id ? null : car.id;
                        onRouteEditChange?.(next);
                        return next;
                      });
                    }}
                  >
                    <Text style={styles.inlineIconButtonText}>✎</Text>
                  </Pressable>
                </View>
              </Pressable>
              {selectedDetailsCarId === car.id ? (
                <EntityDetails
                  title={editingCarId === car.id ? "Editar veículo" : "Abastecimentos"}
                  styles={styles}
                >
                  {editingCarId === car.id ? (
                    <View style={styles.inlineForm}>
                      <CarEditor
                        cars={cars}
                        car={car}
                        onSave={onSave}
                        onUpdate={onUpdate}
                        onDelete={onDeleteCar}
                        onCancel={closeForm}
                        styles={styles}
                        components={components}
                      />
                    </View>
                  ) : null}
                  {editingCarId === car.id ? <Text style={styles.itemTitle}>Abastecimentos</Text> : null}
                  <CarFuelLogDetails
                    carId={car.id}
                    logs={logs}
                    allLogs={logs}
                    stations={stations}
                    onEditLog={onEditLog}
                    compact
                    styles={styles}
                    Empty={Empty}
                  />
                </EntityDetails>
              ) : null}
            </View>
          ))
        )}
      </Section>
    </View>
  );
}

function CarEditor({
  cars,
  car,
  onSave,
  onUpdate,
  onDelete,
  onCancel,
  styles,
  components
}: {
  cars: Car[];
  car?: Car;
  onSave: (car: Car) => void;
  onUpdate: (car: Car) => void;
  onDelete: (carId: string) => void;
  onCancel: () => void;
  styles: VehicleStyles;
  components: VehicleComponents;
}) {
  const [draftCar, setDraftCar] = useState<Car | null>(null);
  const [vehicleType, setVehicleType] = useState<VehicleType>(car?.vehicleType ?? "Carro");
  const [brand, setBrand] = useState(car?.brand ?? "");
  const [model, setModel] = useState(car?.model ?? "");
  const [initialOdometerKm, setInitialOdometerKm] = useState(car?.initialOdometerKm ? String(car.initialOdometerKm) : "");
  const [currentOdometerKm, setCurrentOdometerKm] = useState(car?.currentOdometerKm ? String(car.currentOdometerKm) : "");
  const [status, setStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<ToastNotice | null>(null);
  const [activeField, setActiveField] = useState("brand");

  useEffect(() => {
    if (!car) {
      return;
    }

    setVehicleType(car.vehicleType ?? "Carro");
    setBrand(car.brand);
    setModel(car.model);
    setInitialOdometerKm(car.initialOdometerKm ? String(car.initialOdometerKm) : "");
    setCurrentOdometerKm(car.currentOdometerKm ? String(car.currentOdometerKm) : "");
    setDraftCar(null);
  }, [car?.id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!brand.trim() || !model.trim()) {
        setStatus("Preencha marca e modelo para salvar.");
        return;
      }

      const nickname = VehicleName.unique(brand, model, cars, car?.id ?? draftCar?.id);
      const parsedInitialOdometerKm = parseOptionalNumber(initialOdometerKm);
      const parsedCurrentOdometerKm = parseOptionalNumber(currentOdometerKm) ?? parsedInitialOdometerKm;
      if (car) {
        onUpdate(CarFactory.update(car, { vehicleType, nickname, brand, model, initialOdometerKm: parsedInitialOdometerKm, currentOdometerKm: parsedCurrentOdometerKm }));
        showFieldNotice(setNotice, "Veículo atualizado.", activeField);
        return;
      }

      if (draftCar) {
        const updated = CarFactory.update(draftCar, { vehicleType, nickname, brand, model, initialOdometerKm: parsedInitialOdometerKm, currentOdometerKm: parsedCurrentOdometerKm });
        setDraftCar(updated);
        onUpdate(updated);
        showFieldNotice(setNotice, "Veículo atualizado.", activeField);
        return;
      }

      const created = CarFactory.create({ vehicleType, nickname, brand, model, initialOdometerKm: parsedInitialOdometerKm, currentOdometerKm: parsedCurrentOdometerKm });
      setDraftCar(created);
      onSave(created);
      showFieldNotice(setNotice, "Veículo criado.", activeField);
    }, 450);

    return () => clearTimeout(timeout);
  }, [vehicleType, brand, model, initialOdometerKm, currentOdometerKm, car?.id, draftCar?.id]);

  function updateCarField(anchor: string, update: (value: string) => void) {
    return (value: string) => {
      setActiveField(anchor);
      trackEvent("vehicle_field_changed", {
        field: anchor,
        mode: car ? "edit" : draftCar ? "draft" : "new"
      });
      update(value);
    };
  }

  function updateInitialOdometerKm(value: string) {
    const sanitized = value.replace(/[^\d,.]/g, "");
    setInitialOdometerKm(sanitized);
    if (!currentOdometerKm.trim()) {
      setCurrentOdometerKm(sanitized);
    }
  }

  function confirmDelete() {
    const carToDelete = car ?? draftCar;
    if (!carToDelete) {
      onCancel();
      return;
    }

    const deleteCar = () => {
      trackEvent("vehicle_delete_clicked", {
        mode: car ? "existing" : "draft"
      });
      onDelete(carToDelete.id);
      onCancel();
    };

    if (Platform.OS === "web") {
      if (globalThis.confirm?.("Apagar este veículo? Os abastecimentos dele também serão removidos.")) {
        deleteCar();
      }
      return;
    }

    Alert.alert("Apagar veículo", "Os abastecimentos dele também serão removidos.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: deleteCar }
    ]);
  }

  return (
    <View style={styles.formStack}>
      <View style={styles.formActionRow}>
        <Pressable accessibilityLabel="Apagar veículo" style={styles.deleteIconButton} onPress={confirmDelete}>
          <TrashIcon styles={styles} />
        </Pressable>
      </View>
      <View style={styles.fieldToastAnchor}>
        <View style={styles.blockField}>
          <Text style={styles.blockLabel}>Tipo</Text>
          <View style={styles.choiceFieldWrap}>
            {vehicleTypes.map((type) => (
              <Choice
                key={type}
                label={type}
                active={vehicleType === type}
                onPress={() => {
                  setActiveField("vehicleType");
                  trackEvent("vehicle_field_changed", {
                    field: "vehicleType",
                    mode: car ? "edit" : draftCar ? "draft" : "new"
                  });
                  setVehicleType(type);
                }}
              />
            ))}
          </View>
        </View>
        <FieldToast notice={notice} anchor="vehicleType" styles={styles} />
      </View>
      <View style={styles.fieldToastAnchor}>
        <BrandSelect
          block
          value={brand}
          onFocus={() => setActiveField("brand")}
          onChange={updateCarField("brand", setBrand)}
        />
        <FieldToast notice={notice} anchor="brand" styles={styles} />
      </View>
      <View style={styles.fieldToastAnchor}>
        <Field block label="Modelo" value={model} onFocus={() => setActiveField("model")} onChangeText={updateCarField("model", setModel)} />
        <FieldToast notice={notice} anchor="model" styles={styles} />
      </View>
      <View style={styles.compactFieldRow}>
        <View style={[styles.fieldToastAnchor, styles.odometerFieldColumn]}>
          <View style={styles.compactBlockField}>
            <Text style={styles.blockLabel}>Km inicial</Text>
            <Field
              block
              hideLabel
              label=""
              value={initialOdometerKm}
              keyboardType="numeric"
              onFocus={() => setActiveField("initialOdometerKm")}
              onChangeText={updateCarField("initialOdometerKm", updateInitialOdometerKm)}
              style={styles.compactBlockInput}
            />
          </View>
          <FieldToast notice={notice} anchor="initialOdometerKm" styles={styles} />
        </View>
        <View style={[styles.fieldToastAnchor, styles.odometerFieldColumn]}>
          <View style={styles.compactBlockField}>
            <Text style={styles.blockLabel}>Km atual</Text>
            <Field
              block
              hideLabel
              label=""
              value={currentOdometerKm}
              keyboardType="numeric"
              onFocus={() => setActiveField("currentOdometerKm")}
              onChangeText={updateCarField("currentOdometerKm", (value) => setCurrentOdometerKm(value.replace(/[^\d,.]/g, "")))}
              style={styles.compactBlockInput}
            />
          </View>
          <FieldToast notice={notice} anchor="currentOdometerKm" styles={styles} />
        </View>
      </View>
    </View>
  );
}

function parseOptionalNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function carSummary(car: Car, logs: FuelLog[]) {
  const carLogs = logs.filter((log) => log.carId === car.id);
  const latestLogKm = [...carLogs]
    .filter((log) => typeof log.odometerKm === "number")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.odometerKm;
  const currentOdometerKm = car.currentOdometerKm ?? latestLogKm ?? car.initialOdometerKm;
  return {
    car,
    total: carLogs.reduce((sum, log) => sum + log.paid, 0),
    count: carLogs.length,
    currentOdometerKm
  };
}

function isHovered(state: unknown) {
  return typeof state === "object" && state !== null && "hovered" in state && Boolean((state as { hovered?: boolean }).hovered);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}
