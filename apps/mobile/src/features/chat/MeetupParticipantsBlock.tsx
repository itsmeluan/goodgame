import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppIcon } from "@/components/AppIcon";
import { Avatar } from "@/components/Avatar";
import { palette, radius, spacing } from "@/theme/tokens";
import type { AttendanceStatus, MeetupMemberPresence, MeetupPost } from "@/types/domain";

export function getAttendanceRank(status: AttendanceStatus) {
  if (
    status === "confirmed" ||
    status === "going" ||
    status === "on_the_way" ||
    status === "arrived" ||
    status === "left"
  ) {
    return 0;
  }

  if (status === "interested") {
    return 1;
  }

  if (status === "not_going" || status === "cant_make_it") {
    return 2;
  }

  return 3;
}

export function sortMeetupParticipantsPresence(
  members: MeetupMemberPresence[]
): MeetupMemberPresence[] {
  return [...members].sort((left, right) => {
    if (left.role === "creator" && right.role !== "creator") {
      return -1;
    }

    if (left.role !== "creator" && right.role === "creator") {
      return 1;
    }

    const leftRank = getAttendanceRank(left.attendanceStatus);
    const rightRank = getAttendanceRank(right.attendanceStatus);

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return new Date(left.joinedAt).getTime() - new Date(right.joinedAt).getTime();
  });
}

function getAttendanceVisuals(status: AttendanceStatus) {
  if (
    status === "confirmed" ||
    status === "going" ||
    status === "on_the_way" ||
    status === "arrived" ||
    status === "left"
  ) {
    return {
      borderColor: "#2AAE67",
      badgeColor: "#2AAE67",
      badgeLabel: "✓",
    };
  }

  if (status === "interested") {
    return {
      borderColor: "#D4A632",
      badgeColor: null,
      badgeLabel: null,
    };
  }

  if (status === "not_going" || status === "cant_make_it") {
    return {
      borderColor: "#D75656",
      badgeColor: "#D75656",
      badgeLabel: "×",
    };
  }

  return {
    borderColor: "#D4A632",
    badgeColor: null,
    badgeLabel: null,
  };
}

function SummaryChip({
  label,
  tone,
}: {
  label: string;
  tone: "positive" | "warning" | "danger";
}) {
  const toneStyle =
    tone === "positive"
      ? styles.summaryChipPositive
      : tone === "danger"
        ? styles.summaryChipDanger
        : styles.summaryChipWarning;

  return (
    <View style={[styles.summaryChip, toneStyle]}>
      <Text style={styles.summaryChipLabel}>{label}</Text>
    </View>
  );
}

