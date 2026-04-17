import { StyleSheet, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import { APPLE_LIST_COMPACT_ICON_SIZE } from "@/components/AppleListNavigation";
import type { MeetupPost } from "@/types/domain";

type ChatMeetupListLeadingProps = {
  meetup: MeetupPost;
};

export function ChatMeetupListLeading({ meetup }: ChatMeetupListLeadingProps) {
  return (
    <View style={styles.wrap}>
      <Avatar name={meetup.title} uri={meetup.chatImageUrl} size={APPLE_LIST_COMPACT_ICON_SIZE} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: APPLE_LIST_COMPACT_ICON_SIZE,
    height: APPLE_LIST_COMPACT_ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
