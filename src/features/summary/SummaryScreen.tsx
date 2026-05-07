import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Car,
  DashboardCalculator,
  DashboardMetrics,
  FuelLog,
  Station
} from "../../domain";
import { trackEvent } from "../../analytics";

type SharedComponent = React.ComponentType<any>;
type SummaryStyles = Record<string, any>;

type MetricTrend = {
  label: string;
  status: "good" | "bad" | "neutral";
};

type ChartMetric = "spent" | "liters" | "efficiency" | "costPerKm";

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
  const [chartMetric, setChartMetric] = useState<ChartMetric>("spent");
  const previousMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  const currentMonthLogs = logsForMonth(logs, visibleMonth);
  const previousMonthLogs = logsForMonth(logs, previousMonth);
  const monthLiters = currentMonthLogs.reduce((sum, log) => sum + log.liters, 0);
  const previousMonthLiters = previousMonthLogs.reduce((sum, log) => sum + log.liters, 0);
  const monthCostPerKm = costPerKmForMonth(logs, visibleMonth);
  const previousMonthCostPerKm = costPerKmForMonth(logs, previousMonth);
  const previousMetrics = new DashboardCalculator({ user: null, cars, stations, logs, selectedCarId: null }, previousMonth).calculate();
  const hasPreviousMonth = previousMonthLogs.length > 0;
  const monthTrend = hasPreviousMonth
    ? metricTrend(metrics.monthTotal, previousMetrics.monthTotal, "lower")
    : undefined;
  const litersTrend = hasPreviousMonth
    ? metricTrend(monthLiters, previousMonthLiters, "lower")
    : undefined;
  const costPerKmTrend = hasPreviousMonth && monthCostPerKm !== null && previousMonthCostPerKm !== null
    ? metricTrend(monthCostPerKm, previousMonthCostPerKm, "lower")
    : undefined;
  const monthLabel = visibleMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const chartData = monthlyChartData(logs, visibleMonth, chartMetric);
  const periodStats = fullPeriodStats(logs);

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

        <View style={styles.summaryMetricGrid}>
          <MetricCard
            styles={styles}
            label="Gasto mês"
            value={formatCurrency(metrics.monthTotal)}
            small={metrics.monthTotal >= 100}
            trend={monthTrend}
            active={chartMetric === "spent"}
            onPress={() => {
              trackEvent("summary_chart_metric_changed", { metric: "spent" });
              setChartMetric("spent");
            }}
          />
          <MetricCard
            styles={styles}
            label="Litros"
            value={monthLiters ? formatLiters(monthLiters) : ""}
            small
            trend={litersTrend}
            active={chartMetric === "liters"}
            onPress={() => {
              trackEvent("summary_chart_metric_changed", { metric: "liters" });
              setChartMetric("liters");
            }}
          />
          <MetricCard
            styles={styles}
            label="R$/km"
            value={monthCostPerKm === null ? "-" : `${formatCurrency(monthCostPerKm)}/km`}
            small
            trend={costPerKmTrend}
            active={chartMetric === "costPerKm"}
            onPress={() => {
              trackEvent("summary_chart_metric_changed", { metric: "costPerKm" });
              setChartMetric("costPerKm");
            }}
          />
          <MetricCard
            styles={styles}
            label="Média km/L"
            value="-"
            small
            trend={undefined}
            active={chartMetric === "efficiency"}
            onPress={() => {
              trackEvent("summary_chart_metric_changed", { metric: "efficiency" });
              setChartMetric("efficiency");
            }}
          />
        </View>

        <Bars data={chartData} styles={styles} Empty={Empty} />

        {metrics.fuelAverages.length === 0 ? (
          <Empty text="Registre abastecimentos para comparar combustíveis." />
        ) : (
          <View style={styles.fuelGrid}>
            {metrics.fuelAverages.map((fuel) => (
              <Pressable
                key={fuel.name}
                style={(state) => [styles.fuelCard, isHovered(state) && styles.listItemHover]}
                onPress={() => {
                  trackEvent("fuel_average_clicked", {
                    fuel_type: fuel.name
                  });
                }}
              >
                <Text style={styles.itemTitle}>{fuel.name}</Text>
                <Text style={styles.itemTitle}>{formatCurrency(fuel.average)}/L</Text>
              </Pressable>
            ))}
          </View>
        )}

        {periodStats ? (
          <>
            <View style={styles.summaryBlockDivider} />
            <Text style={styles.periodTitle}>{periodStats.label}</Text>
            <View style={styles.periodGrid}>
              <PeriodMetricCard styles={styles} label="Gasto total" value={formatCurrency(periodStats.totalSpent)} />
              <PeriodMetricCard styles={styles} label="Litros" value={formatLiters(periodStats.totalLiters)} />
              <PeriodMetricCard styles={styles} label="Média km/L" value="-" />
              <PeriodMetricCard styles={styles} label="R$/km" value={periodStats.costPerKm === null ? "-" : `${formatCurrency(periodStats.costPerKm)}/km`} />
              <PeriodMetricCard styles={styles} label="Média gasto mensal" value={formatCurrency(periodStats.averageMonthlySpent)} />
              <PeriodMetricCard styles={styles} label="Média litros mensal" value={formatLiters(periodStats.averageMonthlyLiters)} />
            </View>
          </>
        ) : null}
      </Section>
    </View>
  );
}

