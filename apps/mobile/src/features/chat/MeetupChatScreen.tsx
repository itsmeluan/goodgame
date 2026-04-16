import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "@/components/AppIcon";
import { AppleListGroup, AppleListRow } from "@/components/AppleListNavigation";
import { Avatar } from "@/components/Avatar";
import { ChoiceChip } from "@/components/ChoiceChip";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import {
  formatAttendanceStatus,
  formatCompactAddress,
  formatMeetupStatus,
} from "@/lib/formatting";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, sheetContentGutter, spacing } from "@/theme/tokens";
import type {
  AttendanceStatus,
  ChatMessage,
  MeetupMemberPresence,
  MeetupPost,
} from "@/types/domain";

type MeetupChatScreenProps = {
  currentUserId: string;
  meetup: MeetupPost | null;
  meetupPresence: MeetupMemberPresence[];
  messages: ChatMessage[];
  lastMessageSyncAt: Date | null;
  loadingMessages: boolean;
  loadingMeetupPresence: boolean;
  selectedChatAllowsMessages: boolean;
  messageBody: string;
  messageError: string | null;
  sendingMessage: boolean;
  updatingMeetupAction: string | null;
  removingParticipantId: string | null;
  leavingMeetup: boolean;
  ratingActionId: string | null;
  canRateSelectedChatMeetup: boolean;
  replyingToMessage: ChatMessage | null;
  onBack: () => void;
  onOpenPlayerProfile: (userId: string) => void;
  onReplyToMessage: (messageId: string) => void;
  onClearReply: () => void;
  onChangeMessageBody: (value: string) => void;
  onSendMessage: () => void;
  onOpenMap: () => void;
  onLeaveMeetup: () => void;
  onUpdateAttendanceStatus: (status: AttendanceStatus) => void;
  onUpdateMeetupStatus: (status: "closed" | "cancelled") => void;
  onRemoveParticipant: (userId: string) => void;
  onRateMember: (reviewedUserId: string, attended: boolean, rating?: number) => void;
  onPickChatImage: () => void;
  pickingChatImage: boolean;
};

const attendanceOrder: AttendanceStatus[] = [
  "interested",
  "confirmed",
  "not_going",
];

const CHAT_EDGE_PADDING = spacing.lg;

