import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { palette } from "@/theme/tokens";

type LoadingSpinnerProps = {
  size?: number;
  color?: string;
  dotCount?: number;
  style?: StyleProp<ViewStyle>;
};

export function LoadingSpinner({
  size = 32,
  color = palette.ember,
  dotCount = 8,
  style,
}: LoadingSpinnerProps) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    rotation.setValue(0);
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [rotation]);

  const dotSize = Math.max(3, Math.round(size * 0.16));
  const radius = size / 2 - dotSize / 2;
  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando"
      style={[{ width: size, height: size }, style]}
    >
      <Animated.View style={[styles.track, { transform: [{ rotate }] }]}>
        {Array.from({ length: dotCount }).map((_, index) => {
          const angle = -Math.PI / 2 + (index * Math.PI * 2) / dotCount;
          const left = size / 2 + Math.cos(angle) * radius - dotSize / 2;
          const top = size / 2 + Math.sin(angle) * radius - dotSize / 2;

          return (
            <View
              key={`spinner-dot-${index}`}
              style={[
                styles.dot,
                {
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  left,
                  top,
                  opacity: 0.24 + (index / Math.max(dotCount - 1, 1)) * 0.76,
                  backgroundColor: color,
                },
              ]}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    ...StyleSheet.absoluteFillObject,
  },
  dot: {
    position: "absolute",
  },
});