function MetricCard({
  label,
  value,
  small,
  trend,
  active,
  onPress,
  styles
}: {
  label: string;
  value: string;
  small?: boolean;
  trend?: MetricTrend;
  active?: boolean;
  onPress: () => void;
  styles: SummaryStyles;
}) {
  return (
    <Pressable style={[styles.metricCard, active && styles.metricCardActive]} onPress={onPress}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, small && styles.metricValueSmall]}>{value}</Text>
      {trend ? (
        <Text
          style={[
            styles.metricTrend,
            trendStyle(trend.status, styles)
          ]}
        >
          {trend.label}
        </Text>
      ) : null}
    </Pressable>
  );
}

function trendStyle(status: MetricTrend["status"], styles: SummaryStyles) {
  if (status === "good") {
    return styles.metricTrendGood;
  }

  if (status === "bad") {
    return styles.metricTrendBad;
  }

  return styles.metricTrendNeutral;
}

function PeriodMetricCard({
  label,
  value,
  styles
}: {
  label: string;
  value: string;
  styles: SummaryStyles;
}) {
  return (
    <View style={styles.periodMetricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, styles.metricValueSmall]}>{value}</Text>
    </View>
  );
}

function Bars({
  data,
  styles,
  Empty
}: {
  data: { label: string; value: number; display: string }[];
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
            {item.display ? <Text style={[styles.barValue, item.value <= 0 && styles.barValueEmpty]}>{item.display}</Text> : null}
          </View>
          <Text style={styles.barLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function monthlyChartData(logs: FuelLog[], visibleMonth: Date, metric: ChartMetric) {
  return Array.from({ length: 3 }, (_item, index) =>
    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - (2 - index), 1)
  ).map((month) => {
    const monthLogs = logsForMonth(logs, month);
    const value = metric === "costPerKm"
      ? costPerKmForMonth(logs, month) ?? 0
      : monthlyMetricValue(monthLogs, metric);
    return {
      label: month.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      value,
      display: formatChartValue(value, metric)
    };
  });
}

function monthlyMetricValue(monthLogs: FuelLog[], metric: ChartMetric) {
  if (metric === "spent") {
    return monthLogs.reduce((sum, log) => sum + log.paid, 0);
  }

  if (metric === "liters") {
    return monthLogs.reduce((sum, log) => sum + log.liters, 0);
  }

  return 0;
}

function formatChartValue(value: number, metric: ChartMetric) {
  if (metric === "efficiency") {
    return "-";
  }

  if (!value) {
    return "";
  }

  if (metric === "spent") {
    return formatCurrency(value);
  }

  if (metric === "liters") {
    return `${formatLiters(value)} L`;
  }

  if (metric === "costPerKm") {
    return `${formatCurrency(value)}/km`;
  }

  return "";
}

function costPerKmForMonth(logs: FuelLog[], referenceDate: Date) {
  const value = costPerKmForLogs(logs, referenceDate);
  return value > 0 ? value : null;
}

function costPerKmForLogs(logs: FuelLog[], referenceDate?: Date) {
  const logsByCar = new Map<string, FuelLog[]>();
  logs.forEach((log) => {
    if (typeof log.odometerKm !== "number") {
      return;
    }

    const carLogs = logsByCar.get(log.carId) ?? [];
    carLogs.push(log);
    logsByCar.set(log.carId, carLogs);
  });

  let totalCost = 0;
  let totalKm = 0;
  logsByCar.forEach((carLogs) => {
    const sortedLogs = carLogs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    sortedLogs.forEach((log, index) => {
      const previous = sortedLogs[index - 1];
      if (!previous || typeof previous.odometerKm !== "number" || typeof log.odometerKm !== "number") {
        return;
      }

      const distance = log.odometerKm - previous.odometerKm;
      if (distance <= 0) {
        return;
      }

      if (referenceDate && !isSameMonth(new Date(log.createdAt), referenceDate)) {
        return;
      }

      totalKm += distance;
      totalCost += log.paid;
    });
  });

  if (totalKm <= 0) {
    return 0;
  }

  return totalCost / totalKm;
}

function isSameMonth(date: Date, referenceDate: Date) {
  return date.getMonth() === referenceDate.getMonth() && date.getFullYear() === referenceDate.getFullYear();
}

function fullPeriodStats(logs: FuelLog[]) {
  if (logs.length === 0) {
    return null;
  }

  const sortedLogs = [...logs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const first = sortedLogs[0];
  const last = sortedLogs[sortedLogs.length - 1];
  const totalSpent = sortedLogs.reduce((sum, log) => sum + log.paid, 0);
  const totalLiters = sortedLogs.reduce((sum, log) => sum + log.liters, 0);
  const monthCount = inclusiveMonthCount(new Date(first.createdAt), new Date(last.createdAt));
  const costPerKm = costPerKmForLogs(sortedLogs);

  return {
    label: `de ${formatShortDate(first.createdAt)} a ${formatShortDate(last.createdAt)}`,
    totalSpent,
    totalLiters,
    costPerKm: costPerKm > 0 ? costPerKm : null,
    averageMonthlySpent: totalSpent / monthCount,
    averageMonthlyLiters: totalLiters / monthCount
  };
}

function inclusiveMonthCount(first: Date, last: Date) {
  const firstMonth = first.getFullYear() * 12 + first.getMonth();
  const lastMonth = last.getFullYear() * 12 + last.getMonth();
  return Math.max(1, lastMonth - firstMonth + 1);
}

function formatShortDate(value: string) {
  const date = new Date(value);
  const month = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  const year = String(date.getFullYear()).slice(-2);
  return `${date.getDate()} ${month} ${year}`;
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

function formatLiters(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(value);
}

function isHovered(state: unknown) {
  const maybeState = state as { hovered?: boolean; pressed?: boolean };
  return Boolean(maybeState.hovered || maybeState.pressed);
}
