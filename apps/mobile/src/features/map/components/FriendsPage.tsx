import { useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppleListGroup,
  AppleListRow,
  AppleListSection,
} from "@/components/AppleListNavigation";
import { AppIcon } from "@/components/AppIcon";
import { Avatar } from "@/components/Avatar";
import { GlassCard } from "@/components/GlassCard";
import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { TextField } from "@/components/TextField";
import { MapPageCloseFooter } from "@/features/map/components/MapPageCloseFooter";
import { MapEmptyCard, MapInlineNotice } from "@/features/map/components/MapFeedbackPrimitives";
import {
  FriendStatusPill,
  MiniIconActionButton,
  formatRelationshipStateLabel,
} from "@/features/map/components/FriendsPagePrimitives";
import type {
  FriendActionCandidate,
  RecentPlayerCard,
} from "@/features/map/friendTypes";
import { formatRelativeTimestamp } from "@/lib/formatting";
import { palette, spacing } from "@/theme/tokens";
import type { FriendProfile, PlayerSearchResult } from "@/types/domain";

type FriendsPageProps = {
  bottomInset: number;
  friendError: string | null;
  friendSuccess: string | null;
  incomingFriendRequests: FriendProfile[];
  friendRequestsExpanded: boolean;
  onToggleFriendRequests: () => void;
  acceptedFriends: FriendProfile[];
  outgoingFriendRequests: FriendProfile[];
  onlineFriendsCount: number;
  lastFriendSyncAt: Date | null;
  playerSearchQuery: string;
  onChangePlayerSearchQuery: (value: string) => void;
  onSearchPlayers: () => void;
  searchingPlayers: boolean;
  playerSearchResults: PlayerSearchResult[];
  recentPlayers: RecentPlayerCard[];
  friendActionId: string | null;
  onOpenPlayerProfile: (userId: string) => void;
  onSendFriendRequest: (candidate: FriendActionCandidate) => void;
  onRespondToFriendRequest: (
    friendshipId: string,
    accept: boolean,
    candidate: FriendActionCandidate
  ) => void;
  onRemoveFriend: (userId: string) => void;
  onClose: () => void;
};

type FriendsRouteKey = "requests" | "search" | "recent" | "friends" | "outgoing";

