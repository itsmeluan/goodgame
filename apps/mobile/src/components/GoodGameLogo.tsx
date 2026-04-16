import { Image, StyleSheet, View } from "react-native";

type GoodGameLogoProps = {
  size?: "sm" | "md" | "lg";
  monochrome?: boolean;
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

const logoAsset = require("../../assets/brand/good-game-logo-clean.png");

export function GoodGameLogo({ size = "md" }: GoodGameLogoProps) {
  const metrics = sizeMap[size];

  return (
    <View style={[styles.wrap, { width: metrics.width, height: metrics.height }]}>
      <Image
        source={logoAsset}
        style={styles.image}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "visible",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
