import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import { AppIcon } from "@/components/AppIcon";
import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { Avatar } from "@/components/Avatar";
import { ChoiceChip } from "@/components/ChoiceChip";
import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { MapInlineNotice } from "@/features/map/components/MapFeedbackPrimitives";
import { AvailabilityMatrix } from "@/features/profile/AvailabilityMatrix";
import { summarizeAvailabilityPeriods } from "@/lib/formatting";
import { saveMyProfile, signOut, uploadMyAvatar } from "@/lib/api";
import { palette, radius, spacing } from "@/theme/tokens";
import type {
  AvailabilitySlot,
  CatalogFormat,
  CatalogGame,
  PlayerProfile,
} from "@/types/domain";

type ProfileSetupScreenProps = {
  profile: PlayerProfile | null;
  games: CatalogGame[];
  formats: CatalogFormat[];
  canCancel?: boolean;
  onCancel?: () => void;
  onSaved: () => Promise<void>;
};

export function ProfileSetupScreen({
  profile,
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
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(profile?.availability ?? []);
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [pendingAvatarMimeType, setPendingAvatarMimeType] = useState<string | null>(null);
  const [pendingAvatarBase64, setPendingAvatarBase64] = useState<string | null>(null);
  const [savedAvatarUrl, setSavedAvatarUrl] = useState(profile?.avatarUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarPreviewUri = pendingAvatarUri ?? savedAvatarUrl ?? profile?.avatarUrl ?? null;
  const availabilityPreview = summarizeAvailabilityPeriods(availability);
  const selectedGames = games.filter((game) => selectedGameIds.includes(game.id));
  const heroInterestsSummary = summarizeInterestsForHero(selectedGames, formats, selectedFormatIds);

  useEffect(() => {
    setSavedAvatarUrl(profile?.avatarUrl ?? null);
  }, [profile?.avatarUrl]);

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

      await onSaved();
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
              placeholder="Ex.: Luan Martins"
              density="compact"
            />
            <TextField
              label="Handle"
              value={handle}
              onChangeText={setHandle}
              placeholder="Ex.: luanstack"
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
          <View style={styles.chips}>
            {games.map((game) => {
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
                        const allowedFormatIds = formats
                          .filter((format) => nextGameIds.includes(format.gameId))
                          .map((format) => format.id);

                        setSelectedFormatIds((currentFormatIds) =>
                          currentFormatIds.filter((formatId) => allowedFormatIds.includes(formatId))
                        );

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
            const gameFormats = formats.filter((format) => format.gameId === game.id);

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
                        setSelectedFormatIds((current) =>
                          current.includes(format.id)
                            ? current.filter((item) => item !== format.id)
                            : [...current, format.id]
                        )
                      }
                    />
                  ))}
                </View>
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

function toMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível salvar o perfil.";
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
    backgroundColor: "rgba(7,12,18,0.98)",
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

function deriveSelectedGameIds(
  profile: PlayerProfile | null,
  formats: CatalogFormat[]
) {
  if (profile?.gameIds?.length) {
    return profile.gameIds;
  }

  const formatGameIds = formats
    .filter((format) => profile?.formatIds.includes(format.id))
    .map((format) => format.gameId);

  return Array.from(new Set(formatGameIds));
}