export function FriendsPage({
  bottomInset,
  friendError,
  friendSuccess,
  incomingFriendRequests,
  friendRequestsExpanded: _friendRequestsExpanded,
  onToggleFriendRequests: _onToggleFriendRequests,
  acceptedFriends,
  outgoingFriendRequests,
  onlineFriendsCount,
  lastFriendSyncAt: _lastFriendSyncAt,
  playerSearchQuery,
  onChangePlayerSearchQuery,
  onSearchPlayers,
  searchingPlayers,
  playerSearchResults,
  recentPlayers,
  friendActionId,
  onOpenPlayerProfile,
  onSendFriendRequest,
  onRespondToFriendRequest,
  onRemoveFriend,
  onClose,
}: FriendsPageProps) {
  const [routeKeys, setRouteKeys] = useState<FriendsRouteKey[]>([]);

  const incomingRequestsByUserId = useMemo(
    () => new Map(incomingFriendRequests.map((friend) => [friend.userId, friend] as const)),
    [incomingFriendRequests]
  );

  const pushRoute = (key: FriendsRouteKey) => {
    setRouteKeys((current) => (current[current.length - 1] === key ? current : [...current, key]));
  };

  const popRoute = () => {
    setRouteKeys((current) => current.slice(0, -1));
  };

  const routes = [
    {
      key: "root",
      content: (
        <View style={styles.rootWithFooter}>
          <ScrollView
            style={styles.rootScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, styles.rootScrollContent]}
          >
            {friendError ? <MapInlineNotice tone="error" message={friendError} /> : null}
            {friendSuccess ? <MapInlineNotice tone="success" message={friendSuccess} /> : null}

            <AppleListSection size="compact">
              <AppleListGroup>
                <AppleListRow
                  icon={{ iosName: "person.badge.plus", fallbackName: "person-add-alt-1" }}
                  label="Solicitações recebidas"
                  trailingValue={String(incomingFriendRequests.length)}
                  onPress={() => pushRoute("requests")}
                  tone={incomingFriendRequests.length ? "accent" : "default"}
                  size="compact"
                />
                <AppleListRow
                  separator
                  icon={{ iosName: "magnifyingglass", fallbackName: "search" }}
                  label="Buscar jogadores"
                  onPress={() => pushRoute("search")}
                  size="compact"
                />
                <AppleListRow
                  separator
                  icon={{ iosName: "clock.arrow.circlepath", fallbackName: "history" }}
                  label="Últimos jogadores"
                  trailingValue={String(recentPlayers.length)}
                  onPress={() => pushRoute("recent")}
                  size="compact"
                />
                <AppleListRow
                  separator
                  icon={{ iosName: "person.2.fill", fallbackName: "groups-2" }}
                  label="Seus amigos"
                  trailingValue={String(acceptedFriends.length)}
                  onPress={() => pushRoute("friends")}
                  size="compact"
                />
                {outgoingFriendRequests.length ? (
                  <AppleListRow
                    separator
                    icon={{ iosName: "paperplane.fill", fallbackName: "send" }}
                    label="Convites enviados"
                    trailingValue={String(outgoingFriendRequests.length)}
                    onPress={() => pushRoute("outgoing")}
                    size="compact"
                  />
                ) : null}
              </AppleListGroup>
            </AppleListSection>
          </ScrollView>
          <MapPageCloseFooter bottomInset={bottomInset} onClose={onClose} />
        </View>
      ),
    },
    ...routeKeys.map((routeKey) => {
      if (routeKey === "requests") {
        return {
          key: routeKey,
          content: (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sceneContent}>
              <View style={styles.sceneLead}>
                <Text style={styles.sceneLeadTitle}>Solicitações recebidas</Text>
              </View>
              {incomingFriendRequests.length ? (
                <View style={styles.edgeList}>
                  {incomingFriendRequests.map((friend, index) => (
                    <FriendProfileCard
                      key={friend.friendshipId}
                      separator={index > 0}
                      name={friend.displayName}
                      avatarUrl={friend.avatarUrl}
                      isPro={Boolean(friend.isPro)}
                      meta={friend.neighborhood ? `@${friend.handle} · ${friend.neighborhood}` : `@${friend.handle}`}
                      supporting={friend.isOnline ? "Online agora" : "Convite pendente"}
                      onPress={() => onOpenPlayerProfile(friend.userId)}
                      actions={
                        <View style={styles.friendIconActions}>
                          <MiniIconActionButton
                            icon="close"
                            accessibilityLabel={`Recusar ${friend.displayName}`}
                            onPress={() =>
                              onRespondToFriendRequest(friend.friendshipId, false, friendToCandidate(friend))
                            }
                            tone="ghost"
                          />
                          <MiniIconActionButton
                            icon="check"
                            accessibilityLabel={`Aceitar ${friend.displayName}`}
                            onPress={() =>
                              onRespondToFriendRequest(friend.friendshipId, true, friendToCandidate(friend))
                            }
                          />
                        </View>
                      }
                    />
                  ))}
                </View>
              ) : (
                <MapEmptyCard
                  title="Sem solicitações pendentes"
                  body="Quando alguém te adicionar, o convite vai aparecer aqui."
                />
              )}
            </ScrollView>
          ),
        };
      }

      if (routeKey === "search") {
        return {
          key: routeKey,
          content: (
            <KeyboardAwareScrollView
              keyboardShouldPersistTaps="handled"
              keyboardOffset={118}
              contentContainerStyle={styles.sceneContent}
            >
              <View style={styles.sceneLead}>
                <Text style={styles.sceneLeadTitle}>Buscar jogadores</Text>
              </View>
              <GlassCard style={styles.formCard}>
                <TextField
                  label="Buscar jogadores"
                  value={playerSearchQuery}
                  onChangeText={onChangePlayerSearchQuery}
                  placeholder="Nome, @handle, bairro ou e-mail"
                  autoCapitalize="none"
                />
                <View style={styles.rowActions}>
                  <View style={styles.rowActionCell}>
                    <PrimaryButton label="Buscar" onPress={onSearchPlayers} loading={searchingPlayers} />
                  </View>
                </View>
              </GlassCard>

              {playerSearchResults.length ? (
                <View style={styles.edgeList}>
                  {playerSearchResults.map((player, index) => {
                    const incoming = incomingRequestsByUserId.get(player.userId) ?? null;

                    return (
                      <FriendProfileCard
                        key={player.userId}
                        separator={index > 0}
                        name={player.displayName}
                        avatarUrl={player.avatarUrl}
                        isPro={Boolean(player.isPro)}
                        meta={
                          player.neighborhood
                            ? `@${player.handle} · ${player.neighborhood}`
                            : `@${player.handle}`
                        }
                        supporting={player.isOnline ? "Online agora" : "Offline"}
                        onPress={() => onOpenPlayerProfile(player.userId)}
                        actions={
                          <View style={styles.rowActions}>
                            {player.relationshipState === "none" ? (
                              <View style={styles.rowActionCell}>
                                <PrimaryButton
                                  label="Adicionar"
                                  onPress={() => onSendFriendRequest(playerToCandidate(player))}
                                  loading={friendActionId === player.userId}
                                />
                              </View>
                            ) : player.relationshipState === "incoming" && incoming ? (
                              <View style={styles.friendIconActionsRow}>
                                <MiniIconActionButton
                                  icon="close"
                                  accessibilityLabel={`Recusar ${player.displayName}`}
                                  onPress={() =>
                                    onRespondToFriendRequest(
                                      incoming.friendshipId,
                                      false,
                                      playerToCandidate(player)
                                    )
                                  }
                                  tone="ghost"
                                />
                                <MiniIconActionButton
                                  icon="check"
                                  accessibilityLabel={`Aceitar ${player.displayName}`}
                                  onPress={() =>
                                    onRespondToFriendRequest(
                                      incoming.friendshipId,
                                      true,
                                      playerToCandidate(player)
                                    )
                                  }
                                />
                              </View>
                            ) : player.relationshipState === "friend" ? (
                              <View style={styles.rowActionCell}>
                                <PrimaryButton
                                  label="Remover"
                                  onPress={() => onRemoveFriend(player.userId)}
                                  tone="ghost"
                                  loading={friendActionId === player.userId}
                                />
                              </View>
                            ) : (
                              <View style={styles.rowActionCell}>
                                <PrimaryButton
                                  label="Cancelar convite"
                                  onPress={() => onRemoveFriend(player.userId)}
                                  tone="ghost"
                                  loading={friendActionId === player.userId}
                                />
                              </View>
                            )}
                          </View>
                        }
                      />
                    );
                  })}
                </View>
              ) : (
                <MapEmptyCard
                  title="Nenhum resultado ainda"
                  body="Busque um nome ou handle para começar a montar sua rede."
                />
              )}
            </KeyboardAwareScrollView>
          ),
        };
      }

      if (routeKey === "recent") {
        return {
          key: routeKey,
          content: (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sceneContent}>
              <View style={styles.sceneLead}>
                <Text style={styles.sceneLeadTitle}>Últimos jogadores</Text>
              </View>
              {recentPlayers.length ? (
                <View style={styles.edgeList}>
                  {recentPlayers.map((player, index) => (
                    <FriendProfileCard
                      key={player.userId}
                      separator={index > 0}
                      name={player.displayName}
                      avatarUrl={player.avatarUrl}
                      isPro={Boolean(player.isPro)}
                      meta={
                        player.neighborhood
                          ? `@${player.handle} · ${player.neighborhood}`
                          : `@${player.handle}`
                      }
                      supporting={`Último jogo ${formatRelativeTimestamp(player.playedAt)}`}
                      onPress={() => onOpenPlayerProfile(player.userId)}
                      actions={
                        player.relationshipState === "none" ? (
                          <MiniIconActionButton
                            icon="person-add-alt-1"
                            accessibilityLabel={`Adicionar ${player.displayName}`}
                            onPress={() => onSendFriendRequest(recentPlayerToCandidate(player))}
                          />
                        ) : (
                          <FriendStatusPill
                            label={formatRelationshipStateLabel(player.relationshipState)}
                            accent={player.relationshipState === "friend"}
                          />
                        )
                      }
                    />
                  ))}
                </View>
              ) : (
                <MapEmptyCard
                  title="Sem histórico recente"
                  body="Quando você participar de jogos, os últimos jogadores aparecem aqui."
                />
              )}
            </ScrollView>
          ),
        };
      }

      if (routeKey === "friends") {
        return {
          key: routeKey,
          content: (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sceneContent}>
              <View style={styles.sceneLead}>
                <Text style={styles.sceneLeadTitle}>Seus amigos</Text>
                <Text style={styles.sceneLeadSubtitle}>
                  {acceptedFriends.length} amigo(s) · {onlineFriendsCount} online agora
                </Text>
              </View>
              {acceptedFriends.length ? (
                <View style={styles.edgeList}>
                  {acceptedFriends.map((friend, index) => (
                    <FriendProfileCard
                      key={friend.friendshipId}
                      separator={index > 0}
                      name={friend.displayName}
                      avatarUrl={friend.avatarUrl}
                      isPro={Boolean(friend.isPro)}
                      meta={
                        friend.neighborhood
                          ? `@${friend.handle} · ${friend.neighborhood}`
                          : `@${friend.handle}`
                      }
                      supporting={
                        friend.isOnline
                          ? "Online agora"
                          : friend.lastSeenAt
                            ? `Visto ${formatRelativeTimestamp(friend.lastSeenAt)}`
                            : "Offline"
                      }
                      onPress={() => onOpenPlayerProfile(friend.userId)}
                      actions={
                        <View style={styles.rowActions}>
                          <View style={styles.rowActionCell}>
                            <PrimaryButton
                              label="Remover"
                              onPress={() => onRemoveFriend(friend.userId)}
                              tone="ghost"
                              loading={friendActionId === friend.userId}
                            />
                          </View>
                        </View>
                      }
                    />
                  ))}
                </View>
              ) : (
                <MapEmptyCard
                  title="Você ainda não adicionou amigos"
                  body="Comece buscando jogadores pelo nome ou handle."
                />
              )}
            </ScrollView>
          ),
        };
      }

      return {
        key: routeKey,
        content: (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sceneContent}>
            <View style={styles.sceneLead}>
              <Text style={styles.sceneLeadTitle}>Convites enviados</Text>
              <Text style={styles.sceneLeadSubtitle}>
                {outgoingFriendRequests.length} pendente(s)
              </Text>
            </View>
            {outgoingFriendRequests.length ? (
              <View style={styles.edgeList}>
                {outgoingFriendRequests.map((friend, index) => (
                  <FriendProfileCard
                    key={friend.friendshipId}
                    separator={index > 0}
                    name={friend.displayName}
                    avatarUrl={friend.avatarUrl}
                    isPro={Boolean(friend.isPro)}
                    meta={`@${friend.handle}`}
                    supporting="Aguardando resposta"
                    onPress={() => onOpenPlayerProfile(friend.userId)}
                    actions={
                      <View style={styles.rowActions}>
                        <View style={styles.rowActionCell}>
                          <PrimaryButton
                            label="Cancelar convite"
                            onPress={() => onRemoveFriend(friend.userId)}
                            tone="ghost"
                            loading={friendActionId === friend.userId}
                          />
                        </View>
                      </View>
                    }
                  />
                ))}
              </View>
            ) : (
              <MapEmptyCard
                title="Nenhum convite enviado"
                body="Quando você mandar novos convites, eles aparecem aqui."
              />
            )}
          </ScrollView>
        ),
      };
    }),
  ];

  return (
    <SlidingSheetStack
      routes={routes}
      onPop={popRoute}
      headerVariant="compact"
      scenePaddingHorizontal={spacing.lg}
    />
  );
}

