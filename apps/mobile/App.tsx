import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { healthResponseSchema, type HealthResponse } from "@starter/shared";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${apiUrl}/health`)
      .then((response) => {
        if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
        return response.json();
      })
      .then((data: unknown) => {
        if (active) setHealth(healthResponseSchema.parse(data));
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "API unavailable");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.kicker}>PROJECT STARTER</Text>
        <Text style={styles.title}>Your next project starts here.</Text>
        <Text style={styles.body}>Expo app connected to your local API.</Text>
        <View style={styles.card}>
          <Text style={styles.heading}>API status</Text>
          {health ? (
            <Text>Online · Database {health.database}</Text>
          ) : error ? (
            <Text>{error}</Text>
          ) : (
            <ActivityIndicator />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f7fb" },
  content: { flex: 1, justifyContent: "center", padding: 28 },
  kicker: { color: "#3563e9", fontWeight: "700", marginBottom: 12 },
  title: { fontSize: 38, fontWeight: "700", color: "#15213b" },
  body: { color: "#526079", fontSize: 17, marginTop: 12 },
  card: { backgroundColor: "white", borderRadius: 16, padding: 22, marginTop: 32, gap: 10 },
  heading: { fontSize: 19, fontWeight: "600" },
});
