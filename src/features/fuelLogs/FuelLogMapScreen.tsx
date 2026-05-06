import L from "leaflet";
import React, { useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import {
  Car,
  DateFormatter,
  FuelEfficiencyCalculator,
  FuelLog,
  FuelType,
  Station
} from "../../domain";
import { RegisterFuel } from "./RegisterFuel";
import { trackEvent } from "../../analytics";

type SharedComponent = React.ComponentType<any>;
type FeatureStyles = Record<string, any> & {
  sideToast: any;
  sideToastText: any;
};
type FeatureTheme = { primary: string; map: string };

const fakeCurrentLocation = {
  latitude: -23.5614,
  longitude: -46.6559
};

export function StationMap({
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
  onUpdate,
  styles,
  theme,
  Section,
  Empty
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
  styles: FeatureStyles;
  theme: FeatureTheme;
  Section: SharedComponent;
  Empty: SharedComponent;
}) {
  const [mapExpanded, setMapExpanded] = useState(false);
  const logNumbers = logNumberMap(allLogs);
  const numberedLogs = logs.map((log) => ({ log, number: logNumbers.get(log.id) ?? 0 }));

  return (
    <View style={styles.stack}>
      <Section
        title={`${numberedLogs.length} ${numberedLogs.length === 1 ? "Abastecimento" : "Abastecimentos"}`}
        rightAction={
          <Pressable
            style={styles.addButton}
            onPress={() => {
              trackEvent("fuel_log_form_opened", {
                mode: "new",
                source: "fuel_logs_screen"
              });
              onNew();
            }}
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        }
      >
        {numberedLogs.length === 0 ? (
          <Empty text="Registre abastecimentos para construir sua lista." />
        ) : (
          numberedLogs.map(({ log, number }) => {
            const station = stations.find((item) => item.id === log.stationId);
            const car = cars.find((item) => item.id === log.carId);
            const efficiency = FuelEfficiencyCalculator.valueForLog(log, allLogs, cars);
            return (
              <View key={log.id} style={styles.inlineEditGroup}>
                <Pressable
                  style={(state) => [
                    styles.listItem,
                    editingLogId === log.id && styles.selectedItem,
                  isHovered(state) && styles.listItemHover
                ]}
                  onPress={() => {
                    trackEvent("fuel_log_item_clicked", {
                      mode: editingLogId === log.id ? "close_edit" : "edit",
                      fuel_type: log.fuel,
                      has_odometer: Boolean(log.odometerKm)
                    });
                    onEdit(log.id);
                  }}
                >
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberBadgeText}>{number}</Text>
                  </View>
                  <View style={styles.logInfo}>
                    <Text style={styles.itemTitle}>{DateFormatter.compact(log.createdAt)}</Text>
                    <Text style={styles.muted}>
                      {station?.name ?? "Posto"} - {car?.nickname ?? "Veículo"} - {log.fuel}
                    </Text>
                    {log.odometerKm || efficiency ? (
                      <Text style={styles.muted}>
                        {log.odometerKm ? `${log.odometerKm.toLocaleString("pt-BR")} km` : ""}
                        {efficiency ? `${log.odometerKm ? " - " : ""}${efficiency.kmPerLiter.toFixed(1)} km/L` : ""}
                      </Text>
                    ) : null}
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
                      styles={styles}
                      Section={Section}
                      Empty={Empty}
                    />
                  </View>
                ) : null}
              </View>
            );
          })
        )}
        <View style={styles.mapListDivider} />
        <View style={[styles.mapPanel, mapExpanded && styles.mapPanelExpanded]}>
          <FuelMap numberedLogs={numberedLogs} stations={stations} styles={styles} theme={theme} />
          <Pressable
            accessibilityLabel={mapExpanded ? "Reduzir mapa" : "Maximizar mapa"}
            style={styles.mapExpandButton}
            onPress={() => {
              trackEvent("fuel_log_map_toggled", {
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

export function FuelMap({
  numberedLogs,
  stations,
  styles,
  theme
}: {
  numberedLogs: Array<{ log: FuelLog; number: number }>;
  stations: Station[];
  styles: FeatureStyles;
  theme: FeatureTheme;
}) {
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

export function StationOverviewMap({
  stations,
  styles,
  theme
}: {
  stations: Station[];
  styles: FeatureStyles;
  theme: FeatureTheme;
}) {
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

  return <FuelMap numberedLogs={numberedLogs} stations={stations} styles={styles} theme={theme} />;
}

function logNumberMap(logs: FuelLog[]) {
  return new Map(logs.map((log) => [log.id, log.sequence ?? 0]));
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
