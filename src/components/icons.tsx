import React from "react";
import { View } from "react-native";

type IconStyles = Record<string, any>;

export function TrashIcon({ styles }: { styles: IconStyles }) {
  return (
    <View style={styles.trashIcon}>
      <View style={styles.trashIconLid} />
      <View style={styles.trashIconCan}>
        <View style={styles.trashIconLine} />
        <View style={styles.trashIconLine} />
      </View>
    </View>
  );
}
