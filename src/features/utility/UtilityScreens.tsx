import React, { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { DateFormatter, UserSummary } from "../../domain";

type SharedComponent = React.ComponentType<any>;
type UtilityStyles = Record<string, any>;

type UtilityComponents = {
  Section: SharedComponent;
  Empty: SharedComponent;
};

type FaqLink = {
  label: string;
  url: string;
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
  const [openItem, setOpenItem] = useState<string | null>(null);

  const faqItems = [
    {
      id: "what",
      question: "O que é o LitroCerto?",
      answers: [
        "O LitroCerto ajuda você a registrar abastecimentos, calcular quanto pagou de verdade por litro e enxergar melhor para onde está indo seu dinheiro com combustível.",
        "Com o histórico, o app mostra gasto, litros, preço por litro, postos mais baratos, evolução por período e dados separados por veículo e combustível."
      ],
      links: [
        {
          label: "Abrir site do LitroCerto",
          url: "https://litrocerto.com.br"
        }
      ]
    },
    {
      id: "whatsapp",
      question: "Como conversar com o LitroCerto pelo WhatsApp?",
      answers: [
        "A integração com WhatsApp está em testes. O mais útil é poder registrar abastecimentos mandando áudio ou foto da bomba, em vez de digitar tudo.",
        "Você pode enviar uma foto com valor, litros e preço por litro, ou mandar uma mensagem de voz dizendo o que abasteceu. A IA prepara o registro e pede só o que faltar, como veículo, posto ou km.",
        "Antes de salvar qualquer abastecimento criado por IA, confira se veículo, posto, combustível, valor, litros e km estão corretos."
      ]
    },
    {
      id: "app-ai",
      question: "Como usar a IA dentro do app?",
      answers: [
        "A IA dentro do app ajuda a consultar gastos, comparar postos e preparar registros de abastecimento.",
        "O principal ganho é registrar abastecimentos por conversa: você pode escrever, falar ou enviar foto da bomba para a IA extrair valor, litros, preço por litro e combustível quando conseguir identificar.",
        "Você pode fazer perguntas como quanto gastou no mês, qual posto está mais barato ou pedir ajuda para registrar um abastecimento."
      ]
    },
    {
      id: "chatgpt",
      question: "Como conversar com o LitroCerto pelo ChatGPT?",
      answers: [
        "Você pode usar o GPT do LitroCerto no ChatGPT para consultar seus dados e pedir ajuda para registrar veículos, postos e abastecimentos.",
        "A parte mais prática é usar voz ou foto: mande uma imagem da bomba ou descreva o abastecimento por voz, e o ChatGPT pode preparar o registro no LitroCerto quando você autorizar.",
        "Ao usar pela primeira vez, o ChatGPT vai pedir autorização. Essa autorização vale apenas para a sua conta."
      ],
      links: [
        {
          label: "Abrir LitroCerto no ChatGPT",
          url: "https://chatgpt.com/g/g-69f8c4254da081919da115f90af3656d-litrocerto"
        }
      ]
    },
    {
      id: "claude",
      question: "Como conversar com o LitroCerto pelo Claude?",
      answers: [
        "No Claude, você pode adicionar o conector MCP remoto do LitroCerto para consultar métricas e interagir com seus dados.",
        "Com o conector, você pode pedir ao Claude para consultar gastos e preparar registros. Quando estiver usando recursos de voz ou imagem no Claude, isso facilita transformar uma fala ou foto da bomba em um abastecimento para revisar e salvar.",
        "Depois de conectar, o Claude também pedirá autorização para acessar apenas os dados da sua conta.",
        "1. Abra o Claude e entre em Configurações.",
        "2. Vá em Conectores e escolha adicionar um conector personalizado.",
        "3. No nome, use LitroCerto.",
        "4. Em URL do servidor MCP remoto, cole a URL abaixo.",
        "5. Se o Claude pedir Client ID e Client Secret, use os dados do app LitroCerto que você configurou para o conector.",
        "6. Salve o conector e clique para iniciar a autenticação.",
        "7. Faça login no LitroCerto e autorize o acesso.",
        "Depois disso, o Claude poderá consultar seus veículos, postos, abastecimentos e métricas da sua conta."
      ],
      links: [
        {
          label: "URL do conector Claude MCP",
          url: "https://app.litrocerto.com.br/mcp"
        }
      ]
    },
    {
      id: "how",
      question: "Como usar?",
      answers: [
        "Comece cadastrando seus veículos e os postos que você costuma usar. Depois, sempre que abastecer, toque no botão +, informe data, hora, veículo, combustível, valor pago, litros e, se quiser, a km atual.",
        "O app calcula automaticamente o preço por litro e atualiza os gráficos, rankings e médias. Você também pode editar um registro antigo se perceber que digitou algo errado."
      ]
    },
    {
      id: "when",
      question: "Quando usar?",
      answers: [
        "Use logo depois de abastecer, enquanto o valor pago, os litros e o posto ainda estão fáceis de conferir. Se esquecer, registre depois escolhendo a data e a hora corretas.",
        "Quanto mais abastecimentos você registra, melhores ficam os comparativos por mês, veículo, combustível e posto."
      ]
    },
    {
      id: "summary",
      question: "Como interpretar o Resumo?",
      answers: [
        "No Resumo você escolhe período, veículos e combustíveis. Os cards mostram gasto, litros, preço por litro e outras métricas considerando exatamente os filtros selecionados.",
        "Os gráficos ajudam a comparar períodos. Se um mês ficou mais caro, veja se foi por mais litros, por preço maior no litro ou por abastecer em postos mais caros."
      ]
    },
    {
      id: "stations-vehicles",
      question: "Para que servem Postos e Veículos?",
      answers: [
        "Em Postos, você acompanha onde abasteceu e compara preços médios. Em Veículos, você vê quais veículos concentram mais gasto e pode manter os dados básicos de cada um.",
        "Se aparecer mais de um posto igual ou algum abastecimento com valor estranho, corrija os cadastros para deixar os insights mais confiáveis."
      ]
    },
    {
      id: "demo",
      question: "O que são dados de exemplo?",
      answers: [
        "Se você ainda não fez login, pode navegar com dados de exemplo para entender o app.",
        "Para começar seu histórico real, faça login e registre seus próprios veículos, postos e abastecimentos."
      ]
    },
    {
      id: "privacy",
      question: "E minha privacidade?",
      answers: [
        "O LitroCerto não foi feito para rastrear seus trajetos. A localização, quando usada, serve para ajudar a identificar o posto no momento do registro.",
        "Seus abastecimentos ficam vinculados à sua conta e não aparecem para outros usuários."
      ]
    }
  ];

  return (
    <View style={styles.stack}>
      <Section title="Ajuda" rightAction={<CloseButton onClose={onClose} styles={styles} />}>
        {faqItems.map((item) => (
          <FaqItem
            key={item.id}
            item={item}
            open={openItem === item.id}
            onToggle={() => setOpenItem((current) => current === item.id ? null : item.id)}
            styles={styles}
          />
        ))}
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

function FaqItem({
  item,
  open,
  onToggle,
  styles
}: {
  item: { question: string; answers: string[]; links?: FaqLink[] };
  open: boolean;
  onToggle: () => void;
  styles: UtilityStyles;
}) {
  return (
    <View style={styles.faqItem}>
      <Pressable style={[styles.faqHeader, styles.pressableNoOutline]} onPress={onToggle}>
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <Text style={styles.faqArrow}>{open ? "−" : "+"}</Text>
      </Pressable>
      {open ? (
        <View style={styles.faqAnswer}>
          {item.answers.map((answer) => (
            <Text key={answer} style={styles.helpText}>{answer}</Text>
          ))}
          {item.links?.map((link) => (
            <Pressable
              key={link.url}
              style={[styles.helpLinkRow, styles.pressableNoOutline]}
              onPress={() => void Linking.openURL(link.url)}
            >
              <Text style={styles.helpLinkText}>{link.label}</Text>
              <Text style={styles.helpLinkUrl}>{link.url}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
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
