import React, { createContext, useContext } from "react";
import { Text, View } from "react-native";

type LayoutStyles = Record<string, any>;
type LayoutContextValue = {
  styles: LayoutStyles;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({
  value,
  children
}: {
  value: LayoutContextValue;
  children: React.ReactNode;
}) {
  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

export function Section({
  title,
  children,
  rightAction
}: {
  title: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
}) {
  const { styles } = useLayout();

  return (
    <View style={styles.section}>
      {title || rightAction ? (
        <View style={styles.sectionTitleRow}>
          {title ? <Text style={styles.sectionTitle}>{title}</Text> : <View />}
          {rightAction}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  const { styles } = useLayout();

  return <Text style={styles.empty}>{text}</Text>;
}

function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("Layout components must be rendered inside LayoutProvider.");
  }

  return context;
}
