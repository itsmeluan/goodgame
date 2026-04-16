import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GlassCard } from "@/components/GlassCard";
import { captureException } from "@/lib/monitoring";
import { palette, radius, spacing } from "@/theme/tokens";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureException(error, {
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <GlassCard style={styles.card}>
            <Text style={styles.title}>Algo saiu do trilho</Text>
            <Text style={styles.body}>
              O app encontrou um problema inesperado. Você pode tentar abrir novamente sem perder sua sessão.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tentar novamente"
              onPress={this.handleRetry}
              style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
            >
              <Text style={styles.buttonLabel}>Tentar novamente</Text>
            </Pressable>
          </GlassCard>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    color: palette.sand,
    fontSize: 24,
    fontWeight: "800",
  },
  body: {
    color: palette.mist,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    minHeight: 50,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.ember,
    paddingHorizontal: spacing.xl,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonLabel: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "800",
  },
});
