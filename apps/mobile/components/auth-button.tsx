import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
  link?: boolean;
};

export function AuthButton({ label, onPress, disabled, loading, secondary, link }: Props) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      style={[
        styles.button,
        secondary ? styles.secondary : null,
        link ? styles.link : null,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={secondary || link ? "#245de8" : "#ffffff"} /> : null}
        <Text
          style={[
            styles.text,
            secondary ? styles.secondaryText : null,
            link ? styles.linkText : null,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: "#245de8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondary: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#d7dfeb" },
  link: { minHeight: 48, backgroundColor: "transparent", paddingHorizontal: 4 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82 },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  text: { color: "#ffffff", fontSize: 16, fontWeight: "700", textAlign: "center" },
  secondaryText: { color: "#182b4d" },
  linkText: { color: "#245de8", fontSize: 15 },
});
