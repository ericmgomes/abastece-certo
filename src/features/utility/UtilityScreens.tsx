import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { DateFormatter, UserSummary } from "../../domain";

type SharedComponent = React.ComponentType<any>;
type UtilityStyles = Record<string, any>;

type UtilityComponents = {
  Section: SharedComponent;
  Empty: SharedComponent;
};

export function HelpScreen({
  onClose,
  styles,
  components
}: {
  onClose: () => void;
  styles: UtilityStyles;
  components: Pick<UtilityComponents, "Section">;
}) {
  const { Section } = components;

  return (
    <View style={styles.stack}>
      <Section title="Ajuda" rightAction={<CloseButton onClose={onClose} styles={styles} />}>
        <View style={styles.helpBlock}>
          <Text style={styles.itemTitle}>O que é?</Text>
          <Text style={styles.helpText}>Um app simples para registrar abastecimentos, descobrir o preço real por litro e entender quais postos valem mais a pena para você.</Text>
        </View>
        <View style={styles.helpBlock}>
          <Text style={styles.itemTitle}>Como usar?</Text>
          <Text style={styles.helpText}>Cadastre seus veículos, registre cada abastecimento e confirme o posto sugerido pelo app. O Litro Certo calcula preço por litro, gasto mensal, rankings e histórico.</Text>
        </View>
        <View style={styles.helpBlock}>
          <Text style={styles.itemTitle}>Quando usar?</Text>
          <Text style={styles.helpText}>Use sempre que abastecer para guardar valor, litros, posto e data. Se esquecer de registrar na hora, você pode lançar depois escolhendo a data correta.</Text>
        </View>
      </Section>
    </View>
  );
}

export function PrivacyScreen({
  onClose,
  styles,
  components
}: {
  onClose: () => void;
  styles: UtilityStyles;
  components: Pick<UtilityComponents, "Section">;
}) {
  const { Section } = components;

  return (
    <View style={styles.stack}>
      <Section title="Privacidade" rightAction={<CloseButton onClose={onClose} styles={styles} />}>
        <Text style={styles.helpText}>O Litro Certo não rastreia seus trajetos. A localização é usada no momento do registro para sugerir o posto próximo, e seus abastecimentos não aparecem para outros usuários do app.</Text>
        <Text style={styles.helpText}>Você não fica sendo acompanhado em segundo plano. A ideia é registrar combustível, não vigiar onde você anda.</Text>
      </Section>
    </View>
  );
}

export function UsersAdmin({
  onClose,
  listUserSummaries,
  styles,
  components
}: {
  onClose: () => void;
  listUserSummaries: () => Promise<UserSummary[]>;
  styles: UtilityStyles;
  components: UtilityComponents;
}) {
  const { Section, Empty } = components;
  const [summaries, setSummaries] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    listUserSummaries()
      .then((items) => {
        if (cancelled) {
          return;
        }

        setSummaries(items);
        setError(null);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setError("Não foi possível carregar usuários. Confira as policies de admin no Supabase.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [listUserSummaries]);

  const totalVehicles = summaries.reduce((sum, item) => sum + item.vehicles, 0);
  const totalStations = summaries.reduce((sum, item) => sum + item.stations, 0);
  const totalFuelLogs = summaries.reduce((sum, item) => sum + item.fuelLogs, 0);

  return (
    <View style={styles.stack}>
      <Section title="Usuários" rightAction={<CloseButton onClose={onClose} styles={styles} />}>
        <View style={styles.grid}>
          <MetricCard label="Usuários" value={String(summaries.length)} styles={styles} />
          <MetricCard label="Abastecimentos" value={String(totalFuelLogs)} styles={styles} />
          <MetricCard label="Postos" value={String(totalStations)} styles={styles} />
          <MetricCard label="Veículos" value={String(totalVehicles)} styles={styles} />
        </View>
        <View style={styles.mapListDivider} />
        {loading ? <Text style={styles.muted}>Carregando usuários...</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!loading && !error && summaries.length === 0 ? (
          <Empty text="Nenhum usuário encontrado." />
        ) : null}
        {summaries.map((summary) => (
          <View key={summary.ownerId} style={styles.listItem}>
            <View style={styles.logInfo}>
              <Text style={styles.itemTitle}>{summary.name}</Text>
              <Text style={styles.muted}>{summary.email}</Text>
              <Text style={styles.muted}>{DateFormatter.compact(summary.updatedAt)}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.itemTitle}>{summary.vehicles} veículos</Text>
              <Text style={styles.muted}>{summary.stations} postos</Text>
              <Text style={styles.muted}>{summary.fuelLogs} abastecimentos</Text>
            </View>
          </View>
        ))}
      </Section>
    </View>
  );
}

export function DemoBanner({
  onOpenAuth,
  styles
}: {
  onOpenAuth: () => void;
  styles: UtilityStyles;
}) {
  return (
    <View style={styles.demoBanner}>
      <View style={styles.demoBannerTextGroup}>
        <Text style={styles.demoBannerTitle}>Você está vendo dados de exemplo</Text>
        <Text style={styles.demoBannerText}>Faça login para começar com seus próprios dados.</Text>
      </View>
      <Pressable style={styles.demoBannerButton} onPress={onOpenAuth}>
        <Text style={styles.demoBannerButtonText}>Login</Text>
      </Pressable>
    </View>
  );
}

function CloseButton({ onClose, styles }: { onClose: () => void; styles: UtilityStyles }) {
  return (
    <Pressable style={styles.closeButton} onPress={onClose}>
      <Text style={styles.closeButtonText}>×</Text>
    </Pressable>
  );
}

function MetricCard({
  label,
  value,
  styles
}: {
  label: string;
  value: string;
  styles: UtilityStyles;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}
