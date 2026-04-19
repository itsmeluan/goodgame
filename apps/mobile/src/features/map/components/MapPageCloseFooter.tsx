import { StyleSheet, View } from "react-native";

import { MapClosePageButton } from "@/features/map/components/MapClosePageButton";
import { spacing } from "@/theme/tokens";

type MapPageCloseFooterProps = {
  bottomInset: number;
  onClose: () => void;
};

/**
 * Barra fixa no rodapé com “Voltar ao mapa”, alinhada ao grid (`spacing.lg`) e à safe area inferior.
 */
export function MapPageCloseFooter({ bottomInset, onClose }: MapPageCloseFooterProps) {
  return (
    <View
      style={[
        styles.footer,
        {
          paddingBottom: bottomInset + spacing.md,
        },
      ]}
    >
      <MapClosePageButton onPress={onClose} variant="footer" />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
