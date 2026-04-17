import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AppleListGroup,
  AppleListRow,
  AppleListSection,
} from "@/components/AppleListNavigation";
import { AppIcon } from "@/components/AppIcon";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AddressAutocompleteField } from "@/features/map/components/AddressAutocompleteField";
import { StatusChip } from "@/features/map/components/MapSheetPrimitives";
import { formatHostMode } from "@/lib/formatting";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";
import type { AddressSuggestion } from "@/lib/placeSearch";
import type { MeetupStatus, MeetupPost } from "@/types/domain";

/** Watermelon red — aligned with list danger accents (AppleListNavigation). */
const WATERMELON_RED = "#E14D5C";
/** Join — bright green (sheet detail “Entrar”). */
const JOIN_GREEN = "#2BC250";

type MeetupSheetCardProps = {
  mode: "detail" | "manage";
  meetup: MeetupPost;
  selected: boolean;
  distanceLabel: string | null;
  effectiveStatus: MeetupStatus;
  overdue: boolean;
  gameName: string;
  formattedStartsAt: string;
  locationLabel: string;
  infoOpen: boolean;
  manageOpen: boolean;
  joining: boolean;
  leaving: boolean;
  savingEdits: boolean;
  closing: boolean;
  cancelling: boolean;
  deleting: boolean;
  manageDateLabel: string;
  manageHour: string;
  manageMinute: string;
  manageAddressQuery: string;
  manageAddressFocused: boolean;
  manageAddressSuggestions: AddressSuggestion[];
  manageAddressLoading: boolean;
  onFocusMeetupOnMap: () => void;
  onOpenPlayerProfile: () => void;
  onJoinMeetup: () => void;
  onLeaveMeetup: () => void;
  onOpenChat: () => void;
  onToggleManage: () => void;
  onToggleInfo: () => void;
  onOpenManageCalendar: () => void;
  onOpenManageTimePicker: () => void;
  /** Abre a cena de participantes (stack da sheet de jogos) a partir de Editar. */
  onOpenManageParticipants?: () => void;
  /** Abre a mesma cena a partir dos detalhes do jogo. */
  onOpenDetailParticipants?: () => void;
  onManageAddressFocusChange: (focused: boolean) => void;
  onManageAddressChange: (value: string) => void;
  onManageAddressUseCurrentLocation: () => void;
  onManageAddressUseTyped: () => void;
  onManageAddressSelect: (suggestion: AddressSuggestion) => void;
  onSaveEdits: () => void;
  onPromptClose: () => void;
  onPromptCancel: () => void;
  onPromptDelete: () => void;
};

