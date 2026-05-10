import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Car,
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

type ChartMetric = "spent" | "liters" | "efficiency" | "costPerKm" | "pricePerLiter";
type SummaryPeriod = "monthly" | "quarterly" | "semiannual" | "yearly" | "all";
type DateRange = {
  start: Date;
  end: Date;
  label: string;
};

const periodOptions: { label: string; value: SummaryPeriod }[] = [
  { label: "Mensal", value: "monthly" },
  { label: "Trimestral", value: "quarterly" },
  { label: "Semestral", value: "semiannual" },
  { label: "Anual", value: "yearly" },
  { label: "Todo período", value: "all" }
];

export function SummaryScreen({
  logs,
  cars,
  stations,
  visibleMonth,
  onMovePeriod,
  activeCarIds,
  onToggleCar,
  styles,
  Section,
  Empty
}: {
  logs: FuelLog[];
  cars: Car[];
  stations: Station[];
  visibleMonth: Date;
  onMovePeriod: (offsetMonths: number) => void;
  activeCarIds: string[];
  onToggleCar: (carId: string) => void;
  onEditLog: (logId: string) => void;
  styles: SummaryStyles;
  Section: SharedComponent;
  Empty: SharedComponent;
}) {
  const [chartMetric, setChartMetric] = useState<ChartMetric>("spent");
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>("monthly");
  const [vehicleFilterOpen, setVehicleFilterOpen] = useState(false);
  const [fuelFilterOpen, setFuelFilterOpen] = useState(false);
  const [periodFilterOpen, setPeriodFilterOpen] = useState(false);
  const [selectedFuel, setSelectedFuel] = useState<FuelLog["fuel"] | null>(null);
  const availableFuels = fuelTypesForLogs(logs);
  const effectiveFuel = selectedFuel && availableFuels.includes(selectedFuel) ? selectedFuel : null;
  const summaryLogs = effectiveFuel ? logs.filter((log) => log.fuel === effectiveFuel) : logs;
  const periodRange = selectedPeriodRange(summaryLogs, visibleMonth, summaryPeriod);
  const previousPeriodRangeValue = previousPeriodRange(summaryLogs, visibleMonth, summaryPeriod);
  const periodLogs = logsForRange(summaryLogs, periodRange);
  const previousPeriodLogs = previousPeriodRangeValue ? logsForRange(summaryLogs, previousPeriodRangeValue) : [];
  const periodTotal = periodLogs.reduce((sum, log) => sum + log.paid, 0);
  const previousPeriodTotal = previousPeriodLogs.reduce((sum, log) => sum + log.paid, 0);
  const periodLiters = periodLogs.reduce((sum, log) => sum + log.liters, 0);
  const previousPeriodLiters = previousPeriodLogs.reduce((sum, log) => sum + log.liters, 0);
  const periodCostPerKm = costPerKmForRange(summaryLogs, periodRange);
  const previousPeriodCostPerKm = previousPeriodRangeValue ? costPerKmForRange(summaryLogs, previousPeriodRangeValue) : null;
  const hasPreviousPeriod = previousPeriodLogs.length > 0;
  const monthTrend = hasPreviousPeriod
    ? metricTrend(periodTotal, previousPeriodTotal, "lower")
    : undefined;
  const litersTrend = hasPreviousPeriod
    ? metricTrend(periodLiters, previousPeriodLiters, "lower")
    : undefined;
  const costPerKmTrend = hasPreviousPeriod && periodCostPerKm !== null && previousPeriodCostPerKm !== null
    ? metricTrend(periodCostPerKm, previousPeriodCostPerKm, "lower")
    : undefined;
  const chartData = monthlyChartData(summaryLogs, visibleMonth, chartMetric);
  const fuelAverages = fuelAveragesForLogs(periodLogs);
  const averageFuelPrice = periodLiters > 0 ? periodTotal / periodLiters : null;
  const visibleCars = cars.filter((car) => activeCarIds.includes(car.id));
  const insight = new SummaryInsightBuilder(periodLogs, previousPeriodLogs, stations, visibleCars, summaryLogs).build();
  const periodStep = periodStepMonths(summaryPeriod);
  const showPreviousPeriod = summaryPeriod !== "all" && hasLogBeforeRange(summaryLogs, periodRange);
  const showNextPeriod = summaryPeriod !== "all" && hasLogAfterRange(summaryLogs, periodRange);

  return (
    <View style={styles.summaryStack}>
      <Section title="">
        {cars.length > 1 ? (
          <View style={[styles.summaryFilterBox, { zIndex: 30 }]}>
            <Pressable
              style={[styles.summaryFilterChip, styles.pressableNoOutline]}
              onPress={() => {
                setFuelFilterOpen(false);
                setPeriodFilterOpen(false);
                setVehicleFilterOpen((current) => !current);
              }}
            >
              <Text style={styles.summaryFilterIcon}>🚗</Text>
              <Text style={styles.summaryFilterText}>{vehicleFilterLabel(cars, activeCarIds)}</Text>
              <Text style={styles.summaryFilterArrow}>{vehicleFilterOpen ? "⌃" : "⌄"}</Text>
            </Pressable>
            {vehicleFilterOpen ? (
              <View style={styles.summaryFilterMenu}>
                {cars.map((car) => {
                  const active = activeCarIds.includes(car.id);
                  return (
                    <Pressable
                      key={car.id}
                      style={[styles.summaryFilterOption, styles.pressableNoOutline, active && styles.summaryFilterOptionActive]}
                      onPress={() => {
                        trackEvent("vehicle_filter_changed_from_summary", {
                          selected: !active
                        });
                        onToggleCar(car.id);
                      }}
                    >
                      <Text style={[styles.summaryFilterOptionText, active && styles.summaryFilterOptionTextActive]}>{car.nickname}</Text>
                      <Text style={[styles.summaryFilterCheck, active && styles.summaryFilterOptionTextActive]}>{active ? "✓" : ""}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={styles.summaryInlineFilters}>
          {availableFuels.length > 1 ? (
            <View style={[styles.summaryFilterBox, styles.summaryInlineFilterItem, { zIndex: 20 }]}>
              <Pressable
                style={[styles.summaryFilterChip, styles.summaryInlineFilterChip, styles.pressableNoOutline]}
                onPress={() => {
                  setVehicleFilterOpen(false);
                  setPeriodFilterOpen(false);
                  setFuelFilterOpen((current) => !current);
                }}
              >
                <Text style={styles.summaryFilterIcon}>⛽</Text>
                <Text style={styles.summaryFilterText} numberOfLines={1}>{fuelFilterLabel(effectiveFuel)}</Text>
                <Text style={styles.summaryFilterArrow}>{fuelFilterOpen ? "⌃" : "⌄"}</Text>
              </Pressable>
              {fuelFilterOpen ? (
                <View style={styles.summaryFilterMenu}>
                  <Pressable
                    style={[styles.summaryFilterOption, styles.pressableNoOutline, !effectiveFuel && styles.summaryFilterOptionActive]}
                    onPress={() => {
                      trackEvent("fuel_filter_changed_from_summary", { fuel_type: "all" });
                      setSelectedFuel(null);
                      setFuelFilterOpen(false);
                    }}
                  >
                    <Text style={[styles.summaryFilterOptionText, !effectiveFuel && styles.summaryFilterOptionTextActive]}>Todos os combustíveis</Text>
                    <Text style={[styles.summaryFilterCheck, !effectiveFuel && styles.summaryFilterOptionTextActive]}>{!effectiveFuel ? "✓" : ""}</Text>
                  </Pressable>
                  {availableFuels.map((fuel) => {
                    const active = fuel === effectiveFuel;
                    return (
                      <Pressable
                        key={fuel}
                        style={[styles.summaryFilterOption, styles.pressableNoOutline, active && styles.summaryFilterOptionActive]}
                        onPress={() => {
                          trackEvent("fuel_filter_changed_from_summary", { fuel_type: fuel });
                          setSelectedFuel(fuel);
                          setFuelFilterOpen(false);
                        }}
                      >
                        <Text style={[styles.summaryFilterOptionText, active && styles.summaryFilterOptionTextActive]}>{fuel}</Text>
                        <Text style={[styles.summaryFilterCheck, active && styles.summaryFilterOptionTextActive]}>{active ? "✓" : ""}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={[styles.summaryFilterBox, styles.summaryInlineFilterItem, { zIndex: 10 }]}>
            <Pressable
              style={[styles.summaryFilterChip, styles.summaryInlineFilterChip, styles.pressableNoOutline]}
              onPress={() => {
                setVehicleFilterOpen(false);
                setFuelFilterOpen(false);
                setPeriodFilterOpen((current) => !current);
              }}
            >
              <Text style={styles.summaryFilterIcon}>📅</Text>
              <Text style={styles.summaryFilterText} numberOfLines={1}>{periodFilterLabel(summaryPeriod)}</Text>
              <Text style={styles.summaryFilterArrow}>{periodFilterOpen ? "⌃" : "⌄"}</Text>
            </Pressable>
            {periodFilterOpen ? (
              <View style={styles.summaryFilterMenu}>
                {periodOptions.map((option) => {
                  const active = option.value === summaryPeriod;
                  return (
                    <Pressable
                      key={option.value}
                      style={[styles.summaryFilterOption, styles.pressableNoOutline, active && styles.summaryFilterOptionActive]}
                      onPress={() => {
                        trackEvent("summary_period_changed", { period: option.value });
                        setSummaryPeriod(option.value);
                        setPeriodFilterOpen(false);
                      }}
                    >
                      <Text style={[styles.summaryFilterOptionText, active && styles.summaryFilterOptionTextActive]}>{option.label}</Text>
                      <Text style={[styles.summaryFilterCheck, active && styles.summaryFilterOptionTextActive]}>{active ? "✓" : ""}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.monthSwitcher}>
          {showPreviousPeriod ? (
            <Pressable style={styles.iconButton} onPress={() => onMovePeriod(-periodStep)}>
              <Text style={styles.iconButtonText}>‹</Text>
            </Pressable>
          ) : (
            <View style={styles.iconButtonSpacer} />
          )}
          <Text style={styles.monthTitle}>{periodRange.label}</Text>
          {showNextPeriod ? (
            <Pressable style={styles.iconButton} onPress={() => onMovePeriod(periodStep)}>
              <Text style={styles.iconButtonText}>›</Text>
            </Pressable>
          ) : (
            <View style={styles.iconButtonSpacer} />
          )}
        </View>

        <View style={styles.summaryMetricGrid}>
          <MetricCard
            styles={styles}
            label="Gasto"
            value={formatCurrency(periodTotal)}
            small={periodTotal >= 100}
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
            value={periodLiters ? formatLiters(periodLiters) : ""}
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
            value={periodCostPerKm === null ? "-" : `${formatCurrency(periodCostPerKm)}/km`}
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
            value="Sem dados"
            small
            trend={undefined}
            muted
            active={chartMetric === "efficiency"}
            onPress={() => {
              trackEvent("summary_chart_metric_changed", { metric: "efficiency" });
              setChartMetric("efficiency");
            }}
          />
          <MetricCard
            styles={styles}
            label="Preço/L"
            value={averageFuelPrice === null ? "-" : `${formatCurrency(averageFuelPrice)}/L`}
            small
            trend={undefined}
            active={chartMetric === "pricePerLiter"}
            compact
            onPress={() => {
              trackEvent("summary_chart_metric_changed", { metric: "pricePerLiter" });
              setChartMetric("pricePerLiter");
            }}
          />
          {fuelAverages.slice(0, 4).map((fuel) => (
            <MetricCard
              key={fuel.name}
              styles={styles}
              label={fuel.name}
              value={`${formatCurrency(fuel.average)}/L`}
              small
              trend={undefined}
              active={chartMetric === "pricePerLiter" && effectiveFuel === fuel.name}
              compact
              onPress={() => {
                trackEvent("fuel_average_clicked", {
                  fuel_type: fuel.name
                });
                setSelectedFuel(fuel.name);
                setChartMetric("pricePerLiter");
              }}
            />
          ))}
        </View>

        {chartMetric === "pricePerLiter" ? (
          <FuelPriceEvolutionChart data={fuelPriceEvolutionData(summaryLogs, visibleMonth)} styles={styles} Empty={Empty} />
        ) : (
          <Bars data={chartData} styles={styles} Empty={Empty} />
        )}

        {insight ? (
          <View style={styles.aiInsightCard}>
            <View style={styles.aiInsightHeader}>
              <Text style={styles.aiInsightIcon}>✦</Text>
              <Text style={styles.aiInsightBadge}>IA · Insight</Text>
            </View>
            <Text style={styles.aiInsightText}>{insight}</Text>
          </View>
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
  muted,
  compact,
  onPress,
  styles
}: {
  label: string;
  value: string;
  small?: boolean;
  trend?: MetricTrend;
  active?: boolean;
  muted?: boolean;
  compact?: boolean;
  onPress: () => void;
  styles: SummaryStyles;
}) {
  return (
    <Pressable
      style={(state) => [
        styles.metricCard,
        styles.pressableNoOutline,
        compact && styles.metricCardCompact,
        isHovered(state) && !active && styles.metricCardHover,
        active && styles.metricCardActive
      ]}
      onPress={onPress}
    >
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, small && styles.metricValueSmall, muted && styles.metricValueMuted]}>{value}</Text>
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
            <View style={[styles.barGridLine, styles.barGridLineTop]} />
            <View style={[styles.barGridLine, styles.barGridLineMiddle]} />
            <View style={[styles.barGridLine, styles.barGridLineBottom]} />
            <View style={[styles.barFill, { height: item.value > 0 ? `${Math.max(10, (item.value / max) * 100)}%` : "0%" }]} />
            {item.display ? <Text style={[styles.barValue, item.value <= 0 && styles.barValueEmpty]}>{item.display}</Text> : null}
          </View>
          <Text style={styles.barLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function FuelPriceEvolutionChart({
  data,
  styles,
  Empty
}: {
  data: {
    fuel: string;
    points: { label: string; value: number; display: string }[];
  }[];
  styles: SummaryStyles;
  Empty: SharedComponent;
}) {
  if (data.length === 0) {
    return <Empty text="Registre mais abastecimentos para ver a evolução por combustível." />;
  }

  const max = Math.max(...data.flatMap((fuel) => fuel.points.map((point) => point.value)), 1);

  return (
    <View style={styles.fuelEvolutionChart}>
      {data.map((fuel) => (
        <View key={fuel.fuel} style={styles.fuelEvolutionRow}>
          <Text style={styles.fuelEvolutionTitle}>{fuel.fuel}</Text>
          <View style={styles.fuelEvolutionBars}>
            {fuel.points.map((point) => (
              <View key={point.label} style={styles.fuelEvolutionColumn}>
                <View style={styles.fuelEvolutionTrack}>
                  <View
                    style={[
                      styles.fuelEvolutionFill,
                      { height: point.value > 0 ? `${Math.max(12, (point.value / max) * 100)}%` : "0%" }
                    ]}
                  />
                  <Text style={[styles.fuelEvolutionValue, point.value <= 0 && styles.barValueEmpty]}>{point.display}</Text>
                </View>
                <Text style={styles.fuelEvolutionLabel}>{point.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function fuelPriceEvolutionData(logs: FuelLog[], visibleMonth: Date) {
  const months = Array.from({ length: 3 }, (_item, index) =>
    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - (2 - index), 1)
  );
  const fuels = Array.from(new Set(months.flatMap((month) => logsForMonth(logs, month).map((log) => log.fuel)))).sort();

  return fuels
    .map((fuel) => ({
      fuel,
      points: months.map((month) => {
        const monthFuelLogs = logsForMonth(logs, month).filter((log) => log.fuel === fuel);
        const paid = monthFuelLogs.reduce((sum, log) => sum + log.paid, 0);
        const liters = monthFuelLogs.reduce((sum, log) => sum + log.liters, 0);
        const value = liters > 0 ? paid / liters : 0;

        return {
          label: month.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
          value,
          display: value > 0 ? `${formatCurrency(value)}/L` : "—"
        };
      })
    }))
    .filter((fuel) => fuel.points.some((point) => point.value > 0));
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
    return "—";
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

function formatMonthTitle(date: Date) {
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function selectedPeriodRange(logs: FuelLog[], visibleMonth: Date, period: SummaryPeriod): DateRange {
  if (period === "all") {
    return allPeriodRange(logs, visibleMonth);
  }

  const start = periodStart(visibleMonth, period);
  const end = endOfMonth(new Date(start.getFullYear(), start.getMonth() + periodStepMonths(period) - 1, 1));

  return {
    start,
    end,
    label: periodRangeLabel(start, end, period)
  };
}

function previousPeriodRange(logs: FuelLog[], visibleMonth: Date, period: SummaryPeriod) {
  if (period === "all") {
    return null;
  }

  return selectedPeriodRange(logs, addMonths(visibleMonth, -periodStepMonths(period)), period);
}

function allPeriodRange(logs: FuelLog[], visibleMonth: Date): DateRange {
  if (logs.length === 0) {
    const start = startOfMonth(visibleMonth);
    return {
      start,
      end: endOfMonth(visibleMonth),
      label: "Todo período"
    };
  }

  const sortedLogs = [...logs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const first = new Date(sortedLogs[0].createdAt);
  const last = new Date(sortedLogs[sortedLogs.length - 1].createdAt);

  return {
    start: startOfDay(first),
    end: endOfDay(last),
    label: `de ${formatShortDate(sortedLogs[0].createdAt)} a ${formatShortDate(sortedLogs[sortedLogs.length - 1].createdAt)}`
  };
}

function periodStart(visibleMonth: Date, period: SummaryPeriod) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  if (period === "quarterly") {
    return new Date(year, Math.floor(month / 3) * 3, 1);
  }

  if (period === "semiannual") {
    return new Date(year, month < 6 ? 0 : 6, 1);
  }

  if (period === "yearly") {
    return new Date(year, 0, 1);
  }

  return startOfMonth(visibleMonth);
}

function periodStepMonths(period: SummaryPeriod) {
  if (period === "quarterly") {
    return 3;
  }

  if (period === "semiannual") {
    return 6;
  }

  if (period === "yearly") {
    return 12;
  }

  return 1;
}

function periodRangeLabel(start: Date, end: Date, period: SummaryPeriod) {
  if (period === "monthly") {
    return formatMonthTitle(start);
  }

  if (period === "yearly") {
    return String(start.getFullYear());
  }

  return `${formatShortMonthYear(start)} a ${formatShortMonthYear(end)}`;
}

function formatShortMonthYear(date: Date) {
  const month = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${month}. de ${String(date.getFullYear()).slice(-2)}`;
}

function vehicleFilterLabel(cars: Car[], activeCarIds: string[]) {
  if (activeCarIds.length === cars.length) {
    return "Todos os veículos";
  }

  if (activeCarIds.length === 1) {
    return cars.find((car) => car.id === activeCarIds[0])?.nickname ?? "1 veículo";
  }

  return `${activeCarIds.length} veículos`;
}

function fuelTypesForLogs(logs: FuelLog[]): FuelLog["fuel"][] {
  return Array.from(new Set(logs.map((log) => log.fuel))).sort();
}

function fuelFilterLabel(fuel: FuelLog["fuel"] | null) {
  if (!fuel) {
    return "Todos os combustíveis";
  }

  return fuel;
}

function periodFilterLabel(period: SummaryPeriod) {
  return periodOptions.find((option) => option.value === period)?.label ?? "Mensal";
}

class SummaryInsightBuilder {
  constructor(
    private readonly currentLogs: FuelLog[],
    private readonly previousLogs: FuelLog[],
    private readonly stations: Station[],
    private readonly cars: Car[],
    private readonly allLogs: FuelLog[]
  ) {}

  build() {
    const dataQualityInsight = this.dataQualityInsight();
    if (dataQualityInsight) {
      return dataQualityInsight;
    }

    if (this.currentLogs.length === 0) {
      return this.emptyPeriodInsight();
    }

    if (this.previousLogs.length === 0) {
      return this.firstPeriodInsight();
    }

    const currentSpent = this.totalSpent(this.currentLogs);
    const previousSpent = this.totalSpent(this.previousLogs);
    const spentChange = percentChange(currentSpent, previousSpent);
    if (spentChange === null) {
      return null;
    }

    const litersChange = percentChange(this.totalLiters(this.currentLogs), this.totalLiters(this.previousLogs));
    const priceChange = percentChange(this.averagePrice(this.currentLogs), this.averagePrice(this.previousLogs));
    const stationHint = this.cheapestStationHint();

    if (spentChange < -0.5) {
      return this.lowerSpendInsight(spentChange, litersChange, priceChange, stationHint);
    }

    if (spentChange > 0.5) {
      return this.higherSpendInsight(spentChange, litersChange, priceChange, stationHint);
    }

    return stationHint
      ? `Seu gasto ficou praticamente estável. ${stationHint}`
      : "Seu gasto ficou praticamente estável em relação ao período anterior.";
  }

  private dataQualityInsight() {
    const suspiciousLog = this.suspiciousFuelLog();
    if (suspiciousLog) {
      return suspiciousLog;
    }

    const duplicatedStation = this.duplicatedStationAddress();
    if (duplicatedStation) {
      return duplicatedStation;
    }

    const neverFueledCar = this.carWithoutFuelLogs();
    if (neverFueledCar) {
      return `Você já pode registrar o primeiro abastecimento do ${neverFueledCar.nickname}. Isso libera histórico, médias e comparações para esse veículo.`;
    }

    const missingOdometerCount = this.allLogs.filter((log) => typeof log.odometerKm !== "number").length;
    if (this.allLogs.length >= 3 && missingOdometerCount / this.allLogs.length >= 0.6) {
      return "Muitos abastecimentos estão sem km atual. Preencher esse campo ajuda o LitroCerto a calcular consumo e R$/km.";
    }

    return null;
  }

  private suspiciousFuelLog() {
    const suspicious = [...this.allLogs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .find((log) => this.isSuspiciousLog(log));

    if (!suspicious) {
      return null;
    }

    const vehicle = this.cars.find((car) => car.id === suspicious.carId)?.nickname ?? "veículo";
    const station = this.stations.find((item) => item.id === suspicious.stationId)?.name ?? "posto";
    return `Revise o abastecimento #${suspicious.sequence ?? suspicious.id}: ${vehicle}, ${station}, ${formatCurrency(suspicious.pricePerLiter)}/L. Esse preço parece fora do padrão.`;
  }

  private isSuspiciousLog(log: FuelLog) {
    if (!Number.isFinite(log.paid) || !Number.isFinite(log.liters) || log.paid <= 0 || log.liters <= 0) {
      return true;
    }

    if (!Number.isFinite(log.pricePerLiter) || log.pricePerLiter < 1.5 || log.pricePerLiter > 20) {
      return true;
    }

    const comparableLogs = this.allLogs
      .filter((item) => item.id !== log.id && item.fuel === log.fuel && item.pricePerLiter > 0)
      .map((item) => item.pricePerLiter)
      .sort((a, b) => a - b);
    if (comparableLogs.length < 3) {
      return false;
    }

    const median = comparableLogs[Math.floor(comparableLogs.length / 2)];
    return log.pricePerLiter > median * 1.8 || log.pricePerLiter < median * 0.55;
  }

  private duplicatedStationAddress() {
    const groups = new Map<string, Station[]>();
    this.stations.forEach((station) => {
      const key = normalizedStationAddress(station);
      if (!key) {
        return;
      }

      groups.set(key, [...(groups.get(key) ?? []), station]);
    });

    const duplicated = Array.from(groups.values()).find((group) => group.length > 1);
    if (!duplicated) {
      return null;
    }

    return `Há ${duplicated.length} postos cadastrados no mesmo endereço: ${duplicated.map((station) => station.name).join(", ")}. Vale unificar para o ranking ficar mais correto.`;
  }

  private carWithoutFuelLogs() {
    return this.cars.find((car) => !this.allLogs.some((log) => log.carId === car.id));
  }

  private emptyPeriodInsight() {
    if (this.allLogs.length === 0) {
      return "Registre seu primeiro abastecimento para começar a ver gastos, litros, preço por litro e ranking de postos.";
    }

    return "Não há abastecimentos neste período. Se você esqueceu algum, registre com a data correta para manter o histórico completo.";
  }

  private firstPeriodInsight() {
    const stationHint = this.cheapestStationHint();
    if (stationHint) {
      return `${this.currentLogs.length} abastecimentos registrados neste período. ${stationHint}`;
    }

    return `${this.currentLogs.length} abastecimentos registrados neste período. Conforme você preencher outros períodos, eu comparo a evolução.`;
  }

  private lowerSpendInsight(
    spentChange: number,
    litersChange: number | null,
    priceChange: number | null,
    stationHint: string | null
  ) {
    const spentText = formatPercent(Math.abs(spentChange));

    if (priceChange !== null && priceChange < -0.5) {
      return `Você gastou ${spentText} menos e o preço médio por litro caiu ${formatPercent(Math.abs(priceChange))}. ${stationHint ?? "Boa direção."}`;
    }

    if (litersChange !== null && litersChange < -0.5) {
      return `Você gastou ${spentText} menos, principalmente porque abasteceu ${formatPercent(Math.abs(litersChange))} menos litros.`;
    }

    return `Você gastou ${spentText} menos mesmo sem grande queda nos litros. ${stationHint ?? "Vale manter esse padrão."}`;
  }

  private higherSpendInsight(
    spentChange: number,
    litersChange: number | null,
    priceChange: number | null,
    stationHint: string | null
  ) {
    const spentText = formatPercent(spentChange);

    if (priceChange !== null && priceChange > 0.5) {
      return `Você gastou ${spentText} mais e o preço médio por litro subiu ${formatPercent(priceChange)}. ${stationHint ?? "Vale comparar os postos antes de abastecer."}`;
    }

    if (litersChange !== null && litersChange > 0.5) {
      return `Você gastou ${spentText} mais porque abasteceu ${formatPercent(litersChange)} mais litros. O preço médio não parece ser o principal vilão.`;
    }

    return `Você gastou ${spentText} mais. ${stationHint ?? "Vale revisar posto, combustível e frequência dos abastecimentos."}`;
  }

  private cheapestStationHint() {
    const averages = this.stationAverages();
    if (averages.length < 2) {
      return null;
    }

    const cheapest = averages[0];
    return `${cheapest.name} foi o posto mais barato do período: ${formatCurrency(cheapest.average)}/L.`;
  }

  private stationAverages() {
    const stationTotals = new Map<string, { paid: number; liters: number }>();
    this.currentLogs.forEach((log) => {
      const current = stationTotals.get(log.stationId) ?? { paid: 0, liters: 0 };
      current.paid += log.paid;
      current.liters += log.liters;
      stationTotals.set(log.stationId, current);
    });

    return Array.from(stationTotals.entries())
      .filter(([_stationId, values]) => values.liters > 0)
      .map(([stationId, values]) => ({
        name: this.stations.find((station) => station.id === stationId)?.name ?? "Posto",
        average: values.paid / values.liters
      }))
      .sort((a, b) => a.average - b.average);
  }

  private totalSpent(logs: FuelLog[]) {
    return logs.reduce((sum, log) => sum + log.paid, 0);
  }

  private totalLiters(logs: FuelLog[]) {
    return logs.reduce((sum, log) => sum + log.liters, 0);
  }

  private averagePrice(logs: FuelLog[]) {
    const liters = this.totalLiters(logs);
    if (liters <= 0) {
      return 0;
    }

    return this.totalSpent(logs) / liters;
  }
}

function normalizedStationAddress(station: Station) {
  const value = [station.address, station.city, station.state]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!value || value === "sem endereco" || value === "cadastrado manualmente") {
    return "";
  }

  return value;
}

function costPerKmForMonth(logs: FuelLog[], referenceDate: Date) {
  const value = costPerKmForRange(logs, {
    start: startOfMonth(referenceDate),
    end: endOfMonth(referenceDate),
    label: formatMonthTitle(referenceDate)
  });
  return value;
}

function costPerKmForRange(logs: FuelLog[], range: DateRange) {
  const value = costPerKmForLogs(logs, range);
  return value > 0 ? value : null;
}

function costPerKmForLogs(logs: FuelLog[], range: DateRange) {
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

      if (!isDateInsideRange(new Date(log.createdAt), range)) {
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

function logsForRange(logs: FuelLog[], range: DateRange) {
  return logs.filter((log) => isDateInsideRange(new Date(log.createdAt), range));
}

function hasLogBeforeRange(logs: FuelLog[], range: DateRange) {
  return logs.some((log) => new Date(log.createdAt).getTime() < range.start.getTime());
}

function hasLogAfterRange(logs: FuelLog[], range: DateRange) {
  return logs.some((log) => new Date(log.createdAt).getTime() > range.end.getTime());
}

function isDateInsideRange(date: Date, range: DateRange) {
  const timestamp = date.getTime();
  return timestamp >= range.start.getTime() && timestamp <= range.end.getTime();
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function fuelAveragesForLogs(logs: FuelLog[]): { name: FuelLog["fuel"]; average: number }[] {
  const fuels = new Map<FuelLog["fuel"], { paid: number; liters: number }>();
  logs.forEach((log) => {
    const current = fuels.get(log.fuel) ?? { paid: 0, liters: 0 };
    current.paid += log.paid;
    current.liters += log.liters;
    fuels.set(log.fuel, current);
  });

  return Array.from(fuels.entries())
    .filter(([_fuel, values]) => values.liters > 0)
    .map(([name, values]) => ({
      name,
      average: values.paid / values.liters
    }))
    .sort((a, b) => a.average - b.average);
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
  const arrow = change > 0 ? "↑ " : change < 0 ? "↓ " : "";

  return {
    label: `${arrow}${prefix}${rounded}% vs mês anterior`,
    status
  };
}

function percentChange(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
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