export function MeetupChatScreen({
  currentUserId,
  meetup,
  meetupPresence,
  messages,
  lastMessageSyncAt,
  loadingMessages,
  loadingMeetupPresence,
  selectedChatAllowsMessages,
  messageBody,
  messageError,
  sendingMessage,
  updatingMeetupAction,
  removingParticipantId,
  leavingMeetup,
  ratingActionId,
  canRateSelectedChatMeetup,
  replyingToMessage,
  onBack,
  onOpenPlayerProfile,
  onReplyToMessage,
  onClearReply,
  onChangeMessageBody,
  onSendMessage,
  onOpenMap,
  onLeaveMeetup,
  onUpdateAttendanceStatus,
  onUpdateMeetupStatus,
  onRemoveParticipant,
  onRateMember,
  onPickChatImage,
  pickingChatImage,
}: MeetupChatScreenProps) {
  const insets = useSafeAreaInsets();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const messageListRef = useRef<FlatList<ChatMessage> | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      messageListRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardWillShow", () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardWillHide", () => {
      setKeyboardVisible(false);
    });
    const didShowSubscription =
      Platform.OS === "android"
        ? Keyboard.addListener("keyboardDidShow", () => {
            setKeyboardVisible(true);
          })
        : null;
    const didHideSubscription =
      Platform.OS === "android"
        ? Keyboard.addListener("keyboardDidHide", () => {
            setKeyboardVisible(false);
          })
        : null;

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      didShowSubscription?.remove();
      didHideSubscription?.remove();
    };
  }, []);

  const myPresence = useMemo(
    () => meetupPresence.find((member) => member.userId === currentUserId) ?? null,
    [currentUserId, meetupPresence]
  );

  const sortedParticipants = useMemo(
    () =>
      [...meetupPresence].sort((left, right) => {
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
      }),
    [meetupPresence]
  );

  const participantSummary = useMemo(() => {
    const confirmed = meetupPresence.filter((member) =>
      ["confirmed", "going", "on_the_way", "arrived", "left"].includes(
        member.attendanceStatus
      )
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

  const renderMessage = useCallback(
    ({ item: message, index }: { item: ChatMessage; index: number }) => {
      const isMine = message.authorId === currentUserId;
      const previousMessage = messages[index - 1];
      const nextMessage = messages[index + 1];
      const showAuthor =
        !isMine && (!previousMessage || previousMessage.authorId !== message.authorId);
      const showAvatar = !isMine && (!nextMessage || nextMessage.authorId !== message.authorId);

      return (
        <ReplySwipeMessage
          messageId={message.id}
          onReply={onReplyToMessage}
          style={[
            styles.messageCluster,
            isMine ? styles.messageClusterMine : styles.messageClusterOther,
          ]}
        >
          {!isMine ? (
            <View style={styles.messageAvatarColumn}>
              {showAvatar ? (
                <Pressable onPress={() => onOpenPlayerProfile(message.authorId)}>
                  <Avatar
                    name={message.authorName}
                    uri={message.authorAvatarUrl}
                    size={28}
                  />
                </Pressable>
              ) : (
                <View style={styles.messageAvatarSpacer} />
              )}
            </View>
          ) : null}

          <View
            style={[
              styles.messageStack,
              isMine ? styles.messageStackMine : styles.messageStackOther,
            ]}
          >
            {showAuthor ? (
              <Pressable onPress={() => onOpenPlayerProfile(message.authorId)}>
                <Text style={styles.messageAuthor}>{message.authorName}</Text>
              </Pressable>
            ) : null}
            <View
              style={[
                styles.messageBubble,
                isMine ? styles.messageBubbleMine : styles.messageBubbleOther,
              ]}
            >
              {message.replyPreviewBody ? (
                <View
                  style={[
                    styles.replyPreviewBubble,
                    isMine ? styles.replyPreviewBubbleMine : styles.replyPreviewBubbleOther,
                  ]}
                >
                  <Text style={styles.replyPreviewAuthor} numberOfLines={1}>
                    {message.replyPreviewAuthorName}
                  </Text>
                  <Text style={styles.replyPreviewText} numberOfLines={2}>
                    {message.replyPreviewBody}
                  </Text>
                </View>
              ) : null}
              <Text
                style={[
                  styles.messageText,
                  isMine ? styles.messageTextMine : styles.messageTextOther,
                ]}
              >
                {message.body}
              </Text>
              <View style={styles.messageMetaRow}>
                <Text
                  style={[
                    styles.messageTime,
                    isMine ? styles.messageTimeMine : styles.messageTimeOther,
                  ]}
                >
                  {formatMessageClock(message.sentAt)}
                </Text>
                {isMine ? (
                  <AppIcon
                    iosName="checkmark.circle.fill"
                    fallbackName="done-all"
                    size={15}
                    color="rgba(246,242,234,0.78)"
                  />
                ) : null}
              </View>
            </View>
          </View>
        </ReplySwipeMessage>
      );
    },
    [currentUserId, messages, onOpenPlayerProfile, onReplyToMessage]
  );

  if (!meetup) {
    return (
      <View style={styles.emptyScreen}>
        <View style={styles.chatHeaderBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar ao mapa"
            onPress={onBack}
            style={({ pressed }) => [
              styles.headerBackButton,
              pressed ? styles.headerBackButtonPressed : null,
            ]}
          >
            <AppIcon iosName="chevron.left" fallbackName="arrow-back" size={22} color={palette.sand} />
          </Pressable>
          <Text style={styles.emptyHeaderTitle}>Grupo</Text>
        </View>

        <View style={styles.emptyBodyWrap}>
          <Text style={styles.emptyTitle}>Escolha um grupo no menu</Text>
          <Text style={styles.emptyBody}>
            Abra o menu, toque em Chats e selecione uma partida para ver a conversa aqui.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? Math.max(insets.bottom - 6, 18) : 0}
    >
      <SlidingSheetStack
        routes={[
          {
            key: "chat",
            content: (
              <View style={styles.screen}>
                <View style={styles.chatHeaderBar}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Voltar ao mapa"
                    onPress={onBack}
                    style={({ pressed }) => [
                      styles.headerBackButton,
                      pressed ? styles.headerBackButtonPressed : null,
                    ]}
                  >
                    <AppIcon
                      iosName="chevron.left"
                      fallbackName="arrow-back"
                      size={22}
                      color={palette.sand}
                    />
                  </Pressable>

                  <View style={styles.chatHeaderMainRow}>
                    <Pressable
                      accessibilityRole={meetup.isCreator ? "button" : undefined}
                      accessibilityLabel={meetup.isCreator ? "Trocar foto do grupo" : undefined}
                      onPress={meetup.isCreator ? onPickChatImage : undefined}
                      style={({ pressed }) => [
                        styles.chatAvatarButton,
                        pressed ? styles.headerBackButtonPressed : null,
                      ]}
                    >
                      {meetup.chatImageUrl ? (
                        <Avatar name={meetup.title} uri={meetup.chatImageUrl} size={44} />
                      ) : (
                        <View style={styles.chatAvatarFallback}>
                          <AppIcon
                            iosName="bubble.left.and.bubble.right.fill"
                            fallbackName="forum"
                            size={22}
                            color={palette.ember}
                          />
                        </View>
                      )}
                      {meetup.isCreator ? (
                        <View style={styles.chatAvatarBadge}>
                          <AppIcon
                            iosName={
                              pickingChatImage
                                ? "arrow.triangle.2.circlepath"
                                : "camera.fill"
                            }
                            fallbackName={pickingChatImage ? "sync" : "photo-camera"}
                            size={11}
                            color={palette.ink}
                          />
                        </View>
                      ) : null}
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Abrir detalhes da partida"
                      onPress={() => setDetailsOpen(true)}
                      style={({ pressed }) => [
                        styles.chatHeaderInfoPress,
                        pressed ? styles.headerBackButtonPressed : null,
                      ]}
                    >
                      <View style={styles.chatHeaderTextBlock}>
                        <Text style={styles.chatHeaderStatusLine} numberOfLines={1}>
                          {formatMeetupStatus(meetup.status)}
                        </Text>
                        <Text style={styles.chatTitle} numberOfLines={2}>
                          {meetup.title}
                        </Text>
                        <Text style={styles.chatSubtitle} numberOfLines={1}>
                          {meetup.formatName}
                        </Text>
                      </View>
                      <AppIcon
                        iosName="chevron.right"
                        fallbackName="chevron-right"
                        size={18}
                        color={palette.pine}
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.messagesArea}>
                  <FlatList
                    ref={messageListRef}
                    data={messages}
                    style={styles.messageList}
                    keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={[
                      styles.messageListContent,
                      {
                        paddingBottom:
                          canRateSelectedChatMeetup && !keyboardVisible ? spacing.md : spacing.xl,
                      },
                    ]}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={Platform.OS === "android"}
                    initialNumToRender={18}
                    maxToRenderPerBatch={12}
                    updateCellsBatchingPeriod={32}
                    windowSize={8}
                    keyExtractor={(message) => message.id}
                    renderItem={renderMessage}
                    ListEmptyComponent={
                      <View style={styles.emptyChatWrap}>
                        <Text style={styles.emptyChatTitle}>Sem mensagens ainda</Text>
                        <Text style={styles.emptyChatBody}>
                          Essa conversa começa quando alguém mandar a primeira mensagem.
                        </Text>
                      </View>
                    }
                  />
                </View>

                {messageError ? <Text style={styles.messageError}>{messageError}</Text> : null}

                {canRateSelectedChatMeetup && !keyboardVisible ? (
                  <View style={styles.ratingStrip}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.ratingRow}
                    >
                      {sortedParticipants
                        .filter((member) => member.userId !== currentUserId)
                        .map((member) => (
                          <View key={`rating-${member.userId}`} style={styles.ratingCard}>
                            <ParticipantAvatar member={member} />
                            <Text style={styles.ratingName} numberOfLines={1}>
                              {member.displayName}
                            </Text>
                            <View style={styles.ratingActions}>
                              <PrimaryButton
                                label={ratingActionId === member.userId ? "..." : "5★"}
                                onPress={() => onRateMember(member.userId, true, 5)}
                                size="compact"
                              />
                              <PrimaryButton
                                label="No-show"
                                onPress={() => onRateMember(member.userId, false)}
                                tone="ghost"
                                size="compact"
                              />
                            </View>
                          </View>
                        ))}
                    </ScrollView>
                  </View>
                ) : null}

                {selectedChatAllowsMessages ? (
                  <View
                    style={[
                      styles.composerWrap,
                      {
                        paddingBottom: keyboardVisible ? 0 : Math.max(insets.bottom - 6, 0),
                      },
                    ]}
                  >
                    {replyingToMessage ? (
                      <View style={styles.replyComposerCard}>
                        <View style={styles.replyComposerStripe} />
                        <View style={styles.replyComposerCopy}>
                          <Text style={styles.replyComposerAuthor} numberOfLines={1}>
                            Respondendo a {replyingToMessage.authorName}
                          </Text>
                          <Text style={styles.replyComposerText} numberOfLines={2}>
                            {replyingToMessage.body}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Cancelar resposta"
                          onPress={onClearReply}
                          style={({ pressed }) => [
                            styles.replyComposerClose,
                            pressed ? styles.replyComposerClosePressed : null,
                          ]}
                        >
                          <AppIcon
                            iosName="xmark"
                            fallbackName="close"
                            size={14}
                            color={palette.parchment}
                          />
                        </Pressable>
                      </View>
                    ) : null}
                    <View style={styles.composerInputWrap}>
                      <TextInput
                        value={messageBody}
                        onChangeText={onChangeMessageBody}
                        placeholder="Mensagem"
                        placeholderTextColor={palette.pine}
                        multiline
                        style={styles.composerInput}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Enviar mensagem"
                        onPress={() => {
                          triggerHaptic("soft");
                          onSendMessage();
                        }}
                        disabled={!messageBody.trim() || sendingMessage}
                        style={({ pressed }) => [
                          styles.composerSendButton,
                          !messageBody.trim() || sendingMessage
                            ? styles.composerSendButtonDisabled
                            : null,
                          pressed ? styles.composerSendButtonPressed : null,
                        ]}
                      >
                        <AppIcon
                          iosName="paperplane.fill"
                          fallbackName="send"
                          size={18}
                          color={palette.ink}
                        />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.closedGroupNotice,
                      {
                        paddingBottom: keyboardVisible ? 0 : Math.max(insets.bottom - 6, 0),
                      },
                    ]}
                  >
                    <Text style={styles.closedGroupNoticeText}>
                      Esse grupo está {formatMeetupStatus(meetup.status).toLowerCase()} e não
                      aceita novas mensagens.
                    </Text>
                  </View>
                )}
              </View>
            ),
          },
          ...(detailsOpen
            ? [
                {
                  key: "details",
                  content: (
                    <ScrollView
                      contentContainerStyle={[styles.sceneContent, styles.sceneContentCompactLead]}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      bounces={false}
                    >
                      <View style={styles.sceneLeadMinimal}>
                        <Text style={styles.detailsStatusLine}>
                          {formatMeetupStatus(meetup.status)}
                        </Text>
                        <Text style={styles.detailsFormatEyebrow}>{meetup.formatName}</Text>
                        <Text style={styles.detailsLeadTitle}>{meetup.title}</Text>
                        <Text style={styles.detailsLeadAddress}>
                          {formatCompactAddress(meetup.addressLabel || meetup.locationHint)}
                        </Text>
                      </View>

                      <AppleListGroup>
                        <AppleListRow
                          icon={{ iosName: "calendar", fallbackName: "calendar-today" }}
                          label="Quando"
                          subtitle={formatMeetupDate(meetup.startsAt)}
                          trailingValue={formatMeetupTime(meetup.startsAt)}
                          showChevron={false}
                          size="compact"
                        />
                        <AppleListRow
                          separator
                          icon={{ iosName: "flag.fill", fallbackName: "flag" }}
                          label="Status"
                          trailingValue={formatMeetupStatus(meetup.status)}
                          showChevron={false}
                          tone="accent"
                          size="compact"
                        />
                        <AppleListRow
                          separator
                          icon={{ iosName: "mappin.and.ellipse", fallbackName: "location-on" }}
                          label="Endereço"
                          subtitle={formatCompactAddress(meetup.addressLabel || meetup.locationHint)}
                          trailingValue="Mapa"
                          onPress={onOpenMap}
                          size="compact"
                        />
                      </AppleListGroup>

                      <View style={styles.statusPanel}>
                        <View style={styles.sectionHeaderRow}>
                          <Text style={styles.sectionCaption}>Meu status</Text>
                          {myPresence ? (
                            <View style={styles.inlineStateChip}>
                              <Text style={styles.inlineStateChipLabel}>
                                {formatAttendanceStatus(myPresence.attendanceStatus)}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.statusChipRow}>
                          {attendanceOrder.map((status) => (
                            <ChoiceChip
                              key={status}
                              label={formatAttendanceStatus(status)}
                              selected={myPresence?.attendanceStatus === status}
                              onPress={() => onUpdateAttendanceStatus(status)}
                            />
                          ))}
                        </View>
                      </View>

                      {!meetup.isCreator ? (
                        <View style={styles.actionRow}>
                          <View style={styles.actionCell}>
                            <PrimaryButton
                              label={leavingMeetup ? "Saindo..." : "Sair da partida"}
                              onPress={onLeaveMeetup}
                              tone="dangerGhost"
                              loading={leavingMeetup}
                            />
                          </View>
                        </View>
                      ) : null}

                      <View style={styles.participantsSection}>
                        <View style={styles.sectionHeaderStack}>
                          <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionCaption}>
                              Participantes {loadingMeetupPresence ? "· sincronizando..." : ""}
                            </Text>
                            <View style={styles.inlineStateChip}>
                              <Text style={styles.inlineStateChipLabel}>
                                {participantSummary.total} no chat
                              </Text>
                            </View>
                          </View>
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
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.participantsRow}
                        >
                          {sortedParticipants.map((member) => (
                            <Pressable
                              key={member.userId}
                              onPress={() => onOpenPlayerProfile(member.userId)}
                              style={({ pressed }) => [
                                styles.participantItem,
                                pressed ? styles.participantItemPressed : null,
                              ]}
                            >
                              <ParticipantAvatar member={member} />
                              <Text style={styles.participantName} numberOfLines={1}>
                                {member.displayName}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>

                      {meetup.isCreator ? (
                        <View style={styles.creatorSection}>
                          <View style={styles.sectionHeaderStack}>
                            <View style={styles.sectionHeaderRow}>
                              <Text style={styles.sectionCaption}>Gerenciar partida</Text>
                            </View>
                            <Text style={styles.sectionHelper}>
                              Removidos perdem acesso ao chat.
                            </Text>
                          </View>
                          <View style={styles.actionRow}>
                            <View style={styles.actionCell}>
                              <PrimaryButton
                                label={
                                  updatingMeetupAction === "chat-status:closed"
                                    ? "..."
                                    : "Encerrar"
                                }
                                onPress={() => onUpdateMeetupStatus("closed")}
                                tone="ghost"
                              />
                            </View>
                            <View style={styles.actionCell}>
                              <PrimaryButton
                                label={
                                  updatingMeetupAction === "chat-status:cancelled"
                                    ? "..."
                                    : "Cancelar"
                                }
                                onPress={() => onUpdateMeetupStatus("cancelled")}
                                tone="dangerGhost"
                              />
                            </View>
                          </View>
                          {sortedParticipants.filter((member) => member.role !== "creator")
                            .length ? (
                            <View style={styles.manageParticipantsWrap}>
                              <View style={styles.sectionHeaderRow}>
                                <Text style={styles.manageParticipantsTitle}>Participantes</Text>
                                <View style={styles.inlineStateChip}>
                                  <Text style={styles.inlineStateChipLabel}>
                                    {
                                      sortedParticipants.filter(
                                        (member) => member.role !== "creator"
                                      ).length
                                    }
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.manageParticipantsList}>
                                {sortedParticipants
                                  .filter((member) => member.role !== "creator")
                                  .map((member, index) => (
                                    <View
                                      key={`manage-${member.userId}`}
                                      style={[
                                        styles.manageParticipantRow,
                                        index > 0 ? styles.manageParticipantRowWithSeparator : null,
                                      ]}
                                    >
                                      <Pressable
                                        onPress={() => onOpenPlayerProfile(member.userId)}
                                        style={({ pressed }) => [
                                          styles.manageParticipantCopy,
                                          pressed ? styles.participantItemPressed : null,
                                        ]}
                                      >
                                        <Avatar
                                          name={member.displayName}
                                          uri={member.avatarUrl}
                                          size={36}
                                        />
                                        <View style={styles.manageParticipantText}>
                                          <Text
                                            style={styles.manageParticipantName}
                                            numberOfLines={1}
                                          >
                                            {member.displayName}
                                          </Text>
                                          <View style={styles.manageParticipantMetaRow}>
                                            <StatusPill status={member.attendanceStatus} />
                                          </View>
                                        </View>
                                      </Pressable>
                                      <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={`Remover ${member.displayName} da partida`}
                                        onPress={() => onRemoveParticipant(member.userId)}
                                        style={({ pressed }) => [
                                          styles.manageParticipantRemove,
                                          pressed
                                            ? styles.manageParticipantRemovePressed
                                            : null,
                                        ]}
                                        disabled={removingParticipantId === member.userId}
                                      >
                                        <AppIcon
                                          iosName={
                                            removingParticipantId === member.userId
                                              ? "arrow.triangle.2.circlepath"
                                              : "person.badge.minus"
                                          }
                                          fallbackName={
                                            removingParticipantId === member.userId
                                              ? "sync"
                                              : "person-remove"
                                          }
                                          size={18}
                                          color={palette.sand}
                                        />
                                      </Pressable>
                                    </View>
                                  ))}
                              </View>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </ScrollView>
                  ),
                },
              ]
            : []),
        ]}
        onPop={() => setDetailsOpen(false)}
        scenePaddingHorizontal={sheetContentGutter}
      />
    </KeyboardAvoidingView>
  );
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

function StatusPill({ status }: { status: AttendanceStatus }) {
  const visuals = getAttendanceVisuals(status);

  return (
    <View
      style={[
        styles.statusPill,
        {
          borderColor: visuals.borderColor,
          backgroundColor: `${visuals.borderColor}22`,
        },
      ]}
    >
      <Text style={[styles.statusPillLabel, { color: visuals.borderColor }]}>
        {formatAttendanceStatus(status)}
      </Text>
    </View>
  );
}

function ParticipantAvatar({ member }: { member: MeetupMemberPresence }) {
  const visuals = getAttendanceVisuals(member.attendanceStatus);

  return (
    <View style={styles.participantAvatarWrap}>
      <View style={[styles.participantAvatarFrame, { borderColor: visuals.borderColor }]}>
        <Avatar name={member.displayName} uri={member.avatarUrl} size={54} />
      </View>
      {visuals.badgeLabel ? (
        <View style={[styles.participantBadge, { backgroundColor: visuals.badgeColor }]}>
          <Text style={styles.participantBadgeLabel}>{visuals.badgeLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ReplySwipeMessage({
  messageId,
  onReply,
  style,
  children,
}: {
  messageId: string;
  onReply: (messageId: string) => void;
  style?: object;
  children: ReactNode;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const indicatorOpacity = useRef(new Animated.Value(0)).current;
  const repliedRef = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          gestureState.dx > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderGrant: () => {
          repliedRef.current = false;
        },
        onPanResponderMove: (_event, gestureState) => {
          const rawValue = Math.max(0, gestureState.dx);
          const resistedValue =
            rawValue <= 56 ? rawValue * 0.86 : 48 + (rawValue - 56) * 0.24;
          const nextValue = Math.min(resistedValue, 74);
          translateX.setValue(nextValue);
          indicatorOpacity.setValue(Math.min(nextValue / 34, 1));

          if (!repliedRef.current && nextValue >= 46) {
            repliedRef.current = true;
            onReply(messageId);
          }
        },
        onPanResponderRelease: () => {
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              damping: 18,
              stiffness: 290,
              mass: 0.72,
              useNativeDriver: true,
            }),
            Animated.timing(indicatorOpacity, {
              toValue: 0,
              duration: 120,
              useNativeDriver: true,
            }),
          ]).start();
        },
        onPanResponderTerminate: () => {
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              damping: 18,
              stiffness: 290,
              mass: 0.72,
              useNativeDriver: true,
            }),
            Animated.timing(indicatorOpacity, {
              toValue: 0,
              duration: 120,
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    [indicatorOpacity, messageId, onReply, translateX]
  );

  return (
    <View style={styles.replySwipeWrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.replySwipeIndicator,
          {
            opacity: indicatorOpacity,
            transform: [
              {
                scale: indicatorOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.88, 1],
                }),
              },
            ],
          },
        ]}
      >
        <AppIcon
          iosName="arrowshape.turn.up.left.fill"
          fallbackName="reply"
          size={18}
          color={palette.sand}
        />
      </Animated.View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[style, { transform: [{ translateX }] }]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

function getAttendanceVisuals(status: AttendanceStatus) {
  if (status === "confirmed" || status === "going" || status === "on_the_way" || status === "arrived" || status === "left") {
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

function getAttendanceRank(status: AttendanceStatus) {
  if (status === "confirmed" || status === "going" || status === "on_the_way" || status === "arrived" || status === "left") {
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

function formatMessageClock(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMeetupDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMeetupTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  emptyScreen: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  chatHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
    backgroundColor: palette.ink,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  chatHeaderMainRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  chatHeaderInfoPress: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  chatHeaderTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  chatHeaderStatusLine: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBackButtonPressed: {
    opacity: 0.85,
  },
  chatAvatarButton: {
    position: "relative",
  },
  chatAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.mapSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
  },
  chatAvatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.ember,
    borderWidth: 2,
    borderColor: "#121212",
  },
  chatTitle: {
    color: palette.sand,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
  },
  chatSubtitle: {
    color: palette.mist,
    fontSize: 12,
    lineHeight: 16,
  },
  emptyHeaderTitle: {
    flex: 1,
    color: palette.sand,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    marginRight: 40,
  },
  emptyBodyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: palette.sand,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyBody: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  sceneContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  sceneContentCompactLead: {
    gap: spacing.md,
  },
  sceneLeadMinimal: {
    alignSelf: "stretch",
    width: "100%",
    gap: 4,
  },
  detailsStatusLine: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    letterSpacing: 0.35,
    textTransform: "uppercase",
    alignSelf: "stretch",
    textAlign: "left",
  },
  detailsFormatEyebrow: {
    color: palette.ember,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    alignSelf: "stretch",
    textAlign: "left",
  },
  detailsLeadTitle: {
    color: palette.sand,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    alignSelf: "stretch",
    textAlign: "left",
  },
  detailsLeadAddress: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 19,
    alignSelf: "stretch",
    textAlign: "left",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionCell: {
    flex: 1,
  },
  statusChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statusPanel: {
    gap: spacing.sm,
    paddingLeft: 0,
  },
  sectionHeaderStack: {
    gap: spacing.xs,
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
  participantsSection: {
    gap: spacing.sm,
  },
  sectionCaption: {
    color: palette.parchment,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  sectionHelper: {
    color: palette.mist,
    fontSize: 12,
    lineHeight: 17,
  },
  participantSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
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
  participantName: {
    color: palette.sand,
    fontSize: 11,
    textAlign: "center",
    fontWeight: "600",
  },
  creatorSection: {
    gap: spacing.sm,
    paddingLeft: 0,
  },
  manageParticipantsWrap: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  manageParticipantsTitle: {
    color: palette.pine,
    fontSize: 12,
    fontWeight: "700",
  },
  manageParticipantsList: {
    gap: 0,
  },
  manageParticipantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  manageParticipantRowWithSeparator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  manageParticipantCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  manageParticipantText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  manageParticipantMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: 3,
  },
  manageParticipantName: {
    color: palette.sand,
    fontSize: 14,
    fontWeight: "700",
  },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusPillLabel: {
    fontSize: 11,
    fontWeight: "800",
  },
  manageParticipantRemove: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(215,86,86,0.18)",
    borderWidth: 1,
    borderColor: "rgba(215,86,86,0.34)",
  },
  manageParticipantRemovePressed: {
    opacity: 0.82,
  },
  messagesArea: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    gap: spacing.xs,
    paddingHorizontal: CHAT_EDGE_PADDING,
    paddingVertical: spacing.md,
  },
  emptyChatWrap: {
    alignSelf: "center",
    maxWidth: 300,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  emptyChatTitle: {
    color: palette.sand,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyChatBody: {
    color: palette.pine,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  messageCluster: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  replySwipeWrap: {
    position: "relative",
  },
  replySwipeIndicator: {
    position: "absolute",
    left: 6,
    top: "50%",
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(241,143,92,0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
  },
  messageClusterMine: {
    justifyContent: "flex-end",
  },
  messageClusterOther: {
    justifyContent: "flex-start",
  },
  messageAvatarColumn: {
    width: 28,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  messageAvatarSpacer: {
    width: 28,
    height: 28,
  },
  messageStack: {
    maxWidth: "82%",
    gap: 3,
  },
  messageStackMine: {
    alignItems: "flex-end",
  },
  messageStackOther: {
    alignItems: "flex-start",
  },
  messageAuthor: {
    color: palette.ember,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
  },
  messageBubble: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  replyPreviewBubble: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 3,
  },
  replyPreviewBubbleMine: {
    backgroundColor: "rgba(246,242,234,0.08)",
    borderLeftWidth: 3,
    borderLeftColor: "rgba(241,143,92,0.9)",
  },
  replyPreviewBubbleOther: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderLeftWidth: 3,
    borderLeftColor: palette.ember,
  },
  replyPreviewAuthor: {
    color: palette.ember,
    fontSize: 11,
    fontWeight: "800",
  },
  replyPreviewText: {
    color: palette.mist,
    fontSize: 12,
    lineHeight: 16,
  },
  messageBubbleMine: {
    backgroundColor: "rgba(241,143,92,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(241,143,92,0.28)",
    borderBottomRightRadius: radius.sm,
  },
  messageBubbleOther: {
    backgroundColor: palette.chatBubble,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    borderBottomLeftRadius: radius.sm,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 23,
  },
  messageTextMine: {
    color: palette.sand,
  },
  messageTextOther: {
    color: palette.sand,
  },
  messageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  messageTimeMine: {
    color: "rgba(246,242,234,0.68)",
  },
  messageTimeOther: {
    color: palette.pine,
  },
  messageError: {
    color: "#F6A6A6",
    fontSize: 12,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  ratingStrip: {
    gap: spacing.sm,
    paddingHorizontal: CHAT_EDGE_PADDING,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: palette.ink,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  ratingRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  ratingCard: {
    width: 132,
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: palette.mapSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    alignItems: "center",
  },
  ratingName: {
    color: palette.sand,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  ratingActions: {
    width: "100%",
    gap: spacing.xs,
  },
  composerWrap: {
    paddingHorizontal: CHAT_EDGE_PADDING,
    paddingTop: spacing.sm,
    backgroundColor: palette.ink,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  replyComposerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    backgroundColor: palette.mapSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  replyComposerStripe: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: radius.pill,
    backgroundColor: palette.ember,
  },
  replyComposerCopy: {
    flex: 1,
    gap: 3,
  },
  replyComposerAuthor: {
    color: palette.ember,
    fontSize: 12,
    fontWeight: "800",
  },
  replyComposerText: {
    color: palette.mist,
    fontSize: 12,
    lineHeight: 17,
  },
  replyComposerClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  replyComposerClosePressed: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  composerInputWrap: {
    position: "relative",
    justifyContent: "center",
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: palette.mapSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    paddingLeft: spacing.md,
    paddingRight: 54,
    paddingVertical: 0,
  },
  composerInput: {
    minHeight: 44,
    maxHeight: 124,
    color: palette.sand,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 10,
  },
  composerSendButton: {
    position: "absolute",
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.ember,
  },
  composerSendButtonDisabled: {
    opacity: 0.45,
  },
  composerSendButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  closedGroupNotice: {
    paddingHorizontal: CHAT_EDGE_PADDING,
    paddingTop: spacing.sm,
    backgroundColor: palette.ink,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  closedGroupNoticeText: {
    color: palette.pine,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "left",
  },
});
