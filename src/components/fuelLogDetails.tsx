import React from "react";
import { Pressable, Text, View } from "react-native";
import { Car, DateFormatter, FuelLog, Station } from "../domain";

type SharedComponent = React.ComponentType<any>;
type DetailStyles = Record<string, any>;

export function EntityDetails({
  title,
  children,
  styles
}: {
  title: string;
  children: React.ReactNode;
  styles: DetailStyles;
}) {
  return (
    <View style={styles.stationDetails}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.itemTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function StationDetails({
  stationId,
  logs,
  allLogs,
  cars,
  stations,
  onEditLog,
  compact,
  styles
}: {
  stationId: string;
  logs: FuelLog[];
  allLogs: FuelLog[];
  cars: Car[];
  stations: Station[];
  onEditLog?: (logId: string) => void;
  compact?: boolean;
  styles: DetailStyles;
}) {
  const station = stations.find((item) => item.id === stationId);
  const stationLogs = logs.filter((log) => log.stationId === stationId);
  const logNumbers = logNumberMap(allLogs);

  if (!station) {
    return null;
  }

  return (
    <View style={compact ? styles.detailList : styles.stationDetails}>
      {stationLogs.map((log) => {
        const car = cars.find((item) => item.id === log.carId);
        return (
          <Pressable
            key={log.id}
            style={(state) => [styles.detailRow, isHovered(state) && styles.listItemHover]}
            onPress={() => onEditLog?.(log.id)}
          >
            <View>
              <Text style={styles.itemTitle}>
                #{logNumbers.get(log.id)} - {DateFormatter.compact(log.createdAt)}
              </Text>
              <Text style={styles.muted}>{car?.nickname ?? "Veículo"} - {log.fuel}</Text>
            </View>
            <Text style={styles.itemTitle}>{formatCurrency(log.pricePerLiter)}/L</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CarFuelLogDetails({
  carId,
  logs,
  allLogs,
  stations,
  onEditLog,
  compact,
  styles,
  Empty
}: {
  carId: string;
  logs: FuelLog[];
  allLogs: FuelLog[];
  stations: Station[];
  onEditLog?: (logId: string) => void;
  compact?: boolean;
  styles: DetailStyles;
  Empty: SharedComponent;
}) {
  const carLogs = logs.filter((log) => log.carId === carId);
  const logNumbers = logNumberMap(allLogs);

  if (carLogs.length === 0) {
    return (
      <View style={compact ? styles.detailList : styles.stationDetails}>
        <Empty text="Nenhum abastecimento registrado para este veículo." />
      </View>
    );
  }

  return (
    <View style={compact ? styles.detailList : styles.stationDetails}>
      {carLogs.map((log) => {
        const station = stations.find((item) => item.id === log.stationId);
        return (
          <Pressable
            key={log.id}
            style={(state) => [styles.detailRow, isHovered(state) && styles.listItemHover]}
            onPress={() => onEditLog?.(log.id)}
          >
            <View>
              <Text style={styles.itemTitle}>
                #{logNumbers.get(log.id)} - {DateFormatter.compact(log.createdAt)}
              </Text>
              <Text style={styles.muted}>{station?.name ?? "Posto"} - {log.fuel}</Text>
            </View>
            <Text style={styles.itemTitle}>{formatCurrency(log.pricePerLiter)}/L</Text>
          </Pressable>
        );
      })}
    </View>
  );
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
