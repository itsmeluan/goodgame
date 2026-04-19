import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
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
import { Avatar } from "@/components/Avatar";
import { ChoiceChip } from "@/components/ChoiceChip";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  SHEET_BACK_BUTTON_MIN_HEIGHT,
  SheetBackButton,
  SheetCircleIconButton,
} from "@/components/SheetBackButton";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import {
  MeetupParticipantsBlock,
  ParticipantAvatar,
  sortMeetupParticipantsPresence,
} from "@/features/chat/MeetupParticipantsBlock";
import { MeetupShareBubble } from "@/features/chat/MeetupShareBubble";
import { VenueShareBubble } from "@/features/chat/VenueShareBubble";
import {
  formatAttendanceStatus,
  formatCompactAddress,
  formatMeetupStatus,
} from "@/lib/formatting";
import { parseMeetupSharePayload } from "@/lib/meetupShare";
import { isUserPro } from "@/lib/proPlayer";
import { parseVenueSharePayload } from "@/lib/venueShare";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";
import type {
  AttendanceStatus,
  ChatMessage,
  MeetupMemberPresence,
  MeetupPost,
} from "@/types/domain";

type MeetupChatScreenProps = {
  currentUserId: string;
  /** Direto entre jogadores: sem cabeçalho de partida nem cena de detalhes. */
  threadKind?: "meetup" | "private";
  privatePeer?: {
    userId: string;
    displayName: string;
    handle: string;
    avatarUrl: string | null;
    isPro?: boolean;
    proExpiresAt?: string | null;
  } | null;
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
  /** Mapa com pin do jogo e balão de detalhes (preview). */
  onOpenMeetupPinOnMap: () => void;
  /** Abre edição da partida na sheet de jogos (criador). */
  onEditMeetup: () => void;
  onLeaveMeetup: () => void;
  onUpdateAttendanceStatus: (status: AttendanceStatus) => void;
  onUpdateMeetupStatus: (status: "closed" | "cancelled") => void;
  onRemoveParticipant: (userId: string) => void;
  onRateMember: (reviewedUserId: string, attended: boolean, rating?: number) => void | Promise<void>;
  onPickChatImage: () => void;
  pickingChatImage: boolean;
  /** Chat privado: atalho no canto superior direito para ir direto ao mapa. */
  onOpenMapDirect?: () => void;
  /** Toque no cartão de partida partilhado: mapa + sheet + detalhe. */
  onOpenSharedMeetupDeepLink?: (meetupId: string) => void;
  /** Toque no cartão de local partilhado: mapa + sheet + detalhe. */
  onOpenSharedVenueDeepLink?: (venueId: string) => void;
};

const attendanceOrder: AttendanceStatus[] = [
  "interested",
  "confirmed",
  "not_going",
];

