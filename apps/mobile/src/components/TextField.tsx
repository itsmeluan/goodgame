import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { useKeyboardAwareInputFocus } from "@/components/KeyboardAwareScrollView";
import { palette, radius, spacing } from "@/theme/tokens";

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "numeric";
  onFocus?: TextInputProps["onFocus"];
  /** Tighter label/input spacing (e.g. stacked forms like perfil / composer). */
  density?: "default" | "compact";
  /** Default gray label; `light` uses sand for dark sheet forms. */
  labelTone?: "default" | "light";
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  secureTextEntry = false,
  autoCapitalize = "sentences",
  keyboardType = "default",
  onFocus,
  density = "default",
  labelTone = "default",
}: TextFieldProps) {
  const { inputRef, handleFocus } = useKeyboardAwareInputFocus(multiline ? 148 : 110);

  return (
    <View style={[styles.wrapper, density === "compact" ? styles.wrapperCompact : null]}>
      <Text style={[styles.label, labelTone === "light" ? styles.labelLight : null]}>{label}</Text>
      <View style={styles.inputShell}>
        <AppleGlassSurface
          pointerEvents="none"
          variant="dark"
          intensity="clear"
          style={styles.inputSurface}
        />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.pine}
          keyboardAppearance="dark"
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          multiline={multiline}
          onFocus={(event) => {
            handleFocus();
            onFocus?.(event);
          }}
          style={[styles.input, multiline && styles.multiline]}
          allowFontScaling
          {...(Platform.OS === "android" ? { includeFontPadding: false } : null)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 7,
  },
  wrapperCompact: {
    gap: 5,
  },
  label: {
    color: palette.pine,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  labelLight: {
    color: palette.sand,
  },
  inputShell: {
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.06)",
    backgroundColor: "rgba(255,255,255,0.015)",
    overflow: "hidden",
  },
  inputSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.select({ ios: 11, android: 9, default: 10 }),
    paddingBottom: Platform.select({ ios: 13, android: 11, default: 12 }),
    color: palette.sand,
    fontSize: 16,
    // Omit fixed lineHeight on single-line so vertical centering matches native metrics.
    backgroundColor: "transparent",
  },
  multiline: {
    minHeight: 118,
    paddingTop: 12,
    paddingBottom: spacing.md,
    textAlignVertical: "top",
    lineHeight: 22,
  },
});
