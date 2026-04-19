import { View, Text, StyleSheet } from "react-native";

import { ChoiceChip } from "@/components/ChoiceChip";
import { HorizontalChipRail } from "@/features/map/components/HorizontalChipRail";
import type { FormatDetailKind } from "@/lib/formatDetailTags";
import {
  MAGIC_COMMANDER_BRACKETS,
  MAGIC_MATCH_TYPES,
  POKEMON_DECK_TIERS,
  YUGIOH_POWER_LEVELS,
} from "@/lib/formatDetailTags";
import { palette, spacing } from "@/theme/tokens";

type FormatDetailTagBlockProps = {
  kind: FormatDetailKind;
  /** Valores selecionados (multi) para o `kind` atual. */
  selected: string[];
  onToggle: (value: string) => void;
};

export function FormatDetailTagBlock({ kind, selected, onToggle }: FormatDetailTagBlockProps) {
  if (!kind) {
    return null;
  }

  if (kind === "magic_commander") {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>Bracket</Text>
        <HorizontalChipRail>
          {MAGIC_COMMANDER_BRACKETS.map((label) => (
            <ChoiceChip
              key={label}
              label={label}
              selected={selected.includes(label)}
              onPress={() => onToggle(label)}
            />
          ))}
        </HorizontalChipRail>
      </View>
    );
  }

  if (kind === "magic_match") {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>Tipo de partida</Text>
        <HorizontalChipRail>
          {MAGIC_MATCH_TYPES.map((label) => (
            <ChoiceChip
              key={label}
              label={label}
              selected={selected.includes(label)}
              onPress={() => onToggle(label)}
            />
          ))}
        </HorizontalChipRail>
      </View>
    );
  }

  if (kind === "yugioh") {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>Power Level</Text>
        <HorizontalChipRail>
          {YUGIOH_POWER_LEVELS.map((label) => (
            <ChoiceChip
              key={label}
              label={label}
              selected={selected.includes(label)}
              onPress={() => onToggle(label)}
            />
          ))}
        </HorizontalChipRail>
      </View>
    );
  }

  if (kind === "pokemon") {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>Nível de Baralho</Text>
        <HorizontalChipRail>
          {POKEMON_DECK_TIERS.map((label) => (
            <ChoiceChip
              key={label}
              label={label}
              selected={selected.includes(label)}
              onPress={() => onToggle(label)}
            />
          ))}
        </HorizontalChipRail>
      </View>
    );
  }

  return null;
}

export function toggleMultiValue(current: string[], value: string): string[] {
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }
  return [...current, value];
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    /** O container da seção já define o espaço abaixo do título (“Preferências de formato”, etc.). */
    marginTop: 0,
  },
  label: {
    color: palette.pine,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
