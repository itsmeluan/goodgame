import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";

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
}: TextFieldProps) {
  const { inputRef, handleFocus } = useKeyboardAwareInputFocus(multiline ? 148 : 110);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
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
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 7,
  },
  label: {
    color: palette.pine,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
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
    paddingVertical: 13,
    color: palette.sand,
    fontSize: 16,
    lineHeight: 21,
    backgroundColor: "transparent",
  },
  multiline: {
    minHeight: 118,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
});