export function ParticipantAvatar({
  member,
  showRemoveControl,
  onRemovePress,
  removing,
}: {
  member: MeetupMemberPresence;
  showRemoveControl?: boolean;
  onRemovePress?: () => void;
  removing?: boolean;
}) {
  const visuals = getAttendanceVisuals(member.attendanceStatus);

  return (
    <View style={styles.participantAvatarWrap}>
      <View style={[styles.participantAvatarFrame, { borderColor: visuals.borderColor }]}>
        <Avatar name={member.displayName} uri={member.avatarUrl} size={54} />
      </View>
      {showRemoveControl && onRemovePress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remover ${member.displayName} da partida`}
          onPress={onRemovePress}
          disabled={removing}
          hitSlop={8}
          style={({ pressed }) => [
            styles.participantRemoveBadge,
            pressed ? styles.participantRemoveBadgePressed : null,
          ]}
        >
          {removing ? (
            <ActivityIndicator size="small" color={palette.ink} />
          ) : (
            <AppIcon iosName="xmark" fallbackName="close" size={11} color={palette.ink} />
          )}
        </Pressable>
      ) : visuals.badgeLabel ? (
        <View style={[styles.participantBadge, { backgroundColor: visuals.badgeColor }]}>
          <Text style={styles.participantBadgeLabel}>{visuals.badgeLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

export type MeetupParticipantsBlockProps = {
  meetup: MeetupPost;
  meetupPresence: MeetupMemberPresence[];
  loadingMeetupPresence: boolean;
  onOpenPlayerProfile: (userId: string) => void;
  onRemoveParticipant: (userId: string) => void;
  removingParticipantId: string | null;
  /** When false, manage pill is omitted (e.g. read-only). */
  showManageControls?: boolean;
  /** Controlled manage mode (e.g. chat details resets when sheet closes). */
  manageAvatarsMode?: boolean;
  onManageAvatarsModeChange?: Dispatch<SetStateAction<boolean>>;
};

export function MeetupParticipantsBlock({
  meetup,
  meetupPresence,
  loadingMeetupPresence,
  onOpenPlayerProfile,
  onRemoveParticipant,
  removingParticipantId,
  showManageControls = true,
  manageAvatarsMode: manageAvatarsModeProp,
  onManageAvatarsModeChange,
}: MeetupParticipantsBlockProps) {
  const [manageParticipantsAvatarsModeInternal, setManageParticipantsAvatarsModeInternal] =
    useState(false);
  const controlled =
    manageAvatarsModeProp !== undefined && onManageAvatarsModeChange !== undefined;
  const manageParticipantsAvatarsMode = controlled
    ? manageAvatarsModeProp
    : manageParticipantsAvatarsModeInternal;
  const setManageParticipantsAvatarsMode = controlled
    ? onManageAvatarsModeChange
    : setManageParticipantsAvatarsModeInternal;

  const sortedParticipants = useMemo(
    () => sortMeetupParticipantsPresence(meetupPresence),
    [meetupPresence]
  );

  const participantSummary = useMemo(() => {
    const confirmed = meetupPresence.filter((member) =>
      ["confirmed", "going", "on_the_way", "arrived", "left"].includes(member.attendanceStatus)
    ).length;
    const interested = meetupPresence.filter((member) =>
      ["interested"].includes(member.attendanceStatus)
    ).length;
    const notGoing = meetupPresence.filter((member) =>
      ["not_going", "cant_make_it"].includes(member.attendanceStatus)
    ).length;

    return {
      total: meetupPresence.length,
      confirmed,
      interested,
      notGoing,
    };
  }, [meetupPresence]);

  /** Dono da partida (`meetup.isCreator`) — só ele vê o pill Gerenciar e remove participantes. */
  const canManage = meetup.isCreator && showManageControls;

  return (
    <View style={styles.participantsSection}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.participantsTitleRow}>
          <Text style={styles.sectionCaption}>
            Participantes {loadingMeetupPresence ? "· sincronizando..." : ""}
          </Text>
          {canManage ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                manageParticipantsAvatarsMode
                  ? "Concluir gerenciamento de participantes"
                  : "Gerenciar participantes"
              }
              onPress={() => setManageParticipantsAvatarsMode((current) => !current)}
              style={({ pressed }) => [
                styles.manageParticipantsPill,
                pressed ? styles.manageParticipantsPillPressed : null,
              ]}
            >
              <Text style={styles.manageParticipantsPillText}>
                {manageParticipantsAvatarsMode ? "Concluir" : "Gerenciar"}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.inlineStateChip}>
          <Text style={styles.inlineStateChipLabel}>{participantSummary.total} no chat</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.participantsRow}
      >
        {sortedParticipants.map((member) => {
          const showRemove =
            meetup.isCreator && manageParticipantsAvatarsMode && member.role !== "creator";

          return (
            <Pressable
              key={member.userId}
              onPress={() => {
                if (!showRemove) {
                  onOpenPlayerProfile(member.userId);
                }
              }}
              style={({ pressed }) => [
                styles.participantItem,
                pressed && !showRemove ? styles.participantItemPressed : null,
              ]}
            >
              <ParticipantAvatar
                member={member}
                showRemoveControl={showRemove}
                onRemovePress={() => onRemoveParticipant(member.userId)}
                removing={removingParticipantId === member.userId}
              />
              <Text style={styles.participantName} numberOfLines={1}>
                {member.displayName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.participantSummaryRow}>
        <SummaryChip
          label={`${participantSummary.confirmed} confirmado${
            participantSummary.confirmed === 1 ? "" : "s"
          }`}
          tone="positive"
        />
        <SummaryChip
          label={`${participantSummary.interested} com interesse`}
          tone="warning"
        />
        {participantSummary.notGoing ? (
          <SummaryChip
            label={`${participantSummary.notGoing} não vai`}
            tone="danger"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  participantsSection: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  inlineStateChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
  },
  inlineStateChipLabel: {
    color: palette.sand,
    fontSize: 11,
    fontWeight: "700",
  },
  sectionCaption: {
    color: palette.parchment,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  participantSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
    alignSelf: "stretch",
  },
  participantsTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  manageParticipantsPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: "rgba(241,143,92,0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(241,143,92,0.32)",
  },
  manageParticipantsPillPressed: {
    opacity: 0.82,
  },
  manageParticipantsPillText: {
    color: palette.ember,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.15,
  },
  summaryChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryChipPositive: {
    backgroundColor: "rgba(42,174,103,0.12)",
    borderColor: palette.line,
  },
  summaryChipWarning: {
    backgroundColor: "rgba(212,166,50,0.1)",
    borderColor: palette.line,
  },
  summaryChipDanger: {
    backgroundColor: "rgba(215,86,86,0.1)",
    borderColor: palette.line,
  },
  summaryChipLabel: {
    color: palette.sand,
    fontSize: 11,
    fontWeight: "700",
  },
  participantsRow: {
    gap: spacing.md,
    paddingRight: spacing.lg,
    paddingBottom: spacing.xs,
  },
  participantItem: {
    width: 76,
    gap: spacing.xs,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  participantItemPressed: {
    opacity: 0.9,
  },
  participantAvatarWrap: {
    position: "relative",
    paddingTop: 2,
    paddingRight: 2,
    zIndex: 1,
  },
  participantAvatarFrame: {
    borderWidth: 3,
    borderRadius: 34,
    padding: 2,
  },
  participantBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: palette.ink,
  },
  participantBadgeLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  participantRemoveBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.watermelon,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.12)",
    zIndex: 2,
  },
  participantRemoveBadgePressed: {
    opacity: 0.88,
  },
  participantName: {
    color: palette.sand,
    fontSize: 11,
    textAlign: "center",
    fontWeight: "600",
  },
});