function FriendProfileCard({
  separator = false,
  name,
  avatarUrl,
  isPro = false,
  meta,
  supporting,
  onPress,
  actions,
}: {
  separator?: boolean;
  name: string;
  avatarUrl: string | null;
  isPro?: boolean;
  meta: string;
  supporting: string;
  onPress: () => void;
  actions?: ReactNode;
}) {
  return (
    <View style={[styles.friendCard, separator ? styles.friendCardSeparator : null]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.friendProfilePressable, pressed ? styles.pressed : null]}
      >
        <View style={styles.friendRow}>
          <Avatar name={name} uri={avatarUrl} size={50} isPro={isPro} />
          <View style={styles.friendCopy}>
            <Text style={styles.friendName}>{name}</Text>
            <Text style={styles.friendMeta}>{meta}</Text>
            <Text style={styles.friendStatusLine}>{supporting}</Text>
          </View>
          <AppIcon
            iosName="chevron.right"
            fallbackName="chevron-right"
            size={18}
            color={palette.pine}
          />
        </View>
      </Pressable>
      {actions ? <View style={styles.friendActionsWrap}>{actions}</View> : null}
    </View>
  );
}

function friendToCandidate(friend: FriendProfile): FriendActionCandidate {
  return {
    userId: friend.userId,
    displayName: friend.displayName,
    handle: friend.handle,
    neighborhood: friend.neighborhood,
    bio: friend.bio,
    avatarPath: friend.avatarPath,
    avatarUrl: friend.avatarUrl,
    isPro: friend.isPro,
    proExpiresAt: friend.proExpiresAt,
    isOnline: friend.isOnline,
    lastSeenAt: friend.lastSeenAt,
  };
}

