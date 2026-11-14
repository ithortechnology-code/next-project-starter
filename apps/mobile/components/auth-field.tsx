import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

type Props = TextInputProps & { label: string; error?: string | undefined };

export function AuthField({ label, error, secureTextEntry, ...inputProps }: Props) {
  const [visible, setVisible] = useState(false);
  const secure = secureTextEntry && !visible;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.invalid : null]}>
        <TextInput
          {...inputProps}
          secureTextEntry={secure}
          accessibilityLabel={label}
          autoCorrect={false}
          style={styles.input}
          placeholderTextColor="#8290a6"
          selectionColor="#245de8"
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
            onPress={() => setVisible(!visible)}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>{visible ? "Hide" : "Show"}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  label: { color: "#263957", fontSize: 14, fontWeight: "600" },
  inputRow: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#d7dfeb",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  invalid: { borderColor: "#a83b42" },
  input: {
    flex: 1,
    minHeight: 50,
    color: "#182b4d",
    fontSize: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  toggle: {
    minWidth: 56,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  toggleText: { color: "#245de8", fontSize: 14, fontWeight: "600" },
  error: { color: "#a83b42", fontSize: 13, lineHeight: 18 },
});
