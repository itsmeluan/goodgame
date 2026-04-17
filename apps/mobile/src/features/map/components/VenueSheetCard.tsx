import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleListGroup, AppleListRow } from "@/components/AppleListNavigation";
import { AppIcon } from "@/components/AppIcon";
import { ChoiceChip } from "@/components/ChoiceChip";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { AddressAutocompleteField } from "@/features/map/components/AddressAutocompleteField";
import { formatVenueKind } from "@/lib/formatting";
import { triggerHaptic } from "@/lib/haptics";
import { palette, spacing } from "@/theme/tokens";
import type { AddressSuggestion } from "@/lib/placeSearch";
import type { VenueCard, VenueKind } from "@/types/domain";

type VenueGameOption = {
  id: string;
  label: string;
};

type VenueSheetCardProps = {
  mode: "detail" | "manage";
  venue: VenueCard;
  canManage: boolean;
  selected: boolean;
  distanceLabel: string | null;
  venueGameLabels: string[];
  locationLabel: string;
  updatingVenue: boolean;
  deletingVenue: boolean;
  manageVenueName: string;
  manageVenueAddressQuery: string;
  manageVenueAddressFocused: boolean;
  manageVenueAddressSuggestions: AddressSuggestion[];
  manageVenueAddressLoading: boolean;
  manageVenueDetails: string;
  manageVenueKind: VenueKind;
  manageVenueGameIds: string[];
  venueKindOptions: readonly (readonly [VenueKind, string])[];
  venueGameOptions: VenueGameOption[];
  onFocusVenueOnMap: () => void;
  onCreateMeetupAtVenue: () => void;
  /** Detail only — abre a rota de edição na pilha do menu de jogos. */
  onToggleManage?: () => void;
  onManageVenueNameChange: (value: string) => void;
  onManageVenueAddressFocusChange: (focused: boolean) => void;
  onManageVenueAddressChange: (value: string) => void;
  onManageVenueAddressUseCurrentLocation: () => void;
  onManageVenueAddressUseTyped: () => void;
  onManageVenueAddressSelect: (suggestion: AddressSuggestion) => void;
  onManageVenueDetailsChange: (value: string) => void;
  onSelectManageVenueKind: (kind: VenueKind) => void;
  onToggleManageVenueGame: (gameId: string) => void;
  onSaveVenueEdits: () => void;
  onPromptDeleteVenue: () => void;
};

