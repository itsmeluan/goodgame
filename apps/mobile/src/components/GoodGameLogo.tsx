import { StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { GOOD_GAME_MAP_LOGO_SVG_XML } from "./goodGameMapLogoSvgXml";
import { GOOD_GAME_TEXT_SVG_XML } from "./goodGameTextSvgXml";

type GoodGameLogoProps = {
  size?: "sm" | "md" | "lg";
  scale?: number;
  /** Reserved for future theme-aware tinting; wordmark SVG is light-on-dark. */
  monochrome?: boolean;
  /**
   * Map overlay uses the logo-with-objects wordmark (`good-game-logo-objects.svg`).
   * @default "default"
   */
  variant?: "default" | "map";
};

const sizeMap = {
  sm: {
    width: 123,
    height: 63,
  },
  md: {
    width: 177,
    height: 90,
  },
  lg: {
    width: 270,
    height: 138,
  },
} as const;

export function GoodGameLogo({
  size = "md",
  scale = 1,
  variant = "default",
}: GoodGameLogoProps) {
  const baseMetrics = sizeMap[size];
  const metrics = {
    width: baseMetrics.width * scale,
    height: baseMetrics.height * scale,
  };
  const xml =
    variant === "map" ? GOOD_GAME_MAP_LOGO_SVG_XML : GOOD_GAME_TEXT_SVG_XML;

  return (
    <View
      style={[styles.wrap, { width: metrics.width, height: metrics.height }]}
      accessibilityRole="image"
      accessibilityLabel="Good Game"
    >
      <SvgXml xml={xml} width={metrics.width} height={metrics.height} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "visible",
  },
});
