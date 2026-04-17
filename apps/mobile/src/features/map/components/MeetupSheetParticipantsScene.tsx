import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { MeetupParticipantsBlock } from "@/features/chat/MeetupParticipantsBlock";
import { spacing } from "@/theme/tokens";
import type { MeetupMemberPresence, MeetupPost } from "@/types/domain";

export type MeetupSheetParticipantsSceneProps = {
  meetup: MeetupPost;
  meetupPresence: MeetupMemberPresence[];
  loadingMeetupPresence: boolean;
  onOpenPlayerProfile: (userId: string) => void;
  onRemoveParticipant: (userId: string) => void;
  removingParticipantId: string | null;
  onRequestPresence: (meetupId: string) => void;
};

export function MeetupSheetParticipantsScene({
  meetup,
  meetupPresence,
  loadingMeetupPresence,
  onOpenPlayerProfile,
  onRemoveParticipant,
  removingParticipantId,
  onRequestPresence,
}: MeetupSheetParticipantsSceneProps) {
  useEffect(() => {
    onRequestPresence(meetup.id);
  }, [meetup.id, onRequestPresence]);

  return (
    <View style={styles.wrap}>
      <MeetupParticipantsBlock
        meetup={meetup}
        meetupPresence={meetupPresence}
        loadingMeetupPresence={loadingMeetupPresence}
        onOpenPlayerProfile={onOpenPlayerProfile}
        onRemoveParticipant={onRemoveParticipant}
        removingParticipantId={removingParticipantId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
});
