import type { ReactNode } from "react";
import { Animated, Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MeetupComposerModalProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  overlayContent?: ReactNode;
};

export function MeetupComposerModal({
  visible,
  onClose,
  children,
  overlayContent,
}: MeetupComposerModalProps) {
  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalLayer}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetKeyboard}>
          <SafeAreaView
            style={styles.sheetSafeArea}
            edges={["left", "right"]}
            pointerEvents="box-none"
          >
            <Animated.View style={StyleSheet.absoluteFill}>{children}</Animated.View>
            {overlayContent}
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalLayer: {
    flex: 1,
    backgroundColor: "rgba(4, 8, 6, 0.56)",
    justifyContent: "flex-end",
  },
  sheetKeyboard: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetSafeArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
