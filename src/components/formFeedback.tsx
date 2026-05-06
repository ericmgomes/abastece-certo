import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, Text, TextStyle, ViewStyle } from "react-native";

export type ToastNotice = {
  id: number;
  message: string;
  anchor: string;
};

type FormFeedbackStyles = {
  sideToast: StyleProp<ViewStyle>;
  sideToastText: StyleProp<TextStyle>;
};

export function showFieldNotice(
  setNotice: React.Dispatch<React.SetStateAction<ToastNotice | null>>,
  message: string,
  anchor = "form"
) {
  setNotice({ id: Date.now(), message, anchor });
}

export function FieldToast({
  notice,
  anchor,
  styles
}: {
  notice: ToastNotice | null;
  anchor: string;
  styles: FormFeedbackStyles;
}) {
  if (notice?.anchor !== anchor) {
    return null;
  }

  return <SideToast notice={notice} styles={styles} />;
}

export function SideToast({ notice, styles }: { notice: ToastNotice | null; styles: FormFeedbackStyles }) {
  const translateX = useRef(new Animated.Value(36)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!notice) {
      return;
    }

    translateX.setValue(36);
    opacity.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true })
      ]),
      Animated.delay(1100),
      Animated.parallel([
        Animated.timing(translateX, { toValue: 36, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true })
      ])
    ]).start();
  }, [notice?.id]);

  if (!notice) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.sideToast, { opacity, transform: [{ translateX }] }]}
    >
      <Text style={styles.sideToastText}>{notice.message}</Text>
    </Animated.View>
  );
}
