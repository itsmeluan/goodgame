import type { ComponentProps } from "react";

import { SafeAreaView } from "react-native-safe-area-context";

import { MeetupChatScreen } from "@/features/chat/MeetupChatScreen";
import { palette } from "@/theme/tokens";

type ChatRoomPageProps = {
  chatScreenProps: ComponentProps<typeof MeetupChatScreen>;
};

export function ChatRoomPage({ chatScreenProps }: ChatRoomPageProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.ink }} edges={["top"]}>
      <MeetupChatScreen {...chatScreenProps} />
    </SafeAreaView>
  );
}
