import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import { AppIcon } from "@/components/AppIcon";
import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { Avatar } from "@/components/Avatar";
import { ChoiceChip } from "@/components/ChoiceChip";
import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { MapInlineNotice } from "@/features/map/components/MapFeedbackPrimitives";
import { FormatDetailTagBlock, toggleMultiValue } from "@/features/map/components/FormatDetailTagBlock";
import { AvailabilityMatrix } from "@/features/profile/AvailabilityMatrix";
import {
  detailTagsSatisfiedForFormat,
  getFormatDetailKind,
  pruneFormatDetailTagsForFormat,
  type FormatDetailTags,
} from "@/lib/formatDetailTags";
import { summarizeAvailabilityPeriods } from "@/lib/formatting";
import {
  getCatalogFormats,
  getCatalogGames,
  getMyProfile,
  saveMyProfile,
  signOut,
  uploadMyAvatar,
} from "@/lib/api";
import { trackProductEvent } from "@/lib/productAnalytics";
import { isUserPro } from "@/lib/proPlayer";
import { palette, radius, spacing } from "@/theme/tokens";
import type {
  AvailabilitySlot,
  CatalogFormat,
  CatalogGame,
  PlayerProfile,
} from "@/types/domain";

type ProfileSetupScreenProps = {
  profile: PlayerProfile | null;
  /** E-mail da conta (auth); só nesta tela, não vai para o perfil público. */
  accountEmail: string | null;
  games: CatalogGame[];
  formats: CatalogFormat[];
  canCancel?: boolean;
  onCancel?: () => void;
  /** Perfil recém-lido do servidor após salvar (permite sair da tela com segurança). */
  onSaved: (profileAfterSave: PlayerProfile | null) => Promise<void>;
};

