import { useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppleListGroup, AppleListRow } from "@/components/AppleListNavigation";
import { ChoiceChip } from "@/components/ChoiceChip";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { TextField } from "@/components/TextField";
import { AddressAutocompleteField } from "@/features/map/components/AddressAutocompleteField";
import { MetaTag } from "@/features/map/components/MapSheetPrimitives";
import { formatVenueKind } from "@/lib/formatting";
import { palette, sheetContentGutter, spacing } from "@/theme/tokens";
import type { AddressSuggestion } from "@/lib/placeSearch";
import type { VenueCard, VenueKind } from "@/types/domain";

type VenueGameOption = {
  id: string;
  label: string;
};

type VenueSheetCardProps = {
  venue: VenueCard;
  canManage: boolean;
  selected: boolean;
  distanceLabel: string | null;
  venueGameLabels: string[];
  locationLabel: string;
  infoOpen: boolean;
  manageOpen: boolean;
  updatingVenue: boolean;
  deletingVenue: boolean;
  manageVenueName: string;
  manageVenueNeighborhood: string;
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
  onToggleManage: () => void;
  onToggleInfo: () => void;
  onManageVenueNameChange: (value: string) => void;
  onManageVenueNeighborhoodChange: (value: string) => void;
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
  venue,
  canManage,
  selected,
  distanceLabel,
  venueGameLabels,
  locationLabel,
  infoOpen,
  manageOpen,
  updatingVenue,
  deletingVenue,
  manageVenueName,
  manageVenueNeighborhood,
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
  onToggleInfo,
  onManageVenueNameChange,
  onManageVenueNeighborhoodChange,
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
  const [cardWidth, setCardWidth] = useState(0);
  const ownerLine = `${venue.ownerDisplayName}${distanceLabel ? ` · ${distanceLabel}` : ""}`;

  const routes = useMemo(() => {
    const items: {
      key: string;
      title?: string;
      subtitle?: string;
      content: ReactNode;
    }[] = [
      {
        key: "root",
        content: (
          <View style={styles.page}>
            <Pressable onPress={onFocusVenueOnMap} style={({ pressed }) => [pressed ? styles.inlinePressed : null]}>
              <View style={styles.lead}>
                <Text style={styles.eyebrow}>{formatVenueKind(venue.kind)}</Text>
                <Text style={styles.title}>{venue.name}</Text>
                <Text style={styles.meta}>{venue.neighborhood}</Text>
                {venueGameLabels.length ? (
                  <View style={styles.inlineTagRow}>
                    {venueGameLabels.map((label) => (
                      <MetaTag key={`${venue.id}-${label}`} label={label} />
                    ))}
                  </View>
                ) : null}
                <Text style={styles.address}>{locationLabel}</Text>
                <Text style={styles.secondary}>{ownerLine}</Text>
              </View>
            </Pressable>

            <View style={styles.actionRow}>
              <View style={styles.actionSecondaryCell}>
                <PrimaryButton label="Mapa" onPress={onFocusVenueOnMap} tone="ghost" />
              </View>
              <View style={styles.actionPrimaryCell}>
                <PrimaryButton label="Criar jogo" onPress={onCreateMeetupAtVenue} />
              </View>
            </View>

            <View style={styles.secondaryActionStack}>
              <PrimaryButton label="Informações" onPress={onToggleInfo} tone="ghost" />
              {canManage ? (
                <PrimaryButton label="Editar local" onPress={onToggleManage} tone="ghost" />
              ) : null}
            </View>
          </View>
        ),
      },
    ];

    if (infoOpen) {
      items.push({
        key: "info",
        content: (
          <View style={styles.page}>
            <View style={styles.leadCompact}>
              <Text style={styles.eyebrow}>Local</Text>
              <Text style={styles.titleCompact}>{venue.name}</Text>
              <Text style={styles.supportText}>Endereço, tipo e jogos mais associados.</Text>
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

            {venue.details ? (
              <View style={styles.noteBlock}>
                <Text style={styles.noteLabel}>Detalhes</Text>
                <Text style={styles.bodyText}>{venue.details}</Text>
              </View>
            ) : null}
          </View>
        ),
      });
    }

    if (manageOpen) {
      items.push({
        key: "manage",
        content: (
          <View style={styles.page}>
            <View style={styles.leadCompact}>
              <Text style={styles.eyebrow}>Editar local</Text>
              <Text style={styles.titleCompact}>{venue.name}</Text>
              <Text style={styles.supportText}>Atualize nome, endereço e categorias do local.</Text>
            </View>

            <View style={styles.formBlock}>
              <TextField
                label="Nome do local"
                value={manageVenueName}
                onChangeText={onManageVenueNameChange}
                placeholder="Ex.: Loja da Galera"
              />
              <TextField
                label="Bairro"
                value={manageVenueNeighborhood}
                onChangeText={onManageVenueNeighborhoodChange}
                placeholder="Ex.: Pinheiros"
              />
              <AddressAutocompleteField
                label="Endereço"
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
              <View style={styles.chipWrap}>
                {venueGameOptions.map((game) => (
                  <ChoiceChip
                    key={`manage-venue-game-${game.id}`}
                    label={game.label}
                    selected={manageVenueGameIds.includes(game.id)}
                    onPress={() => onToggleManageVenueGame(game.id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.actionBlock}>
              <PrimaryButton
                label="Salvar alterações"
                onPress={onSaveVenueEdits}
                loading={updatingVenue}
              />
            </View>

            <View style={styles.block}>
              <Text style={styles.blockLabel}>Remoção</Text>
              <PrimaryButton
                label="Excluir local"
                onPress={onPromptDeleteVenue}
                tone="dangerGhost"
                loading={deletingVenue}
              />
            </View>
          </View>
        ),
      });
    }

    return items;
  }, [
    canManage,
    deletingVenue,
    infoOpen,
    locationLabel,
    manageOpen,
    manageVenueAddressFocused,
    manageVenueAddressLoading,
    manageVenueAddressQuery,
    manageVenueAddressSuggestions,
    manageVenueDetails,
    manageVenueGameIds,
    manageVenueKind,
    manageVenueName,
    manageVenueNeighborhood,
    onCreateMeetupAtVenue,
    onFocusVenueOnMap,
    onManageVenueAddressChange,
    onManageVenueAddressFocusChange,
    onManageVenueAddressSelect,
    onManageVenueAddressUseCurrentLocation,
    onManageVenueAddressUseTyped,
    onManageVenueDetailsChange,
    onManageVenueNameChange,
    onManageVenueNeighborhoodChange,
    onPromptDeleteVenue,
    onSaveVenueEdits,
    onSelectManageVenueKind,
    onToggleInfo,
    onToggleManage,
    onToggleManageVenueGame,
    ownerLine,
    updatingVenue,
    venue,
    venueGameLabels,
    venueGameOptions,
    venueKindOptions,
  ]);

  return (
    <View
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (Math.abs(nextWidth - cardWidth) > 1) {
          setCardWidth(nextWidth);
        }
      }}
      style={[styles.listCard, selected ? styles.listCardSelected : null]}
    >
      <SlidingSheetStack
        routes={routes}
        onPop={() => {
          if (manageOpen) {
            onToggleManage();
            return;
          }

          if (infoOpen) {
            onToggleInfo();
          }
        }}
        sceneWidth={cardWidth || undefined}
        scenePaddingHorizontal={sheetContentGutter}
        fillHeight={false}
        headerVariant="compact"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listCard: {
    backgroundColor: "transparent",
    overflow: "hidden",
    marginHorizontal: -sheetContentGutter,
  },
  listCardSelected: {
    backgroundColor: "rgba(241,143,92,0.06)",
  },
  page: {
    paddingTop: 2,
    paddingBottom: 16,
    gap: spacing.lg,
  },
  lead: {
    gap: 4,
  },
  leadCompact: {
    gap: 4,
    paddingTop: 2,
    paddingLeft: 0,
  },
  eyebrow: {
    color: palette.ember,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  title: {
    color: palette.sand,
    fontSize: 24,
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
  meta: {
    color: palette.pine,
    fontSize: 13,
    lineHeight: 17,
  },
  address: {
    color: palette.sand,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
  secondary: {
    color: palette.pine,
    fontSize: 12,
    lineHeight: 16,
  },
  bodyText: {
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
  actionBlock: {
    gap: spacing.sm,
  },
  blockLabel: {
    color: palette.parchment,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
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
  inlineTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingTop: 2,
  },
  actionRow: {
    flexDirection: "row",
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
  secondaryActionStack: {
    gap: 10,
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