export function VenueSheetCard({
  mode,
  venue,
  canManage,
  selected,
  distanceLabel,
  venueGameLabels,
  locationLabel,
  updatingVenue,
  deletingVenue,
  manageVenueName,
  manageVenueAddressQuery,
  manageVenueAddressFocused,
  manageVenueAddressSuggestions,
  manageVenueAddressLoading,
  manageVenueDetails,
  manageVenueKind,
  manageVenueGameIds,
  venueKindOptions,
  venueGameOptions,
  onFocusVenueOnMap,
  onCreateMeetupAtVenue,
  onToggleManage,
  onManageVenueNameChange,
  onManageVenueAddressFocusChange,
  onManageVenueAddressChange,
  onManageVenueAddressUseCurrentLocation,
  onManageVenueAddressUseTyped,
  onManageVenueAddressSelect,
  onManageVenueDetailsChange,
  onSelectManageVenueKind,
  onToggleManageVenueGame,
  onSaveVenueEdits,
  onPromptDeleteVenue,
}: VenueSheetCardProps) {
  const ownerLine = `${venue.ownerDisplayName}${distanceLabel ? ` · ${distanceLabel}` : ""}`;
  const pageIntro = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    pageIntro.setValue(0);
    Animated.timing(pageIntro, {
      toValue: 1,
      duration: 220,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [mode, venue.id, pageIntro]);

  const pageMotionStyle = useMemo(
    () =>
      ({
        opacity: pageIntro,
        transform: [
          {
            translateY: pageIntro.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
      }) as const,
    [pageIntro]
  );

  if (mode === "manage") {
    return (
      <View style={[styles.listCard, selected ? styles.listCardSelected : null]}>
        <Animated.View style={[styles.page, pageMotionStyle]}>
          <View style={styles.leadCompact}>
            <Text style={styles.eyebrow}>Editar local</Text>
            <Text style={styles.titleCompact}>{venue.name}</Text>
            <Text style={styles.supportText}>Atualize nome, endereço e categorias do local.</Text>
          </View>

          <View style={styles.formBlock}>
            <TextField
              label="Nome do local"
              labelTone="light"
              value={manageVenueName}
              onChangeText={onManageVenueNameChange}
              placeholder="Ex.: Loja da Galera"
            />
            <AddressAutocompleteField
              label="Endereço"
              labelTone="light"
              value={manageVenueAddressQuery}
              focused={manageVenueAddressFocused}
              onFocusChange={onManageVenueAddressFocusChange}
              onChangeText={onManageVenueAddressChange}
              suggestions={manageVenueAddressSuggestions}
              loading={manageVenueAddressLoading}
              onUseCurrentLocation={onManageVenueAddressUseCurrentLocation}
              onUseTypedAddress={onManageVenueAddressUseTyped}
              onSelectSuggestion={onManageVenueAddressSelect}
              placeholder="Digite rua, avenida ou nome do lugar"
            />
            <TextField
              label="Detalhes"
              labelTone="light"
              value={manageVenueDetails}
              onChangeText={onManageVenueDetailsChange}
              placeholder="Partidas, horários, consumo mínimo"
              multiline
            />
          </View>

          <View style={styles.block}>
            <Text style={styles.blockLabel}>Tipo de local</Text>
            <View style={styles.chipWrap}>
              {venueKindOptions.map(([kind, label]) => (
                <ChoiceChip
                  key={`manage-venue-kind-${kind}`}
                  label={label}
                  selected={manageVenueKind === kind}
                  onPress={() => onSelectManageVenueKind(kind)}
                />
              ))}
            </View>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockLabel}>Jogos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScrollContent}
            >
              {venueGameOptions.map((game) => (
                <ChoiceChip
                  key={`manage-venue-game-${game.id}`}
                  label={game.label}
                  selected={manageVenueGameIds.includes(game.id)}
                  onPress={() => onToggleManageVenueGame(game.id)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.manageActionsRow}>
            <View style={styles.manageActionCell}>
              <PrimaryButton
                label="Excluir"
                tone="danger"
                onPress={onPromptDeleteVenue}
                loading={deletingVenue}
                disabled={updatingVenue}
                fullWidth
              />
            </View>
            <View style={styles.manageActionCell}>
              <PrimaryButton
                label="Salvar"
                onPress={onSaveVenueEdits}
                loading={updatingVenue}
                disabled={deletingVenue}
                fullWidth
              />
            </View>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.listCard, selected ? styles.listCardSelected : null]}>
      <Animated.View style={[styles.page, pageMotionStyle]}>
        <View style={styles.detailLead}>
          <View style={styles.headerMetaRow}>
            <Text style={styles.eyebrow}>{formatVenueKind(venue.kind)}</Text>
          </View>
          <Text style={styles.detailTitle}>{venue.name}</Text>
          {venue.neighborhood ? <Text style={styles.detailMeta}>{venue.neighborhood}</Text> : null}
          <Text style={styles.detailAddress}>{locationLabel}</Text>
          <Text style={styles.detailSecondary}>{ownerLine}</Text>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.actionCluster}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver no mapa"
              onPress={() => {
                triggerHaptic("selection");
                onFocusVenueOnMap();
              }}
              style={({ pressed }) => [
                styles.circleActionButton,
                styles.circleActionButtonGlass,
                pressed ? styles.circleActionButtonPressed : null,
              ]}
            >
              <AppIcon iosName="map.fill" fallbackName="map" size={20} color={palette.sand} />
            </Pressable>

            {canManage ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Editar local"
                onPress={() => {
                  triggerHaptic("selection");
                  onToggleManage?.();
                }}
                style={({ pressed }) => [
                  styles.circleActionButton,
                  styles.circleActionButtonGlass,
                  pressed ? styles.circleActionButtonPressed : null,
                ]}
              >
                <AppIcon iosName="slider.horizontal.3" fallbackName="tune" size={20} color={palette.sand} />
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Criar partida neste local"
              onPress={() => {
                triggerHaptic("soft");
                onCreateMeetupAtVenue();
              }}
              style={({ pressed }) => [
                styles.circleActionButton,
                styles.circleActionButtonEmber,
                pressed ? styles.circleActionButtonPressed : null,
              ]}
            >
              <AppIcon iosName="plus" fallbackName="add" size={22} color={palette.ink} type="monochrome" />
            </Pressable>
          </View>
        </View>

        <AppleListGroup>
          <AppleListRow
            icon={{ iosName: "mappin.and.ellipse", fallbackName: "location-on" }}
            label="Endereço"
            subtitle={locationLabel}
            showChevron={false}
            size="compact"
          />
          <AppleListRow
            separator
            icon={{ iosName: "figure.stand", fallbackName: "person" }}
            label="Indicado por"
            subtitle={ownerLine}
            showChevron={false}
            size="compact"
          />
          <AppleListRow
            separator
            icon={{ iosName: "storefront.fill", fallbackName: "storefront" }}
            label="Tipo de local"
            subtitle={formatVenueKind(venue.kind)}
            showChevron={false}
            size="compact"
          />
          <AppleListRow
            separator
            icon={{ iosName: "square.grid.2x2.fill", fallbackName: "grid-view" }}
            label="Jogos"
            subtitle={venueGameLabels.join(" · ") || "Comunidade"}
            showChevron={false}
            size="compact"
          />
        </AppleListGroup>

        {venue.details?.trim() ? (
          <View style={styles.noteBlock}>
            <Text style={styles.noteLabel}>Detalhes</Text>
            <Text style={styles.description}>{venue.details.trim()}</Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  listCard: {
    backgroundColor: "transparent",
    overflow: "hidden",
    alignSelf: "stretch",
  },
  listCardSelected: {
    backgroundColor: "rgba(241,143,92,0.06)",
  },
  page: {
    paddingTop: 2,
    paddingBottom: 16,
    gap: spacing.lg,
  },
  detailLead: {
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
  leadCompact: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingLeft: 0,
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
  titleCompact: {
    color: palette.sand,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "800",
  },
  supportText: {
    color: palette.pine,
    fontSize: 12,
    lineHeight: 17,
  },
  detailMeta: {
    color: palette.mist,
    fontSize: 15,
    lineHeight: 20,
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
  description: {
    color: palette.mist,
    fontSize: 13,
    lineHeight: 19,
  },
  block: {
    gap: spacing.sm,
  },
  formBlock: {
    gap: spacing.md,
  },
  chipScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  manageActionsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
  },
  manageActionCell: {
    flex: 1,
    minWidth: 0,
  },
  blockLabel: {
    color: palette.sand,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    letterSpacing: 0.1,
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
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
  circleActionButtonEmber: {
    backgroundColor: palette.ember,
    borderColor: "rgba(17,17,17,0.12)",
  },
  circleActionButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  inlinePressed: {
    opacity: 0.84,
  },
});