export function ProfileSetupScreen({
  profile,
  accountEmail,
  games,
  formats,
  canCancel = false,
  onCancel,
  onSaved,
}: ProfileSetupScreenProps) {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [handle, setHandle] = useState(profile?.handle ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [neighborhood, setNeighborhood] = useState(profile?.neighborhood ?? "");
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>(
    deriveSelectedGameIds(profile, formats)
  );
  const [canHost, setCanHost] = useState(profile?.canHost ?? false);
  const [selectedFormatIds, setSelectedFormatIds] = useState<string[]>(
    profile?.formatIds ?? []
  );
  const [formatPreferenceDetails, setFormatPreferenceDetails] = useState<
    Record<string, FormatDetailTags>
  >(() => profile?.formatPreferenceDetails ?? {});
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(profile?.availability ?? []);
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [pendingAvatarMimeType, setPendingAvatarMimeType] = useState<string | null>(null);
  const [pendingAvatarBase64, setPendingAvatarBase64] = useState<string | null>(null);
  const [savedAvatarUrl, setSavedAvatarUrl] = useState(profile?.avatarUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Catálogo efetivo: props do app ou carregado aqui se o bundle veio vazio. */
  const [catalogGames, setCatalogGames] = useState<CatalogGame[]>(games);
  const [catalogFormats, setCatalogFormats] = useState<CatalogFormat[]>(formats);
  const [catalogState, setCatalogState] = useState<"ready" | "loading" | "error">(() =>
    games.length > 0 ? "ready" : "loading"
  );
  const avatarPreviewUri = pendingAvatarUri ?? savedAvatarUrl ?? profile?.avatarUrl ?? null;
  const availabilityPreview = summarizeAvailabilityPeriods(availability);
  const selectedGames = catalogGames.filter((game) => selectedGameIds.includes(game.id));
  const heroInterestsSummary = summarizeInterestsForHero(
    selectedGames,
    catalogFormats,
    selectedFormatIds
  );
  const firstProfileCompletion = !profile;

  const displayNamePlaceholder = useMemo(
    () => displayNameExampleFromEmail(accountEmail),
    [accountEmail]
  );
  const handlePlaceholder = useMemo(() => handleExampleFromEmail(accountEmail), [accountEmail]);

  const loadCatalog = useCallback(async () => {
    setCatalogState("loading");
    try {
      const [nextGames, nextFormats] = await Promise.all([
        getCatalogGames(),
        getCatalogFormats(),
      ]);
      setCatalogGames(nextGames);
      setCatalogFormats(nextFormats);
      setCatalogState(nextGames.length > 0 ? "ready" : "error");
    } catch {
      setCatalogState("error");
    }
  }, []);

  useEffect(() => {
    setSavedAvatarUrl(profile?.avatarUrl ?? null);
  }, [profile?.avatarUrl]);

  useEffect(() => {
    if (games.length > 0) {
      setCatalogGames(games);
      setCatalogFormats(formats);
      setCatalogState("ready");
    }
  }, [games, formats]);

  useEffect(() => {
    if (profile?.formatPreferenceDetails) {
      setFormatPreferenceDetails(profile.formatPreferenceDetails);
    }
  }, [profile?.formatPreferenceDetails, profile?.userId]);

  useEffect(() => {
    if (games.length > 0) {
      return;
    }
    void loadCatalog();
  }, [games.length, loadCatalog]);

  useEffect(() => {
    if (!catalogFormats.length) {
      return;
    }
    setSelectedGameIds((prev) => {
      const derived = deriveSelectedGameIds(profile, catalogFormats);
      if (derived.length > 0 && prev.length === 0) {
        return derived;
      }
      return prev;
    });
  }, [profile, catalogFormats]);

  async function handlePickAvatar() {
    try {
      setError(null);

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        throw new Error("Permita o acesso a Fotos para escolher sua imagem de perfil.");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const processedAvatar = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1024 } }],
        {
          base64: true,
          compress: 0.82,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      setPendingAvatarUri(processedAvatar.uri);
      setPendingAvatarMimeType("image/jpeg");
      setPendingAvatarBase64(processedAvatar.base64 ?? null);
    } catch (pickerError) {
      setError(toMessage(pickerError));
    }
  }

  async function handleSave() {
    try {
      setLoading(true);
      setError(null);

      for (const formatId of selectedFormatIds) {
        const formatRow = catalogFormats.find((item) => item.id === formatId);
        const gameRow = formatRow
          ? catalogGames.find((item) => item.id === formatRow.gameId)
          : undefined;
        if (
          formatRow &&
          gameRow &&
          !detailTagsSatisfiedForFormat(
            gameRow.slug,
            formatRow.slug,
            formatPreferenceDetails[formatId] ?? {},
            formatRow.name
          )
        ) {
          throw new Error(
            "Para Magic, Yu-Gi-Oh! e Pokémon, marque pelo menos uma opção em bracket, tipo de partida, power level ou nível de baralho em cada formato selecionado."
          );
        }
      }

      await saveMyProfile({
        handle: handle.trim() || profile?.handle || "",
        displayName: displayName.trim() || profile?.displayName || "",
        bio,
        neighborhood,
        canHost,
        searchRadiusKm: profile?.searchRadiusKm ?? 10,
        lat: profile?.lat ?? null,
        lng: profile?.lng ?? null,
        gameIds: selectedGameIds,
        formatIds: selectedFormatIds,
        formatDetails: formatPreferenceDetails,
        availability,
      });

      if (pendingAvatarUri) {
        const avatarUpload = await uploadMyAvatar({
          imageUri: pendingAvatarUri,
          mimeType: pendingAvatarMimeType,
          base64: pendingAvatarBase64,
        });
        setSavedAvatarUrl(avatarUpload.avatarUrl);
        setPendingAvatarUri(null);
        setPendingAvatarMimeType(null);
        setPendingAvatarBase64(null);
      }

      const refreshed = await getMyProfile();
      if (!refreshed) {
        setError(
          "Seus dados foram salvos, mas não foi possível confirmar o perfil. Verifique a conexão e toque em salvar de novo."
        );
      }

      await trackProductEvent({
        eventName: "profile_completed",
        eventCategory: "onboarding",
        oncePerUser: true,
        region: inputValueOrNull(neighborhood),
        context: {
          selected_games_count: selectedGameIds.length,
          selected_formats_count: selectedFormatIds.length,
          availability_slots_count: availability.length,
          can_host: canHost,
        },
      });

      if (firstProfileCompletion) {
        await trackProductEvent({
          eventName: "onboarding_completed",
          eventCategory: "onboarding",
          oncePerUser: true,
          region: inputValueOrNull(neighborhood),
          context: {
            selected_games_count: selectedGameIds.length,
            selected_formats_count: selectedFormatIds.length,
          },
        });
      }

      await trackProductEvent({
        eventName: "first_meaningful_action_completed",
        eventCategory: "engagement",
        oncePerUser: true,
        region: inputValueOrNull(neighborhood),
        context: {
          trigger_event: firstProfileCompletion ? "onboarding_completed" : "profile_completed",
        },
      });

      await onSaved(refreshed);
    } catch (saveError) {
      setError(toMessage(saveError));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (signOutError) {
      setError(toMessage(signOutError));
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardOffset={124}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pageIntro}>
          <Text style={styles.title}>Vamos preparar como você aparece no Good Game</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.identityHero}>
            <View style={styles.identityHeroRow}>
              <View style={styles.avatarBlock}>
                <Avatar
                  name={displayName || handle || "Good Game"}
                  uri={avatarPreviewUri}
                  size={PROFILE_PHOTO_SIZE}
                  isPro={isUserPro(profile)}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Trocar foto do perfil"
                  onPress={() => void handlePickAvatar()}
                  style={({ pressed }) => [
                    styles.photoActionButton,
                    pressed ? styles.photoActionButtonPressed : null,
                  ]}
                >
                  <AppleGlassSurface
                    pointerEvents="none"
                    variant="accent"
                    intensity="clear"
                    style={styles.photoActionButtonSurface}
                  />
                  <AppIcon
                    iosName="camera.fill"
                    fallbackName="photo-camera"
                    size={12}
                    color={palette.ink}
                  />
                  <Text style={styles.photoActionLabel} numberOfLines={1}>
                    Trocar foto
                  </Text>
                </Pressable>
              </View>
              <View style={styles.heroNameColumn}>
                <Text
                  style={styles.heroDisplayName}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.42}
                >
                  {displayName || "Seu nome"}
                </Text>
                <Text
                  style={styles.heroHandleText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.55}
                >
                  @{handle || "seuhandle"}
                </Text>
                <View style={styles.heroEmailBlock}>
                  <Text style={styles.heroEmailLabel}>E-mail da conta</Text>
                  <Text
                    style={styles.heroEmailValue}
                    numberOfLines={2}
                    selectable
                  >
                    {accountEmail ?? "—"}
                  </Text>
                </View>
                {heroInterestsSummary ? (
                  <Text style={styles.heroInterestsText}>{heroInterestsSummary}</Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações públicas</Text>
          <View style={styles.fieldStack}>
            <TextField
              label="Nome de exibição"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={displayNamePlaceholder}
              density="compact"
            />
            <TextField
              label="Handle"
              value={handle}
              onChangeText={setHandle}
              placeholder={handlePlaceholder}
              autoCapitalize="none"
              density="compact"
            />
            <TextField
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Fale sobre formatos, power level e estilo de jogo"
              multiline
              density="compact"
            />
            <TextField
              label="Bairro"
              value={neighborhood}
              onChangeText={setNeighborhood}
              placeholder="Ex.: Pinheiros"
              density="compact"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interesses</Text>
          <Text style={styles.helpText}>
            Escolha os tipos de jogo que você curte. Os formatos aparecem só depois que
            o jogo correspondente estiver selecionado.
          </Text>
          {catalogState === "loading" && catalogGames.length === 0 ? (
            <View style={styles.catalogLoadingRow}>
              <LoadingSpinner size={20} />
              <Text style={styles.helpText}>Carregando jogos e formatos…</Text>
            </View>
          ) : null}
          {catalogState === "error" && catalogGames.length === 0 ? (
            <View style={styles.catalogErrorBlock}>
              <MapInlineNotice
                tone="error"
                message="Não foi possível carregar o catálogo. Verifique a conexão."
              />
              <PrimaryButton label="Tentar de novo" onPress={() => void loadCatalog()} tone="ghost" />
            </View>
          ) : null}
          <View style={styles.chips}>
            {catalogGames.map((game) => {
              const selected = selectedGameIds.includes(game.id);

              return (
                <ChoiceChip
                  key={game.id}
                  label={game.name}
                  selected={selected}
                  onPress={() =>
                    setSelectedGameIds((current) => {
                      if (current.includes(game.id)) {
                        const nextGameIds = current.filter((item) => item !== game.id);
                        const removedFormatIds = catalogFormats
                          .filter((format) => format.gameId === game.id)
                          .map((format) => format.id);
                        const allowedFormatIds = catalogFormats
                          .filter((format) => nextGameIds.includes(format.gameId))
                          .map((format) => format.id);

                        setSelectedFormatIds((currentFormatIds) =>
                          currentFormatIds.filter((formatId) => allowedFormatIds.includes(formatId))
                        );
                        setFormatPreferenceDetails((prev) => {
                          const next = { ...prev };
                          for (const id of removedFormatIds) {
                            delete next[id];
                          }
                          return next;
                        });

                        return nextGameIds;
                      }

                      return [...current, game.id];
                    })
                  }
                />
              );
            })}
          </View>

          {selectedGames.map((game) => {
            const gameFormats = catalogFormats.filter((format) => format.gameId === game.id);

            if (!gameFormats.length) {
              return null;
            }

            return (
              <View key={game.id} style={styles.gameFormatGroup}>
                <Text style={styles.gameFormatTitle}>Formatos de {game.name}</Text>
                <View style={styles.chips}>
                  {gameFormats.map((format) => (
                    <ChoiceChip
                      key={format.id}
                      label={format.name}
                      selected={selectedFormatIds.includes(format.id)}
                      onPress={() =>
                        setSelectedFormatIds((current) => {
                          if (current.includes(format.id)) {
                            setFormatPreferenceDetails((prev) => {
                              const next = { ...prev };
                              delete next[format.id];
                              return next;
                            });
                            return current.filter((item) => item !== format.id);
                          }
                          return [...current, format.id];
                        })
                      }
                    />
                  ))}
                </View>
                {gameFormats
                  .filter((format) => selectedFormatIds.includes(format.id))
                  .map((format) => {
                    const kind = getFormatDetailKind(game.slug, format.slug, format.name);
                    if (!kind) {
                      return null;
                    }

                    const stored = formatPreferenceDetails[format.id] ?? {};
                    const selectedDetailValues =
                      kind === "magic_commander"
                        ? stored.magic_brackets ?? []
                        : kind === "magic_match"
                          ? stored.magic_match_types ?? []
                          : kind === "yugioh"
                            ? stored.yugioh_power_levels ?? []
                            : stored.pokemon_deck_tiers ?? [];

                    return (
                      <View key={`${format.id}-detail`} style={styles.formatDetailBlock}>
                        <Text style={styles.formatDetailHeading}>{format.name}</Text>
                        <FormatDetailTagBlock
                          kind={kind}
                          selected={selectedDetailValues}
                          onToggle={(value) => {
                            setFormatPreferenceDetails((prev) => {
                              const base = prev[format.id] ?? {};
                              const key =
                                kind === "magic_commander"
                                  ? "magic_brackets"
                                  : kind === "magic_match"
                                    ? "magic_match_types"
                                    : kind === "yugioh"
                                      ? "yugioh_power_levels"
                                      : "pokemon_deck_tiers";
                              const cur = (base[key] as string[] | undefined) ?? [];
                              const merged = {
                                ...base,
                                [key]: toggleMultiValue(cur, value),
                              };
                              return {
                                ...prev,
                                [format.id]: pruneFormatDetailTagsForFormat(
                                  game.slug,
                                  format.slug,
                                  merged,
                                  format.name
                                ),
                              };
                            });
                          }}
                        />
                      </View>
                    );
                  })}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferências de encontro</Text>
          <View style={styles.switchBlock}>
            <View style={styles.switchCopy}>
              <Text style={styles.switchTitle}>Pode receber pessoas?</Text>
              <Text style={styles.helpText}>
                Isso aparece no seu perfil e ajuda a indicar se você topa hospedar partidas.
              </Text>
            </View>
            <View style={styles.hostToggleRow}>
              <Text style={styles.hostStateLabel}>
                {canHost ? "Sim, posso receber" : "Não, prefiro local externo"}
              </Text>
              <Switch
                value={canHost}
                onValueChange={setCanHost}
                thumbColor={canHost ? palette.ember : palette.parchment}
                trackColor={{ true: "rgba(241,143,92,0.35)", false: palette.line }}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disponibilidade</Text>
          <Text style={styles.helpText}>
            Marque os dias e períodos em que você costuma topar jogar. Isso ajuda
            outras pessoas a chamarem você no momento certo.
          </Text>
          <AvailabilityMatrix value={availability} onChange={setAvailability} />
          <View style={styles.selectionWrap}>
            {availabilityPreview.length ? (
              availabilityPreview.map((label) => <IdentityChip key={label} label={label} />)
            ) : (
              <Text style={styles.helpText}>Nenhum período selecionado ainda.</Text>
            )}
          </View>
        </View>

        {error ? <MapInlineNotice tone="error" message={error} /> : null}

        <View style={styles.footerActions}>
          <View style={styles.footerPrimaryRow}>
            {canCancel && onCancel ? (
              <View style={styles.footerSecondaryAction}>
                <PrimaryButton label="Cancelar" onPress={onCancel} tone="ghost" />
              </View>
            ) : null}
            <View style={styles.footerPrimaryAction}>
              <PrimaryButton label="Salvar perfil" onPress={handleSave} loading={loading} />
            </View>
          </View>
          <PrimaryButton label="Desconectar" onPress={handleSignOut} tone="ghost" />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function inputValueOrNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toMessage(error: unknown) {
  const raw = extractErrorText(error);
  if (!raw) {
    return "Não foi possível salvar o perfil. Tente de novo.";
  }

  const lower = raw.toLowerCase();
  if (
    lower.includes("duplicate key") ||
    lower.includes("profiles_handle") ||
    lower.includes("unique constraint") ||
    lower.includes("idx_profiles_handle") ||
    (lower.includes("handle") && lower.includes("unique"))
  ) {
    return "Esse @handle já está em uso. Escolha outro identificador.";
  }

  return raw;
}

/** PostgREST/Supabase muitas vezes devolvem `{ message, details, code }` sem ser `instanceof Error`. */
function extractErrorText(error: unknown): string | null {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) {
      return msg.trim();
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return null;
}

function summarizeInterestsForHero(
  selectedGames: CatalogGame[],
  allFormats: CatalogFormat[],
  selectedFormatIds: string[]
): string {
  if (!selectedGames.length) {
    return "";
  }

  return selectedGames
    .map((game) => {
      const formatNames = allFormats
        .filter((format) => format.gameId === game.id && selectedFormatIds.includes(format.id))
        .map((format) => format.name);

      if (!formatNames.length) {
        return game.name;
      }

      return `${game.name} (${formatNames.join(", ")})`;
    })
    .join(" · ");
}

/** Matches `Avatar` size so the change-photo control aligns to the same width. */
const PROFILE_PHOTO_SIZE = 96;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.sheetBaseChrome,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xl,
  },
  pageIntro: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  fieldStack: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  title: {
    color: palette.sand,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    letterSpacing: -0.35,
  },
  sectionTitle: {
    color: palette.sand,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
  },
  identityHero: {
    gap: spacing.md,
  },
  identityHeroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  avatarBlock: {
    alignItems: "flex-start",
    width: PROFILE_PHOTO_SIZE,
    gap: spacing.sm,
  },
  heroNameColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-start",
    gap: 4,
  },
  heroDisplayName: {
    color: palette.sand,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.35,
    alignSelf: "stretch",
  },
  heroHandleText: {
    color: palette.pine,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.15,
    alignSelf: "stretch",
  },
  heroEmailBlock: {
    alignSelf: "stretch",
    gap: 4,
    marginTop: spacing.xs,
  },
  heroEmailLabel: {
    color: palette.pine,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroEmailValue: {
    color: palette.mist,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  heroInterestsText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    letterSpacing: -0.1,
    alignSelf: "stretch",
  },
  helpText: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 20,
  },
  photoActionButton: {
    width: PROFILE_PHOTO_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minHeight: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(241,143,92,0.35)",
    overflow: "hidden",
  },
  photoActionButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  photoActionButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  photoActionLabel: {
    color: palette.ink,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  identityChip: {
    paddingVertical: 2,
  },
  identityChipLabel: {
    color: palette.parchment,
    fontSize: 13,
    fontWeight: "700",
  },
  switchBlock: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  switchCopy: {
    gap: 4,
  },
  switchTitle: {
    color: palette.sand,
    fontSize: 16,
    fontWeight: "700",
  },
  hostToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  hostStateLabel: {
    flex: 1,
    color: palette.parchment,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  catalogLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  catalogErrorBlock: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  gameFormatGroup: {
    gap: spacing.sm,
  },
  gameFormatTitle: {
    color: palette.pine,
    fontSize: 13,
    fontWeight: "700",
  },
  formatDetailBlock: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  formatDetailHeading: {
    color: palette.sand,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  selectionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  footerActions: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  footerPrimaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  footerPrimaryAction: {
    flex: 1,
  },
  footerSecondaryAction: {
    minWidth: 128,
  },
});

function IdentityChip({ label }: { label: string }) {
  return (
    <View style={styles.identityChip}>
      <Text style={styles.identityChipLabel}>{label}</Text>
    </View>
  );
}

/** Placeholder do nome a partir da parte local do e-mail (ex.: ana.silva@ → "Ex.: Ana Silva"). */
function displayNameExampleFromEmail(email: string | null): string {
  if (!email?.includes("@")) {
    return "Ex.: o mesmo estilo do seu nome no e-mail";
  }

  const local = email.split("@")[0]?.trim() ?? "";
  if (!local) {
    return "Ex.: o mesmo estilo do seu nome no e-mail";
  }

  const segments = local
    .split(/[._-]+/)
    .map((segment) => segment.replace(/[^a-zA-ZÀ-ÿ0-9]/g, ""))
    .filter((segment) => segment.length > 0 && /[a-zA-ZÀ-ÿ]/.test(segment));

  if (!segments.length) {
    return "Ex.: o mesmo estilo do seu nome no e-mail";
  }

  const titled = segments.slice(0, 3).map((word) => {
    const lower = word.toLowerCase();

    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });

  return `Ex.: ${titled.join(" ")}`;
}

/** Placeholder do handle a partir do e-mail (ex.: ana.silva@ → "Ex.: anasilva"). */
function handleExampleFromEmail(email: string | null): string {
  if (!email?.includes("@")) {
    return "Ex.: um identificador curto, estilo e-mail";
  }

  const local = email.split("@")[0]?.trim().toLowerCase() ?? "";
  const compact = local.replace(/[^a-z0-9]/g, "");

  if (compact.length >= 3) {
    return `Ex.: ${compact.slice(0, 24)}`;
  }

  return "Ex.: combine com seu e-mail, sem espaços";
}

function deriveSelectedGameIds(
  profile: PlayerProfile | null,
  formats: CatalogFormat[]
) {
  if (profile?.gameIds?.length) {
    return profile.gameIds;
  }

  const formatGameIds = formats
    .filter((format) => profile?.formatIds?.includes(format.id))
    .map((format) => format.gameId);

  return Array.from(new Set(formatGameIds));
}
