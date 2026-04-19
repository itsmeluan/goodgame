import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";

import { palette } from "@/theme/tokens";

const proPlayerFramePng = require("../../assets/profile/pro-player-frame.png");

type AvatarProps = {
  name: string;
  uri?: string | null;
  size?: number;
  isPro?: boolean;
  /** Borda clara fina ao redor da foto (desligar quando há moldura externa, ex. Pro no mapa). */
  ring?: boolean;
};

export function Avatar({ name, uri, size = 44, isPro = false, ring = true }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showProFrame = isPro;
  const frameInset = ring && !showProFrame ? 1.5 : 0;
  const avatarSize = size;
  const innerSize = Math.max(avatarSize - frameInset * 2, 0);
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

  /** Pro: moldura PNG não é um círculo perfeito (medalha embaixo) — não pode haver `overflow: hidden` no wrapper externo. */
  if (showProFrame) {
    return (
      <View style={[styles.proRoot, { width: avatarSize, height: avatarSize }]}>
        <View
          style={[
            styles.proPhotoClip,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
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
              style={StyleSheet.absoluteFillObject}
            />
          ) : (
            <View style={[styles.fallback, StyleSheet.absoluteFillObject, styles.proFallbackCenter]}>
              <Text style={[styles.initials, { fontSize: Math.max(12, avatarSize * 0.28) }]}>
                {initials || "GG"}
              </Text>
            </View>
          )}
        </View>
        <ExpoImage
          source={proPlayerFramePng}
          contentFit="contain"
          style={styles.proFrame}
          pointerEvents="none"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.frame,
        ring ? null : styles.frameNoRing,
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
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
          <Text style={[styles.initials, { fontSize: Math.max(12, avatarSize * 0.28) }]}>
            {initials || "GG"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  proRoot: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  proPhotoClip: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(42,42,42,0.94)",
  },
  frame: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 0.75,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(42,42,42,0.94)",
  },
  frameNoRing: {
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  proFrame: {
    ...StyleSheet.absoluteFillObject,
  },
  proFallbackCenter: {
    alignItems: "center",
    justifyContent: "center",
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