export function MeetupSheetCard(props: MeetupSheetCardProps) {
  const {
    mode,
    meetup,
    distanceLabel,
    effectiveStatus,
    overdue,
    gameName,
    formattedStartsAt,
    locationLabel,
    joining,
    leaving,
    savingEdits,
    closing,
    cancelling,
    deleting,
    manageDateLabel,
    manageHour,
    manageMinute,
    manageAddressQuery,
    manageAddressFocused,
    manageAddressSuggestions,
    manageAddressLoading,
    onFocusMeetupOnMap,
    onOpenPlayerProfile,
    onJoinMeetup,
    onLeaveMeetup,
    onOpenChat,
    onToggleManage,
    onOpenManageCalendar,
    onOpenManageTimePicker,
    onOpenManageParticipants,
    onOpenDetailParticipants,
    onManageAddressFocusChange,
    onManageAddressChange,
    onManageAddressUseCurrentLocation,
    onManageAddressUseTyped,
    onManageAddressSelect,
    onSaveEdits,
    onPromptClose,
    onPromptCancel,
    onPromptDelete,
  } = props;

  const joinDisabled = effectiveStatus !== "open";
  const creatorLine = `${meetup.creatorDisplayName}${distanceLabel ? ` · ${distanceLabel}` : ""}`;
  const pageIntro = useRef(new Animated.Value(1)).current;
  const actionsBusy = closing || cancelling || deleting;
  const showEditAction = meetup.isCreator;

  function confirmLeaveMeetup() {
    Alert.alert(
      "Sair da partida",
      "Deseja sair deste jogo? Você perderá acesso ao chat e à participação.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: () => {
            triggerHaptic("warning");
            onLeaveMeetup();
          },
        },
      ]
    );
  }

  useEffect(() => {
    pageIntro.setValue(0);
    Animated.timing(pageIntro, {
      toValue: 1,
      duration: 220,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [mode, meetup.id, pageIntro]);

  const pageMotionStyle = {
    opacity: pageIntro,
    transform: [
      {
        translateY: pageIntro.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  } as const;

  if (mode === "manage") {
    return (
      <View style={styles.root}>
        <Animated.View style={[styles.page, styles.managePage, pageMotionStyle]}>
          <View style={styles.manageLead}>
            <Text style={styles.eyebrow}>Editar partida</Text>
            <Text style={styles.manageTitle}>{meetup.title}</Text>
            <Text style={styles.manageSupport}>Ajuste data, horário e local sem sair do drawer.</Text>
          </View>

          <AppleListSection title="Agenda" size="compact">
            <AppleListGroup>
              <AppleListRow
                icon={{ iosName: "calendar", fallbackName: "calendar-month" }}
                label="Data"
                subtitle={manageDateLabel}
                onPress={onOpenManageCalendar}
                size="compact"
              />
              <AppleListRow
                separator
                icon={{ iosName: "clock.fill", fallbackName: "schedule" }}
                label="Horário"
                subtitle={`${manageHour}:${manageMinute}`}
                onPress={onOpenManageTimePicker}
                size="compact"
              />
              {onOpenManageParticipants ? (
                <AppleListRow
                  separator
                  icon={{ iosName: "person.3.fill", fallbackName: "groups" }}
                  label="Participantes"
                  subtitle={String(meetup.joinedPlayers)}
                  onPress={onOpenManageParticipants}
                  size="compact"
                />
              ) : null}
            </AppleListGroup>
          </AppleListSection>

          <AppleListSection title="Local" size="compact">
            <AddressAutocompleteField
              label="Endereço"
              value={manageAddressQuery}
              focused={manageAddressFocused}
              onFocusChange={onManageAddressFocusChange}
              onChangeText={onManageAddressChange}
              suggestions={manageAddressSuggestions}
              loading={manageAddressLoading}
              onUseCurrentLocation={onManageAddressUseCurrentLocation}
              onUseTypedAddress={onManageAddressUseTyped}
              onSelectSuggestion={onManageAddressSelect}
              placeholder="Toque para atualizar o endereço"
            />
          </AppleListSection>

          <View style={styles.actionSection}>
            <PrimaryButton
              label="Salvar alterações"
              onPress={onSaveEdits}
              loading={savingEdits}
            />
          </View>

          <AppleListSection title="Encerramento" size="compact">
            <View style={styles.destructiveRow}>
              <View style={styles.destructiveRowCell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar partida"
                  disabled={(actionsBusy && !cancelling) || cancelling}
                  onPress={() => {
                    triggerHaptic("warning");
                    onPromptCancel();
                  }}
                  style={({ pressed }) => [
                    styles.destructiveMiniButton,
                    styles.watermelonOutlineButton,
                    pressed ? styles.inlinePressed : null,
                    (actionsBusy && !cancelling) || cancelling ? styles.destructiveDisabled : null,
                  ]}
                >
                  {cancelling ? (
                    <ActivityIndicator color={WATERMELON_RED} />
                  ) : (
                    <Text style={styles.watermelonOutlineLabel}>Cancelar</Text>
                  )}
                </Pressable>
              </View>
              <View style={styles.destructiveRowCell}>
                <PrimaryButton
                  label="Encerrar"
                  onPress={onPromptClose}
                  tone="ghost"
                  loading={closing}
                  disabled={actionsBusy && !closing}
                  fullWidth
                />
              </View>
              <View style={styles.destructiveRowCell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Excluir jogo"
                  disabled={(actionsBusy && !deleting) || deleting}
                  onPress={() => {
                    triggerHaptic("warning");
                    onPromptDelete();
                  }}
                  style={({ pressed }) => [
                    styles.destructiveMiniButton,
                    styles.watermelonSolidButton,
                    pressed ? styles.inlinePressed : null,
                    (actionsBusy && !deleting) || deleting ? styles.destructiveDisabled : null,
                  ]}
                >
                  {deleting ? (
                    <ActivityIndicator color={palette.ink} />
                  ) : (
                    <Text style={styles.watermelonSolidLabel}>Excluir</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </AppleListSection>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.page, pageMotionStyle]}>
        <View style={styles.detailLead}>
          <View style={styles.headerMetaRow}>
            <Text style={styles.eyebrow}>{gameName}</Text>
            <StatusChip status={effectiveStatus} overdue={overdue} compact />
          </View>
          <Text style={styles.detailTitle}>{meetup.title}</Text>
          <Text style={[styles.detailMeta, overdue ? styles.detailMetaOverdue : null]}>
            {formattedStartsAt}
          </Text>
          <Text style={styles.detailAddress}>{locationLabel}</Text>
          <Pressable onPress={onOpenPlayerProfile} style={({ pressed }) => [pressed ? styles.inlinePressed : null]}>
            <Text style={styles.detailSecondary}>{creatorLine}</Text>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.actionCluster}>
            {meetup.isCreator ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver no mapa"
                  onPress={() => {
                    triggerHaptic("selection");
                    onFocusMeetupOnMap();
                  }}
                  style={({ pressed }) => [
                    styles.circleActionButton,
                    styles.circleActionButtonGlass,
                    pressed ? styles.circleActionButtonPressed : null,
                  ]}
                >
                  <AppIcon
                    iosName="map.fill"
                    fallbackName="map"
                    size={20}
                    color={palette.sand}
                  />
                </Pressable>

                {showEditAction ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Editar partida"
                    onPress={() => {
                      triggerHaptic("selection");
                      onToggleManage();
                    }}
                    style={({ pressed }) => [
                      styles.circleActionButton,
                      styles.circleActionButtonGlass,
                      pressed ? styles.circleActionButtonPressed : null,
                    ]}
                  >
                    <AppIcon
                      iosName="slider.horizontal.3"
                      fallbackName="tune"
                      size={20}
                      color={palette.sand}
                    />
                  </Pressable>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Abrir chat"
                  onPress={() => {
                    triggerHaptic("soft");
                    onOpenChat();
                  }}
                  style={({ pressed }) => [
                    styles.circleActionButton,
                    styles.circleActionButtonEmber,
                    pressed ? styles.circleActionButtonPressed : null,
                  ]}
                >
                  <AppIcon
                    iosName="bubble.left.and.bubble.right.fill"
                    fallbackName="forum"
                    size={20}
                    color={palette.ink}
                    type="monochrome"
                  />
                </Pressable>
              </>
            ) : meetup.isMember ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sair da partida"
                  accessibilityState={{ disabled: leaving }}
                  disabled={leaving}
                  onPress={confirmLeaveMeetup}
                  style={({ pressed }) => [
                    styles.circleActionButton,
                    styles.circleActionButtonWatermelon,
                    pressed && !leaving ? styles.circleActionButtonPressed : null,
                    leaving ? styles.circleActionButtonDisabled : null,
                  ]}
                >
                  {leaving ? (
                    <ActivityIndicator color={palette.ink} size="small" />
                  ) : (
                    <AppIcon
                      iosName="arrow.left.to.line"
                      fallbackName="logout"
                      size={20}
                      color={palette.ink}
                      type="monochrome"
                    />
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver no mapa"
                  onPress={() => {
                    triggerHaptic("selection");
                    onFocusMeetupOnMap();
                  }}
                  style={({ pressed }) => [
                    styles.circleActionButton,
                    styles.circleActionButtonGlass,
                    pressed ? styles.circleActionButtonPressed : null,
                  ]}
                >
                  <AppIcon
                    iosName="map.fill"
                    fallbackName="map"
                    size={20}
                    color={palette.sand}
                  />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Abrir chat"
                  onPress={() => {
                    triggerHaptic("soft");
                    onOpenChat();
                  }}
                  style={({ pressed }) => [
                    styles.circleActionButton,
                    styles.circleActionButtonEmber,
                    pressed ? styles.circleActionButtonPressed : null,
                  ]}
                >
                  <AppIcon
                    iosName="bubble.left.and.bubble.right.fill"
                    fallbackName="forum"
                    size={20}
                    color={palette.ink}
                    type="monochrome"
                  />
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={joinDisabled ? "Partida indisponível" : "Entrar na partida"}
                  accessibilityState={{ disabled: joinDisabled || joining }}
                  disabled={joinDisabled || joining}
                  onPress={() => {
                    if (joinDisabled) {
                      return;
                    }
                    triggerHaptic("soft");
                    onJoinMeetup();
                  }}
                  style={({ pressed }) => [
                    styles.circleActionButton,
                    styles.circleActionButtonJoin,
                    pressed && !joinDisabled && !joining ? styles.circleActionButtonPressed : null,
                    joinDisabled || joining ? styles.circleActionButtonDisabled : null,
                  ]}
                >
                  {joining ? (
                    <ActivityIndicator color={palette.ink} size="small" />
                  ) : (
                    <AppIcon
                      iosName="arrow.right.to.line"
                      fallbackName="login"
                      size={20}
                      color={palette.ink}
                      type="monochrome"
                    />
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver no mapa"
                  onPress={() => {
                    triggerHaptic("selection");
                    onFocusMeetupOnMap();
                  }}
                  style={({ pressed }) => [
                    styles.circleActionButton,
                    styles.circleActionButtonGlass,
                    pressed ? styles.circleActionButtonPressed : null,
                  ]}
                >
                  <AppIcon
                    iosName="map.fill"
                    fallbackName="map"
                    size={20}
                    color={palette.sand}
                  />
                </Pressable>
              </>
            )}
          </View>
        </View>

        <AppleListGroup>
          <AppleListRow
            icon={{ iosName: "calendar", fallbackName: "calendar-month" }}
            label="Quando"
            subtitle={formattedStartsAt}
            showChevron={false}
            size="compact"
          />
          <AppleListRow
            separator
            icon={{ iosName: "square.grid.2x2.fill", fallbackName: "grid-view" }}
            label="Formato"
            subtitle={meetup.formatName}
            showChevron={false}
            size="compact"
          />
          {onOpenDetailParticipants ? (
            <AppleListRow
              separator
              icon={{ iosName: "person.3.fill", fallbackName: "groups" }}
              label="Participantes"
              subtitle={String(meetup.joinedPlayers)}
              onPress={() => {
                triggerHaptic("selection");
                onOpenDetailParticipants();
              }}
              size="compact"
            />
          ) : null}
          <AppleListRow
            separator
            icon={{ iosName: "globe", fallbackName: "public" }}
            label="Modo"
            subtitle={formatHostMode(meetup.hostMode)}
            showChevron={false}
            size="compact"
          />
          <AppleListRow
            separator
            icon={{ iosName: "mappin.and.ellipse", fallbackName: "location-on" }}
            label="Local"
            subtitle={locationLabel}
            showChevron={false}
            size="compact"
          />
        </AppleListGroup>

        {meetup.description.trim() ? (
          <View style={styles.noteBlock}>
            <Text style={styles.noteLabel}>Notas</Text>
            <Text style={styles.description}>{meetup.description.trim()}</Text>
          </View>
        ) : null}

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "transparent",
  },
  page: {
    gap: spacing.lg,
    paddingTop: 0,
    paddingBottom: 8,
  },
  managePage: {
    gap: spacing.lg,
  },
  detailLead: {
    gap: spacing.xs,
    paddingTop: 2,
    paddingLeft: 0,
  },
  manageLead: {
    gap: spacing.xs,
    paddingTop: 2,
    paddingLeft: 0,
  },
  headerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  eyebrow: {
    color: palette.ember,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  detailTitle: {
    color: palette.sand,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
  },
  manageTitle: {
    color: palette.sand,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
  },
  manageSupport: {
    color: palette.pine,
    fontSize: 12,
    lineHeight: 17,
  },
  detailMeta: {
    color: palette.mist,
    fontSize: 15,
    lineHeight: 20,
  },
  detailMetaOverdue: {
    color: "#F1B0B5",
  },
  detailAddress: {
    color: palette.sand,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
  detailSecondary: {
    color: palette.pine,
    fontSize: 12,
    lineHeight: 16,
  },
  actionSection: {
    gap: spacing.sm,
  },
  noteBlock: {
    gap: 6,
    paddingLeft: 0,
  },
  noteLabel: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  description: {
    color: palette.mist,
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
  },
  actionPrimaryCell: {
    flex: 1.2,
    minWidth: 0,
  },
  actionSecondaryCell: {
    flex: 0.9,
    minWidth: 0,
  },
  actionCluster: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  circleActionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4,
  },
  circleActionButtonGlass: {
    backgroundColor: "rgba(255,255,255,0.015)",
    borderColor: "rgba(231,216,188,0.08)",
  },
  /** Solid `palette.ember` — matches Games sheet “Jogos” tab; avoids muddy glass + tint on first paint. */
  circleActionButtonEmber: {
    backgroundColor: palette.ember,
    borderColor: "rgba(17,17,17,0.12)",
  },
  /** Entrar — verde claro (#2BC250), bom contraste no fundo escuro. */
  circleActionButtonJoin: {
    backgroundColor: JOIN_GREEN,
    borderColor: "rgba(17,17,17,0.14)",
  },
  /** Sair — melancia sólida (mesma família de danger do app). */
  circleActionButtonWatermelon: {
    backgroundColor: palette.watermelon,
    borderColor: "rgba(17,17,17,0.14)",
  },
  circleActionButtonDisabled: {
    opacity: 0.48,
  },
  circleActionButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  destructiveRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
  },
  destructiveRowCell: {
    flex: 1,
    minWidth: 0,
  },
  destructiveMiniButton: {
    minHeight: 46,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  watermelonOutlineButton: {
    backgroundColor: "rgba(225, 77, 92, 0.22)",
    borderWidth: 1,
    borderColor: WATERMELON_RED,
  },
  watermelonOutlineLabel: {
    color: WATERMELON_RED,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  watermelonSolidButton: {
    backgroundColor: WATERMELON_RED,
    borderWidth: 1,
    borderColor: WATERMELON_RED,
  },
  watermelonSolidLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  destructiveDisabled: {
    opacity: 0.55,
  },
  inlinePressed: {
    opacity: 0.84,
  },
});
