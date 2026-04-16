import { MaterialIcons } from "@expo/vector-icons";
import { SymbolView, type SFSymbol, type SymbolType, type SymbolWeight } from "expo-symbols";
import { Platform, type StyleProp, type ViewStyle } from "react-native";

type AppIconProps = {
  iosName: SFSymbol;
  fallbackName: keyof typeof MaterialIcons.glyphMap;
  size: number;
  color: string;
  type?: SymbolType;
  weight?: SymbolWeight;
  style?: StyleProp<ViewStyle>;
};

export function AppIcon({
  iosName,
  fallbackName,
  size,
  color,
  type = "hierarchical",
  weight = "semibold",
  style,
}: AppIconProps) {
  const fallback = <MaterialIcons name={fallbackName} size={size} color={color} style={style} />;

  if (Platform.OS !== "ios") {
    return fallback;
  }

  return (
    <SymbolView
      name={iosName}
      fallback={fallback}
      size={size}
      tintColor={color}
      type={type}
      weight={weight}
      style={style}
    />
  );
}
