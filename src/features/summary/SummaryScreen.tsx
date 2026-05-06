import React from "react";
import { Pressable, Text, View } from "react-native";
import {
  Car,
  DashboardCalculator,
  DashboardMetrics,
  FuelLog,
  Station
} from "../../domain";

type SharedComponent = React.ComponentType<any>;
type SummaryStyles = Record<string, any>;

type MetricTrend = {
  label: string;
  status: "good" | "bad" | "neutral";
};

export function SummaryScreen({
  logs,
  cars,
  stations,
  metrics,
  visibleMonth,
  onPreviousMonth,
  onNextMonth,
  styles,
  Section,
  Empty
}: {
  logs: FuelLog[];
  cars: Car[];
  stations: Station[];
  metrics: DashboardMetrics;
  visibleMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onEditLog: (logId: string) => void;
  styles: SummaryStyles;
  Section: SharedComponent;
  Empty: SharedComponent;
}) {
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
    <View style={styles.summaryStack}>
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
          <MetricCard styles={styles} label="Gasto mês" value={formatCurrency(metrics.monthTotal)} small={metrics.monthTotal >= 100} trend={monthTrend} />
          <MetricCard styles={styles} label="Último R$/L" value={last ? formatCurrency(last.pricePerLiter) : ""} small trend={priceTrend} />
          <MetricCard styles={styles} label="Média km/L" value={metrics.averageKmPerLiter ? metrics.averageKmPerLiter.toFixed(1) : ""} small trend={efficiencyTrend} />
        </View>

        <Bars data={metrics.monthlyTotals} styles={styles} Empty={Empty} />

        <View style={styles.summaryBlockDivider} />
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

function MetricCard({
  label,
  value,
  small,
  trend,
  styles
}: {
  label: string;
  value: string;
  small?: boolean;
  trend?: MetricTrend;
  styles: SummaryStyles;
}) {
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

function Bars({
  data,
  styles,
  Empty
}: {
  data: { label: string; value: number }[];
  styles: SummaryStyles;
  Empty: SharedComponent;
}) {
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}

function isHovered(state: unknown) {
  const maybeState = state as { hovered?: boolean; pressed?: boolean };
  return Boolean(maybeState.hovered || maybeState.pressed);
}
