import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Car, DashboardMetrics, FuelLog, Station } from "../../domain";
import { FieldToast, ToastNotice, showFieldNotice } from "../../components/formFeedback";
import { Field, StateSelect } from "../../components/formControls";
import { EntityDetails, StationDetails } from "../../components/fuelLogDetails";
import { StationOverviewMap } from "../fuelLogs/FuelLogMapScreen";
import { trackEvent } from "../../analytics";

type SharedComponent = React.ComponentType<any>;
type StationStyles = Record<string, any> & {
  sideToast: any;
  sideToastText: any;
};
type StationTheme = { primary: string; map: string };

type StationComponents = {
  Section: SharedComponent;
  Empty: SharedComponent;
};

const fakeCurrentLocation = {
  latitude: -23.5614,
  longitude: -46.6559
};

export function Stations({
  stations,
  logs,
  allLogs,
  cars,
  metrics,
  onEditLog,
  onSave,
  onUpdate,
  onDeleteStation,
  styles,
  theme,
  components
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
  styles: StationStyles;
  theme: StationTheme;
  components: StationComponents;
}) {
  const { Section, Empty } = components;
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const stationRows = stations
    .map((station) => ({
      station,
      ranking: metrics.stationRanking.find((item) => item.id === station.id),
      count: logs.filter((log) => log.stationId === station.id).length
    }))
    .sort((a, b) => (a.ranking?.average ?? Number.POSITIVE_INFINITY) - (b.ranking?.average ?? Number.POSITIVE_INFINITY));

  function openNewForm() {
    trackEvent("station_form_opened", {
      mode: "new"
    });
    setEditingStationId("new");
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
                styles={styles}
                components={components}
              />
            </View>
            <View style={styles.mapListDivider} />
          </View>
        ) : null}

        {stations.length === 0 ? (
          <Empty text="Cadastre seu primeiro posto." />
        ) : (
          stationRows.map(({ station, ranking, count }) => (
            <View key={station.id} style={styles.inlineEditGroup}>
              <Pressable
                style={(state) => [
                  styles.listItem,
                  selectedStationId === station.id && styles.selectedItem,
                  isHovered(state) && styles.listItemHover
                ]}
                onPress={() => {
                  trackEvent("station_details_toggled", {
                    open: selectedStationId !== station.id,
                    has_logs: count > 0
                  });
                  setSelectedStationId((current) => (current === station.id ? null : station.id));
                  setEditingStationId(null);
                }}
              >
                <View style={styles.rankingInfo}>
                  <Text style={styles.itemTitle}>{station.name}</Text>
                  <Text style={styles.muted}>{count} abastecimentos</Text>
                </View>
                <View style={styles.listItemActions}>
                  {ranking ? <Text style={styles.rankingPrice}>{formatCurrency(ranking.average)}/L</Text> : null}
                  <Pressable
                    accessibilityLabel="Editar posto"
                    style={styles.inlineIconButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      trackEvent("station_form_opened", {
                        mode: editingStationId === station.id ? "close_edit" : "edit"
                      });
                      setSelectedStationId(station.id);
                      setEditingStationId((current) => (current === station.id ? null : station.id));
                    }}
                  >
                    <Text style={styles.inlineIconButtonText}>✎</Text>
                  </Pressable>
                </View>
              </Pressable>
              {selectedStationId === station.id ? (
                <EntityDetails
                  title={editingStationId === station.id ? "Editar posto" : "Abastecimentos"}
                  styles={styles}
                >
                  {editingStationId === station.id ? (
                    <View style={styles.inlineForm}>
                      <StationEditor
                        station={station}
                        onSave={onSave}
                        onUpdate={onUpdate}
                        onDelete={onDeleteStation}
                        onCancel={() => setEditingStationId(null)}
                        styles={styles}
                        components={components}
                      />
                    </View>
                  ) : null}
                  {editingStationId === station.id ? <Text style={styles.itemTitle}>Abastecimentos</Text> : null}
                  <StationDetails
                    stationId={station.id}
                    logs={logs}
                    allLogs={allLogs}
                    cars={cars}
                    stations={stations}
                    onEditLog={onEditLog}
                    compact
                    styles={styles}
                  />
                </EntityDetails>
              ) : null}
            </View>
          ))
        )}
        <View style={styles.mapListDivider} />
        <View style={[styles.mapPanel, mapExpanded && styles.mapPanelExpanded]}>
          <StationOverviewMap stations={stations} styles={styles} theme={theme} />
          <Pressable
            accessibilityLabel={mapExpanded ? "Reduzir mapa" : "Maximizar mapa"}
            style={styles.mapExpandButton}
            onPress={() => {
              trackEvent("station_map_toggled", {
                expanded: !mapExpanded
              });
              setMapExpanded((current) => !current);
            }}
          >
            <Text style={styles.mapHeaderIconText}>{mapExpanded ? "↙" : "⛶"}</Text>
          </Pressable>
        </View>
      </Section>
    </View>
  );
}