function playerToCandidate(player: PlayerSearchResult): FriendActionCandidate {
  return {
    userId: player.userId,
    displayName: player.displayName,
    handle: player.handle,
    neighborhood: player.neighborhood,
    bio: player.bio,
    avatarPath: player.avatarPath,
    avatarUrl: player.avatarUrl,
    isPro: player.isPro,
    proExpiresAt: player.proExpiresAt,
    isOnline: player.isOnline,
    lastSeenAt: null,
  };
}

function recentPlayerToCandidate(player: RecentPlayerCard): FriendActionCandidate {
  return {
    userId: player.userId,
    displayName: player.displayName,
    handle: player.handle,
    neighborhood: player.neighborhood,
    bio: player.bio,
    avatarPath: player.avatarPath,
    avatarUrl: player.avatarUrl,
    isPro: player.isPro,
    proExpiresAt: player.proExpiresAt,
    isOnline: player.isOnline,
    lastSeenAt: player.lastSeenAt,
  };
}

const styles = StyleSheet.create({
  rootWithFooter: {
    flex: 1,
  },
  rootScroll: {
    flex: 1,
  },
  rootScrollContent: {
    paddingBottom: spacing.lg,
  },
  content: {
    paddingTop: spacing.sm,
    gap: 12,
  },
  sceneContent: {
    alignItems: "stretch",
    paddingTop: 8,
    paddingBottom: spacing.xxl,
    gap: 12,
  },
  edgeList: {
    marginHorizontal: 0,
  },
  formCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.06)",
  },
  sceneLead: {
    alignSelf: "stretch",
    gap: 4,
    paddingTop: 2,
  },
  sceneLeadTitle: {
    color: palette.sand,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    textAlign: "left",
  },
  sceneLeadSubtitle: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 15,
    textAlign: "left",
  },
  friendCard: {
    gap: spacing.sm,
    paddingHorizontal: 0,
    paddingVertical: spacing.md,
  },
  friendCardSeparator: {
    borderTopWidth: 1,
    borderTopColor: "rgba(231,216,188,0.08)",
  },
  friendProfilePressable: {
    borderRadius: 0,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  friendCopy: {
    flex: 1,
    gap: 2,
  },
  friendName: {
    color: palette.sand,
    fontSize: 15,
    fontWeight: "700",
  },
  friendMeta: {
    color: palette.pine,
    fontSize: 12,
  },
  friendStatusLine: {
    color: palette.mist,
    fontSize: 12,
    lineHeight: 17,
  },
  friendActionsWrap: {
    paddingTop: spacing.xs,
  },
  friendIconActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  friendIconActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  rowActionCell: {
    flex: 1,
  },
  pressed: {
    opacity: 0.82,
  },
});
