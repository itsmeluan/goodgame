import { useEffect, useRef, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { spacing } from "@/theme/tokens";

type HorizontalChipRailProps = {
  children: ReactNode;
};

/** Horizontal row of chips with consistent spacing; wraps in scroll when needed on small screens. */
export function HorizontalChipRail({ children }: HorizontalChipRailProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [hasHinted, setHasHinted] = useState(false);
  const [isUserDragging, setIsUserDragging] = useState(false);

  const canScroll = contentWidth > containerWidth + 1;

  useEffect(() => {
    if (!canScroll || hasHinted || isUserDragging || !scrollRef.current) {
      return;
    }

    const forward = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: 18, animated: true });
    }, 250);
    const backward = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: 0, animated: true });
      setHasHinted(true);
    }, 700);

    return () => {
      clearTimeout(forward);
      clearTimeout(backward);
    };
  }, [canScroll, hasHinted, isUserDragging]);

  return (
    <View style={styles.wrapper} onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onContentSizeChange={(width) => setContentWidth(width)}
        onScrollBeginDrag={() => setIsUserDragging(true)}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: spacing.sm,
    paddingVertical: 2,
  },
});