function StationEditor({
  station,
  onSave,
  onUpdate,
  onDelete,
  onCancel,
  styles,
  components
}: {
  station?: Station;
  onSave: (station: Station) => void;
  onUpdate: (station: Station) => void;
  onDelete: (stationId: string) => void;
  onCancel: () => void;
  styles: StationStyles;
  components: StationComponents;
}) {
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

    trackEvent("station_delete_clicked", {
      mode: station ? "existing" : "draft"
    });
    onDelete(stationToDelete.id);
    onCancel();
  }

  function updateStationField(anchor: string, update: (value: string) => void) {
    return (value: string) => {
      setActiveField(anchor);
      trackEvent("station_field_changed", {
        field: anchor,
        mode: station ? "edit" : draftStation ? "draft" : "new"
      });
      update(value);
    };
  }

  return (
    <View style={styles.formStack}>
      <View style={styles.fieldToastAnchor}>
        <Field label="Nome" value={name} onFocus={() => setActiveField("name")} onChangeText={updateStationField("name", setName)} />
        <FieldToast notice={notice} anchor="name" styles={styles} />
      </View>
      <View style={styles.fieldToastAnchor}>
        <Field label="Endereço" value={address} onFocus={() => setActiveField("address")} onChangeText={updateStationField("address", setAddress)} />
        <FieldToast notice={notice} anchor="address" styles={styles} />
      </View>
      <View style={styles.fieldToastAnchor}>
        <Field label="Cidade" value={city} onFocus={() => setActiveField("city")} onChangeText={updateStationField("city", setCity)} />
        <FieldToast notice={notice} anchor="city" styles={styles} />
      </View>
      <View style={styles.fieldToastAnchor}>
        <View style={styles.inlineField}>
          <Text style={styles.inlineLabel}>Estado</Text>
          <StateSelect
            value={stateName}
            onFocus={() => setActiveField("state")}
            onChange={(value: string) => {
              setActiveField("state");
              trackEvent("station_field_changed", {
                field: "state",
                mode: station ? "edit" : draftStation ? "draft" : "new"
              });
              setStateName(value);
            }}
          />
        </View>
        <FieldToast notice={notice} anchor="state" styles={styles} />
      </View>
      <Pressable style={styles.deleteButton} onPress={confirmDelete}>
        <Text style={styles.deleteButtonText}>Apagar posto</Text>
      </Pressable>
    </View>
  );
}

async function geocodeStationAddress(address: string, city: string, stateName: string) {
  const query = [address, city, stateName, "Brasil"].filter(Boolean).join(", ");
  if (!query.trim() || query.trim() === "Brasil") {
    return null;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const result = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });
  const data = await result.json() as Array<{ lat?: string; lon?: string }>;
  const first = data[0];
  const latitude = Number(first?.lat);
  const longitude = Number(first?.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
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
