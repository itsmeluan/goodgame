import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleListSection } from "@/components/AppleListNavigation";
import { Avatar } from "@/components/Avatar";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  MapEmptyCard,
  MapInlineNotice,
} from "@/features/map/components/MapFeedbackPrimitives";
import { MapClosePageButton } from "@/features/map/components/MapClosePageButton";
import { formatRelativeTimestamp } from "@/lib/formatting";
import { palette, spacing } from "@/theme/tokens";
import type { BlockedUserProfile } from "@/types/domain";

type BlockedUsersPageProps = {
  blockedUsers: BlockedUserProfile[];
  blockedUsersError: string | null;
  blockedUsersSuccess: string | null;
  loadingBlockedUsers: boolean;
  unblockingUserId: string | null;
  bottomInset: number;
  onUnblockUser: (user: BlockedUserProfile) => void;
  onClose: () => void;
  /** Renders as a scene inside Minha conta (no “Voltar ao mapa”; stack back only). */
  embeddedInAccount?: boolean;
};

export function BlockedUsersPage({
  blockedUsers,
  blockedUsersError,
  blockedUsersSuccess,
  loadingBlockedUsers,
  unblockingUserId,
  bottomInset,
  onUnblockUser,
  onClose,
  embeddedInAccount = false,
}: BlockedUsersPageProps) {
  const scrollContentStyle = embeddedInAccount
    ? [styles.embeddedContent, { paddingBottom: bottomInset + spacing.xxl }]
    : [styles.content, { paddingBottom: bottomInset + spacing.xxl }];

  return (
    <ScrollView
      contentContainerStyle={scrollContentStyle}
      showsVerticalScrollIndicator={false}
    >
      {blockedUsersError ? <MapInlineNotice tone="error" message={blockedUsersError} /> : null}
      {blockedUsersSuccess ? (
        <MapInlineNotice tone="success" message={blockedUsersSuccess} />
      ) : null}

      {embeddedInAccount ? (
        <View style={styles.sceneLead}>
          <Text style={styles.sceneLeadTitle}>Usuários bloqueados</Text>
          <Text style={styles.sceneLeadSubtitle}>
            Quem estiver aqui deixa de aparecer normalmente nas interações do GG.
          </Text>
        </View>
      ) : (
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Usuários bloqueados</Text>
          <Text style={styles.introBody}>
            Quem estiver aqui deixa de aparecer normalmente nas interações do GG.
          </Text>
        </View>
      )}

      {loadingBlockedUsers ? (
        <MapEmptyCard
          title="Carregando bloqueios"
          body="Buscando a sua lista de jogadores bloqueados."
        />
      ) : blockedUsers.length ? (
        <AppleListSection
          subtitle={`${blockedUsers.length} jogador(es)`}
          size="compact"
        >
          <View style={styles.list}>
            {blockedUsers.map((user, index) => (
              <View
                key={user.userId}
                style={[
                  styles.card,
                  embeddedInAccount ? styles.cardEmbedded : null,
                  index > 0 ? styles.cardSeparator : null,
                ]}
              >
                <View style={styles.identityRow}>
                  <Avatar
                    name={user.displayName}
                    uri={user.avatarUrl}
                    size={44}
                    isPro={Boolean(user.isPro)}
                  />
                  <View style={styles.copy}>
                    <Text style={styles.name}>{user.displayName}</Text>
                    <Text style={styles.meta}>@{user.handle}</Text>
                    <Text style={styles.meta}>
                      {user.neighborhood || "Bairro não informado"} · bloqueado{" "}
                      {formatRelativeTimestamp(user.blockedAt)}
                    </Text>
                  </View>
                </View>

                {user.reason ? (
                  <View style={styles.reasonWrap}>
                    <Text style={styles.reasonLabel}>Motivo</Text>
                    <Text style={styles.reasonValue}>{user.reason}</Text>
                  </View>
                ) : null}

                <PrimaryButton
                  label="Desbloquear"
                  onPress={() => onUnblockUser(user)}
                  tone="ghost"
                  size="compact"
                  loading={unblockingUserId === user.userId}
                />
              </View>
            ))}
          </View>
        </AppleListSection>
      ) : (
        <MapEmptyCard
          title="Nenhum jogador bloqueado"
          body="Se você bloquear alguém no perfil público, a pessoa vai aparecer aqui."
        />
      )}

      {embeddedInAccount ? null : <MapClosePageButton onPress={onClose} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  embeddedContent: {
    alignItems: "stretch",
    paddingTop: 8,
    gap: 12,
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
  introCard: {
    gap: 4,
  },
  introTitle: {
    color: palette.sand,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  introBody: {
    color: palette.mist,
    fontSize: 12,
    lineHeight: 17,
  },
  list: {
    marginHorizontal: 0,
  },
  card: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cardEmbedded: {
    paddingHorizontal: 0,
  },
  cardSeparator: {
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  identityRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: palette.sand,
    fontSize: 16,
    fontWeight: "800",
  },
  meta: {
    color: palette.mist,
    fontSize: 13,
    lineHeight: 18,
  },
  reasonWrap: {
    gap: 4,
  },
  reasonLabel: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  reasonValue: {
    color: palette.sand,
    fontSize: 13,
    lineHeight: 19,
  },
});
