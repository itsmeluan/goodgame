import { StyleSheet, Text, View } from "react-native";

import { GlassCard } from "@/components/GlassCard";
import { env } from "@/lib/env";
import { palette, radius, spacing } from "@/theme/tokens";

type BackendStatusCardProps = {
  loading: boolean;
  formats: string[];
  error: string | null;
};

export function BackendStatusCard({
  loading,
  formats,
  error,
}: BackendStatusCardProps) {
  const projectHost = env.supabaseUrl.replace("https://", "");

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Backend conectado</Text>
        <Text style={styles.caption}>{projectHost}</Text>
      </View>

      {loading ? <Text style={styles.text}>Lendo catálogo de formatos no Supabase...</Text> : null}

      {!loading && !error ? (
        <Text style={styles.text}>
          Formatos vindos do banco: {formats.join(" · ")}
        </Text>
      ) : null}

      {error ? (
        <Text style={styles.error}>
          Falha ao ler dados públicos do projeto: {error}
        </Text>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    gap: 4,
  },
  title: {
    color: palette.sand,
    fontSize: 18,
    fontWeight: "700",
  },
  caption: {
    color: palette.pine,
    fontSize: 12,
  },
  text: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: palette.ember,
    fontSize: 14,
    lineHeight: 20,
  },
});