export function MeetupChatScreen({
  currentUserId,
  threadKind = "meetup",
  privatePeer = null,
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
  onOpenMeetupPinOnMap,
  onEditMeetup,
  onLeaveMeetup,
  onUpdateAttendanceStatus,
  onUpdateMeetupStatus,
  onRemoveParticipant,
  onRateMember,
  onPickChatImage,
  pickingChatImage,
  onOpenMapDirect,
  onOpenSharedMeetupDeepLink,
  onOpenSharedVenueDeepLink,
}: MeetupChatScreenProps) {
  const insets = useSafeAreaInsets();
  const isPrivateThread = threadKind === "private" && privatePeer !== null;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [manageParticipantsAvatarsMode, setManageParticipantsAvatarsMode] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [ratingPanelExpanded, setRatingPanelExpanded] = useState(false);
  /** Participantes já avaliados nesta sessão (após sucesso da API). */
  const [submittedRatedUserIds, setSubmittedRatedUserIds] = useState(() => new Set<string>());
  /** Mostrar thumbs de novo para reavaliar; não altera o banco até novo toque. */
  const [revisingRatedUserIds, setRevisingRatedUserIds] = useState(() => new Set<string>());
  const messageListRef = useRef<FlatList<ChatMessage> | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      messageListRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length]);

  useEffect(() => {
    if (!detailsOpen) {
      setManageParticipantsAvatarsMode(false);
    }
  }, [detailsOpen]);

  useEffect(() => {
    if (keyboardVisible) {
      setRatingPanelExpanded(false);
    }
  }, [keyboardVisible]);

  useEffect(() => {
    setRatingPanelExpanded(false);
    setSubmittedRatedUserIds(new Set());
    setRevisingRatedUserIds(new Set());
  }, [meetup?.id, privatePeer?.userId]);

  useEffect(() => {
    if (isPrivateThread) {
      setDetailsOpen(false);
    }
  }, [isPrivateThread]);

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
    () => sortMeetupParticipantsPresence(meetupPresence),
    [meetupPresence]
  );

  const ratingTargets = useMemo(
    () => sortedParticipants.filter((member) => member.userId !== currentUserId),
    [currentUserId, sortedParticipants]
  );

  const showRatingBar =
    !isPrivateThread &&
    canRateSelectedChatMeetup &&
    !keyboardVisible &&
    ratingTargets.length > 0;
  const showRatingExpandedList = showRatingBar && ratingPanelExpanded;

  const beginMemberRating = useCallback((memberUserId: string) => {
    triggerHaptic("selection");
    setRevisingRatedUserIds((prev) => {
      const next = new Set(prev);
      next.add(memberUserId);
      return next;
    });
  }, []);

  const submitMemberRating = useCallback(
    async (memberUserId: string, attended: boolean, rating?: number) => {
      triggerHaptic("soft");
      try {
        await Promise.resolve(onRateMember(memberUserId, attended, rating));
        setSubmittedRatedUserIds((prev) => {
          const next = new Set(prev);
          next.add(memberUserId);
          return next;
        });
        setRevisingRatedUserIds((prev) => {
          const next = new Set(prev);
          next.delete(memberUserId);
          return next;
        });
      } catch {
        // Erro já exibido em `messageError` pelo container.
      }
    },
    [onRateMember]
  );

  const renderMessage = useCallback(
    ({ item: message, index }: { item: ChatMessage; index: number }) => {
      const isMine = message.authorId === currentUserId;
      const previousMessage = messages[index - 1];
      const nextMessage = messages[index + 1];
      const showAuthor =
        !isMine && (!previousMessage || previousMessage.authorId !== message.authorId);
      const showAvatar = !isMine && (!nextMessage || nextMessage.authorId !== message.authorId);

      const meetupSharePayload = parseMeetupSharePayload(message.body);
      const venueSharePayload = parseVenueSharePayload(message.body);

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
                    isPro={isUserPro({
                      isPro: Boolean(message.authorIsPro),
                      proExpiresAt: message.authorProExpiresAt ?? null,
                    })}
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
                  <Text
                    style={[styles.replyPreviewAuthor, isMine ? styles.replyPreviewAuthorOnMine : null]}
                    numberOfLines={1}
                  >
                    {message.replyPreviewAuthorName}
                  </Text>
                  <Text
                    style={[styles.replyPreviewText, isMine ? styles.replyPreviewTextOnMine : null]}
                    numberOfLines={2}
                  >
                    {message.replyPreviewBody}
                  </Text>
                </View>
              ) : null}
              {meetupSharePayload && onOpenSharedMeetupDeepLink ? (
                <MeetupShareBubble
                  payload={meetupSharePayload}
                  isMine={isMine}
                  onOpenMeetup={onOpenSharedMeetupDeepLink}
                />
              ) : venueSharePayload && onOpenSharedVenueDeepLink ? (
                <VenueShareBubble
                  payload={venueSharePayload}
                  isMine={isMine}
                  onOpenVenue={onOpenSharedVenueDeepLink}
                />
              ) : (
                <Text
                  style={[
                    styles.messageText,
                    isMine ? styles.messageTextMine : styles.messageTextOther,
                  ]}
                >
                  {message.body}
                </Text>
              )}
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
                    color={palette.ink}
                    type="monochrome"
                  />
                ) : null}
              </View>
            </View>
          </View>
        </ReplySwipeMessage>
      );
    },
    [
      currentUserId,
      messages,
      onOpenPlayerProfile,
      onOpenSharedMeetupDeepLink,
      onOpenSharedVenueDeepLink,
      onReplyToMessage,
    ]
  );

  if (!meetup && !isPrivateThread) {
    return (
      <View style={styles.emptyScreen}>
        <View style={[styles.chatHeaderBar, styles.chatHeaderBarEmpty]}>
          <View style={[styles.chatHeaderBarSide, styles.chatHeaderBarSideStart]}>
            <SheetBackButton onPress={onBack} accessibilityLabel="Voltar ao mapa" iconCircle />
          </View>
          <Text style={styles.emptyHeaderTitle} numberOfLines={1}>
            Grupo
          </Text>
          <View style={styles.chatHeaderBarSide} />
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
    <View style={styles.screen}>
      <SlidingSheetStack
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentStyle={{ backgroundColor: "transparent" }}
        routes={[
          {
            key: "chat",
            content: (
              <View style={styles.screen}>
                <View style={styles.chatHeaderBar}>
                  <SheetBackButton onPress={onBack} accessibilityLabel="Voltar ao mapa" iconCircle />

                  {isPrivateThread && privatePeer ? (
                    <View style={styles.chatHeaderMainRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Abrir perfil"
                        onPress={() => onOpenPlayerProfile(privatePeer.userId)}
                        style={({ pressed }) => [
                          styles.chatAvatarButton,
                          pressed ? styles.headerBackButtonPressed : null,
                        ]}
                      >
                        <Avatar
                          name={privatePeer.displayName}
                          uri={privatePeer.avatarUrl}
                          size={44}
                          isPro={isUserPro(privatePeer)}
                        />
                      </Pressable>

                      <View style={styles.chatHeaderTextBlock}>
                        <Text style={styles.chatTitle} numberOfLines={2}>
                          {privatePeer.displayName}
                        </Text>
                        <Text style={styles.chatSubtitle} numberOfLines={1}>
                          @{privatePeer.handle}
                        </Text>
                      </View>
                      {onOpenMapDirect ? (
                        <SheetCircleIconButton
                          accessibilityLabel="Ir para o mapa"
                          iosName="map.fill"
                          fallbackName="map"
                          iconSize={15}
                          diameter={SHEET_BACK_BUTTON_MIN_HEIGHT}
                          onPress={onOpenMapDirect}
                        />
                      ) : (
                        <View style={{ width: 36 }} />
                      )}
                    </View>
                  ) : meetup ? (
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

                      <View style={styles.chatHeaderTextBlock}>
                        <Text style={styles.chatTitle} numberOfLines={2}>
                          {meetup.title}
                        </Text>
                        <Text style={styles.chatSubtitle} numberOfLines={1}>
                          {meetup.formatName}
                        </Text>
                      </View>
                      <SheetCircleIconButton
                        accessibilityLabel="Abrir detalhes da partida"
                        iosName="info"
                        fallbackName="info"
                        iconSize={14}
                        onPress={() => setDetailsOpen(true)}
                      />
                    </View>
                  ) : null}
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
                        paddingBottom: showRatingBar
                          ? ratingPanelExpanded
                            ? spacing.lg
                            : spacing.sm
                          : spacing.xl,
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

                {showRatingBar ? (
                  <View style={styles.ratingBarWrap}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        ratingPanelExpanded
                          ? "Recolher avaliação de participantes"
                          : "Avaliar participantes"
                      }
                      onPress={() => {
                        triggerHaptic("selection");
                        setRatingPanelExpanded((current) => !current);
                      }}
                      style={({ pressed }) => [
                        styles.ratingTogglePill,
                        ratingPanelExpanded
                          ? styles.ratingTogglePillGlass
                          : styles.ratingTogglePillOrange,
                        pressed ? styles.ratingTogglePillPressed : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.ratingTogglePillText,
                          ratingPanelExpanded
                            ? styles.ratingTogglePillTextGlass
                            : styles.ratingTogglePillTextOrange,
                        ]}
                      >
                        {ratingPanelExpanded ? "Recolher" : "Avaliar participantes"}
                      </Text>
                    </Pressable>
                    {showRatingExpandedList ? (
                      <View style={styles.ratingStrip}>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.ratingRow}
                        >
                          {ratingTargets.map((member) => (
                            <View key={`rating-${member.userId}`} style={styles.ratingCard}>
                              <ParticipantAvatar member={member} />
                              <Text style={styles.ratingName} numberOfLines={1}>
                                {member.displayName}
                              </Text>
                              <View style={styles.ratingActions}>
                                {ratingActionId === member.userId ? (
                                  <ActivityIndicator color={palette.ember} size="small" />
                                ) : submittedRatedUserIds.has(member.userId) &&
                                  !revisingRatedUserIds.has(member.userId) ? (
                                  <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel="Revisar avaliação"
                                    onPress={() => beginMemberRating(member.userId)}
                                    style={({ pressed }) => [
                                      styles.ratingRevisarButton,
                                      pressed ? styles.ratingRevisarButtonPressed : null,
                                    ]}
                                  >
                                    <Text style={styles.ratingRevisarButtonLabel}>Revisar</Text>
                                  </Pressable>
                                ) : (
                                  <View style={styles.ratingIconRow}>
                                    <Pressable
                                      accessibilityRole="button"
                                      accessibilityLabel="Nota 5, compareceu"
                                      onPress={() => {
                                        void submitMemberRating(member.userId, true, 5);
                                      }}
                                      style={({ pressed }) => [
                                        styles.ratingThumbCircle,
                                        styles.ratingThumbUp,
                                        pressed ? styles.ratingThumbPressed : null,
                                      ]}
                                    >
                                      <AppIcon
                                        iosName="hand.thumbsup.fill"
                                        fallbackName="thumb-up"
                                        size={18}
                                        color={palette.ink}
                                        type="monochrome"
                                      />
                                    </Pressable>
                                    <Pressable
                                      accessibilityRole="button"
                                      accessibilityLabel="No-show, não compareceu"
                                      onPress={() => {
                                        void submitMemberRating(member.userId, false);
                                      }}
                                      style={({ pressed }) => [
                                        styles.ratingThumbCircle,
                                        styles.ratingThumbDown,
                                        pressed ? styles.ratingThumbPressed : null,
                                      ]}
                                    >
                                      <AppIcon
                                        iosName="hand.thumbsdown.fill"
                                        fallbackName="thumb-down"
                                        size={18}
                                        color={palette.sand}
                                        type="monochrome"
                                      />
                                    </Pressable>
                                  </View>
                                )}
                              </View>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {selectedChatAllowsMessages ? (
                  <View
                    style={[
                      styles.composerWrap,
                      showRatingBar ? styles.footerNoTopHairline : null,
                      {
                        paddingBottom: keyboardVisible
                          ? spacing.sm
                          : Math.max(insets.bottom - 6, 0),
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
                      showRatingBar ? styles.footerNoTopHairline : null,
                      {
                        paddingBottom: keyboardVisible
                          ? spacing.sm
                          : Math.max(insets.bottom - 6, 0),
                      },
                    ]}
                  >
                    <Text style={styles.closedGroupNoticeText}>
                      {isPrivateThread
                        ? "Vocês não podem enviar mensagens enquanto houver bloqueio entre vocês."
                        : meetup
                          ? `Esse grupo está ${formatMeetupStatus(meetup.status).toLowerCase()} e não aceita novas mensagens.`
                          : ""}
                    </Text>
                  </View>
                )}
              </View>
            ),
          },
          ...(meetup && !isPrivateThread && detailsOpen
            ? [
                {
                  key: "details",
                  headerRight: (
                    <SheetCircleIconButton
                      accessibilityLabel="Ver no mapa"
                      iosName="map.fill"
                      fallbackName="map"
                      diameter={SHEET_BACK_BUTTON_MIN_HEIGHT}
                      iconSize={18}
                      onPress={onOpenMeetupPinOnMap}
                    />
                  ),
                  content: (
                    <ScrollView
                      contentContainerStyle={[styles.sceneContent, styles.sceneContentCompactLead]}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      bounces={false}
                    >
                      <View style={styles.sceneLeadMinimal}>
                        <View style={styles.sceneLeadDateTime} pointerEvents="box-none">
                          <Text style={styles.detailsLeadDate}>
                            {formatMeetupDate(meetup.startsAt)}
                          </Text>
                          <Text style={styles.detailsLeadTime}>
                            {formatMeetupTime(meetup.startsAt)}
                          </Text>
                        </View>
                        <Text style={styles.detailsFormatEyebrow}>{meetup.formatName}</Text>
                        <Text style={styles.detailsLeadTitle}>{meetup.title}</Text>
                        <Text style={styles.detailsLeadAddress}>
                          {formatCompactAddress(meetup.addressLabel || meetup.locationHint)}
                        </Text>
                      </View>

                      <View style={styles.statusPanel}>
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

                      <MeetupParticipantsBlock
                        meetup={meetup}
                        meetupPresence={meetupPresence}
                        loadingMeetupPresence={loadingMeetupPresence}
                        onOpenPlayerProfile={onOpenPlayerProfile}
                        onRemoveParticipant={onRemoveParticipant}
                        removingParticipantId={removingParticipantId}
                        manageAvatarsMode={manageParticipantsAvatarsMode}
                        onManageAvatarsModeChange={setManageParticipantsAvatarsMode}
                      />

                      {meetup.isCreator ? (
                        <View style={styles.creatorSection}>
                          <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionCaption}>Gerenciar partida</Text>
                          </View>
                          <View style={styles.actionRow}>
                            <View style={styles.actionCell}>
                              <PrimaryButton
                                label="Editar"
                                onPress={onEditMeetup}
                                tone="ghost"
                                fullWidth
                              />
                            </View>
                            <View style={styles.actionCell}>
                              <PrimaryButton
                                label={
                                  updatingMeetupAction === "chat-status:closed"
                                    ? "..."
                                    : "Encerrar"
                                }
                                onPress={() => onUpdateMeetupStatus("closed")}
                                tone="ghost"
                                fullWidth
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
                                fullWidth
                              />
                            </View>
                          </View>
                        </View>
                      ) : null}
                    </ScrollView>
                  ),
                },
              ]
            : []),
        ]}
        onPop={() => setDetailsOpen(false)}
        scenePaddingHorizontal={0}
        sceneHeaderPaddingHorizontal={spacing.lg}
      />
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
    backgroundColor: "transparent",
  },
  emptyScreen: {
    flex: 1,
    backgroundColor: "transparent",
  },
  chatHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: "transparent",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  chatHeaderBarEmpty: {
    gap: 0,
  },
  chatHeaderBarSide: {
    flex: 1,
    minWidth: 0,
  },
  chatHeaderBarSideStart: {
    alignItems: "flex-start",
  },
  chatHeaderMainRow: {
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
    borderColor: "rgba(6,10,9,0.92)",
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
    flexShrink: 0,
    color: palette.sand,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyBodyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: palette.pageChrome,
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
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  sceneContentCompactLead: {
    gap: spacing.md,
  },
  sceneLeadMinimal: {
    alignSelf: "stretch",
    width: "100%",
    gap: 4,
    position: "relative",
    /** Space for absolute date/time column so title/address don’t run underneath. */
    paddingRight: 92,
  },
  sceneLeadDateTime: {
    position: "absolute",
    top: 0,
    right: 0,
    alignItems: "flex-end",
    gap: 2,
    zIndex: 1,
  },
  /** Same as `AppleListRow` `rowLabelCompact` (“Quando”). */
  detailsLeadDate: {
    color: palette.sand,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "700",
    textAlign: "right",
  },
  /** Same as compact row trailing time (accent / `palette.ember`). */
  detailsLeadTime: {
    color: palette.ember,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "right",
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sectionCaption: {
    color: palette.parchment,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  creatorSection: {
    gap: spacing.sm,
    paddingLeft: 0,
  },
  messagesArea: {
    flex: 1,
    backgroundColor: palette.pageChrome,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
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
    backgroundColor: "rgba(17,17,17,0.12)",
    borderLeftWidth: 3,
    borderLeftColor: "rgba(17,17,17,0.35)",
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
  replyPreviewAuthorOnMine: {
    color: palette.ink,
  },
  replyPreviewTextOnMine: {
    color: "rgba(17,17,17,0.82)",
  },
  messageBubbleMine: {
    backgroundColor: palette.ember,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.12)",
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
    color: palette.ink,
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
    color: "rgba(17,17,17,0.62)",
  },
  messageTimeOther: {
    color: palette.pine,
  },
  messageError: {
    color: "#F6A6A6",
    fontSize: 12,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  ratingBarWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  ratingTogglePill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ratingTogglePillOrange: {
    backgroundColor: palette.ember,
    borderColor: "rgba(17,17,17,0.12)",
  },
  /** “Recolher” — pill transparente (glass). */
  ratingTogglePillGlass: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: palette.line,
  },
  ratingTogglePillPressed: {
    opacity: 0.9,
  },
  /** Mesmo tamanho de linha que o subtítulo “Commander” (`chatSubtitle`). */
  ratingTogglePillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  ratingTogglePillTextOrange: {
    color: palette.ink,
  },
  ratingTogglePillTextGlass: {
    color: palette.sand,
  },
  ratingStrip: {
    gap: spacing.sm,
    paddingHorizontal: 0,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: "transparent",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  ratingRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  ratingCard: {
    width: 132,
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
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
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingIconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  /** Mesmo diâmetro do `composerSendButton` (36). */
  ratingThumbCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  ratingThumbUp: {
    backgroundColor: palette.ember,
    borderColor: "rgba(17,17,17,0.12)",
  },
  ratingThumbDown: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: palette.line,
  },
  ratingThumbPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  ratingRevisarButton: {
    alignSelf: "center",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
  },
  ratingRevisarButtonPressed: {
    opacity: 0.88,
  },
  ratingRevisarButtonLabel: {
    color: palette.sand,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
  },
  composerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: "transparent",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  /** When a rating strip is shown above, it already provides the top hairline; hide the duplicate line. */
  footerNoTopHairline: {
    borderTopWidth: 0,
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
    borderTopWidth: 0,
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: "transparent",
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
