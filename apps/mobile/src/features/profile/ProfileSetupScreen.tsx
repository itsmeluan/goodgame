import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import { AppIcon } from "@/components/AppIcon";
import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { Avatar } from "@/components/Avatar";
import { ChoiceChip } from "@/components/ChoiceChip";
import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import { TextField } from "@/components/TextField";
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
  const selectedGameNames = games
    .filter((game) => selectedGameIds.includes(game.id))
    .map((game) => game.name);
  const selectedGames = games.filter((game) => selectedGameIds.includes(game.id));

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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardOffset={124}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>Perfil inicial</Text>
        <Text style={styles.title}>Vamos preparar como você aparece no Good Game</Text>
        <Text style={styles.subtitle}>
          Ajuste sua identidade, interesses e disponibilidade para facilitar combinações
          com outros jogadores.
        </Text>

        <SectionCard>
          <View style={styles.profileHero}>
            <View style={styles.profileHeroMedia}>
              <Avatar
                name={displayName || handle || "Good Game"}
                uri={avatarPreviewUri}
                size={92}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => void handlePickAvatar()}
                style={({ pressed }) => [
                  styles.photoActionButton,
                  pressed ? styles.photoActionButtonPressed : null,
                ]}
              >
                <AppleGlassSurface
                  pointerEvents="none"
                  variant="dark"
                  intensity="clear"
                  style={styles.photoActionButtonSurface}
                />
                <AppIcon
                  iosName="camera.fill"
                  fallbackName="photo-camera"
                  size={16}
                  color={palette.ember}
                />
                <Text style={styles.photoActionLabel}>Trocar foto</Text>
              </Pressable>
            </View>
            <View style={styles.profileHeroCopy}>
              <Text style={styles.sectionTitle}>Sua identidade no app</Text>
              <Text style={styles.helpText}>
                A foto e o nome ajudam outros jogadores a reconhecer você nos grupos e no mapa.
              </Text>
              <View style={styles.previewPills}>
                <PreviewPill label={displayName || "Seu nome"} />
                <PreviewPill label={`@${handle || "seuhandle"}`} />
              </View>
            </View>
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={styles.sectionTitle}>Informações públicas</Text>
          <Text style={styles.helpText}>
            Esse é o perfil que outras pessoas veem quando tocam no seu avatar.
          </Text>
          <TextField
            label="Nome de exibicao"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Ex.: Luan Martins"
          />
          <TextField
            label="Handle"
            value={handle}
            onChangeText={setHandle}
            placeholder="Ex.: luanstack"
            autoCapitalize="none"
          />
          <TextField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Fale sobre formatos, power level e estilo de jogo"
            multiline
          />
          <TextField
            label="Bairro"
            value={neighborhood}
            onChangeText={setNeighborhood}
            placeholder="Ex.: Pinheiros"
          />
        </SectionCard>

        <SectionCard>
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
          <View style={styles.selectionWrap}>
            {selectedGameNames.length ? (
              selectedGameNames.map((gameName) => <PreviewPill key={gameName} label={gameName} />)
            ) : (
              <Text style={styles.helpText}>Você pode deixar sem interesses por enquanto.</Text>
            )}
          </View>

          {selectedGames.map((game) => {
            const gameFormats = formats.filter((format) => format.gameId === game.id);
            const gameSelectedFormatNames = gameFormats
              .filter((format) => selectedFormatIds.includes(format.id))
              .map((format) => format.name);

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
                <View style={styles.selectionWrap}>
                  {gameSelectedFormatNames.length ? (
                    gameSelectedFormatNames.map((formatName) => (
                      <PreviewPill key={`${game.id}-${formatName}`} label={formatName} />
                    ))
                  ) : (
                    <Text style={styles.helpText}>
                      Você pode deixar sem formato, ou detalhar se quiser.
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </SectionCard>

        <SectionCard>
          <Text style={styles.sectionTitle}>Preferências de encontro</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.switchTitle}>Pode receber pessoas?</Text>
              <Text style={styles.helpText}>
                Isso aparece no seu perfil e ajuda a indicar se você topa hospedar partidas.
              </Text>
            </View>
          <View style={styles.switchControlRow}>
            <AppleGlassSurface
              pointerEvents="none"
              variant="dark"
              intensity="clear"
              style={styles.switchControlSurface}
            />
            <Text style={styles.helpText}>
              {canHost ? "Sim, posso receber" : "Não, prefiro local externo"}
            </Text>
              <Switch
                value={canHost}
                onValueChange={setCanHost}
                thumbColor={canHost ? palette.ember : palette.parchment}
                trackColor={{ true: palette.moss, false: palette.line }}
              />
            </View>
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={styles.sectionTitle}>Disponibilidade</Text>
          <Text style={styles.helpText}>
            Marque os dias e períodos em que você costuma topar jogar. Isso ajuda
            outras pessoas a chamarem você no momento certo.
          </Text>
          <AvailabilityMatrix value={availability} onChange={setAvailability} />
          <View style={styles.selectionWrap}>
            {availabilityPreview.length ? (
              availabilityPreview.map((label) => <PreviewPill key={label} label={label} />)
            ) : (
              <Text style={styles.helpText}>Nenhum período selecionado ainda.</Text>
            )}
          </View>
        </SectionCard>

        {error ? <Text style={styles.error}>{error}</Text> : null}

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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  eyebrow: {
    color: palette.ember,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    color: palette.sand,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    maxWidth: 320,
  },
  subtitle: {
    color: palette.mist,
    fontSize: 15,
    lineHeight: 22,
  },
  sectionTitle: {
    color: palette.sand,
    fontSize: 18,
    fontWeight: "800",
  },
  profileHero: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  profileHeroMedia: {
    alignItems: "center",
    gap: spacing.sm,
  },
  profileHeroCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  helpText: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 20,
  },
  photoActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: spacing.md,
    overflow: "hidden",
  },
  photoActionButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  photoActionButtonPressed: {
    opacity: 0.7,
  },
  photoActionLabel: {
    color: palette.parchment,
    fontSize: 13,
    fontWeight: "700",
  },
  previewPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  previewPill: {
    minHeight: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    overflow: "hidden",
  },
  previewPillSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  previewPillLabel: {
    color: palette.sand,
    fontSize: 12,
    fontWeight: "700",
  },
  switchRow: {
    gap: spacing.md,
  },
  switchCopy: {
    gap: 4,
  },
  switchTitle: {
    color: palette.sand,
    fontSize: 16,
    fontWeight: "700",
  },
  switchControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
  switchControlSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
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
    color: palette.parchment,
    fontSize: 14,
    fontWeight: "700",
  },
  selectionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  footerActions: {
    gap: spacing.sm,
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
  error: {
    color: palette.ember,
    fontSize: 14,
    lineHeight: 20,
  },
});

function PreviewPill({ label }: { label: string }) {
  return (
    <View style={styles.previewPill}>
      <AppleGlassSurface
        pointerEvents="none"
        variant="dark"
        intensity="clear"
        style={styles.previewPillSurface}
      />
      <Text style={styles.previewPillLabel}>{label}</Text>
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
