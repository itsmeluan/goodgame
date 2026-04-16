import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";

import { palette } from "@/theme/tokens";

type AvatarProps = {
  name: string;
  uri?: string | null;
  size?: number;
};

export function Avatar({ name, uri, size = 44 }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const frameInset = 1.5;
  const innerSize = Math.max(size - frameInset * 2, 0);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  const shouldShowImage = !!uri && !imageFailed;

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {shouldShowImage ? (
        <ExpoImage
          source={uri}
          onError={() => setImageFailed(true)}
          cachePolicy="memory-disk"
          contentFit="cover"
          transition={120}
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          }}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: Math.max(12, size * 0.28) }]}>
            {initials || "GG"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 0.75,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(42,42,42,0.94)",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.moss,
  },
  initials: {
    color: palette.sand,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});
