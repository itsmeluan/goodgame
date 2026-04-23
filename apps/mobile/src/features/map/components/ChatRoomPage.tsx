import type { ComponentProps } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { MeetupChatScreen } from "@/features/chat/MeetupChatScreen";
import { styles } from "@/features/map/MapHomeScreen.styles";

type ChatRoomPageProps = {
  chatScreenProps: ComponentProps<typeof MeetupChatScreen>;
};

export function ChatRoomPage({ chatScreenProps }: ChatRoomPageProps) {
  return (
    <SafeAreaView style={styles.pageSafeArea} edges={["top"]}>
      <View pointerEvents="none" style={styles.pageBackdropBase} />
      <AppleGlassSurface
        pointerEvents="none"
        variant="dark"
        intensity="clear"
        style={styles.pageBackdropGlass}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <MeetupChatScreen {...chatScreenProps} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
