import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";

import { AppleListGroup, AppleListRow, AppleListSection } from "@/components/AppleListNavigation";
import { MapPageCloseFooter } from "@/features/map/components/MapPageCloseFooter";
import { AppNewsDetailOverlay } from "@/features/map/components/AppNewsDetailOverlay";
import { MapEmptyCard, MapInlineNotice } from "@/features/map/components/MapFeedbackPrimitives";
import { listAppNews, markAppNewsInboxOpened } from "@/lib/api";
import { formatDateTime } from "@/lib/formatting";
import { palette, spacing } from "@/theme/tokens";
import type { AppNewsItem } from "@/types/domain";

type NovidadesPageProps = {
  bottomInset: number;
  onClose: () => void;
  /** Chamado após registrar que o usuário abriu a lista (atualiza contagem / bolinha). */
  onInboxMarked?: () => void;
};

export function NovidadesPage({ bottomInset, onClose, onInboxMarked }: NovidadesPageProps) {
  const [items, setItems] = useState<AppNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AppNewsItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setFetchError(null);
        const rows = await listAppNews();
        if (!cancelled) {
          setItems(rows);
        }
      } catch {
        if (!cancelled) {
          setFetchError("Não foi possível carregar as novidades agora.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await markAppNewsInboxOpened();
        onInboxMarked?.();
      } catch {
        // RPC pode não existir em ambientes antigos
      }
    })();
  }, [onInboxMarked]);

  const handleSelect = useCallback((item: AppNewsItem) => {
    setSelected(item);
  }, []);

  return (
    <>
      <View style={styles.rootWithFooter}>
        <ScrollView
          style={styles.rootScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, styles.rootScrollContent]}
        >
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={palette.ember} />
            </View>
          ) : null}

          {!loading && !items.length && !fetchError ? (
            <MapEmptyCard
              title="Nada por enquanto"
              body="Quando houver novidades, elas aparecem aqui."
            />
          ) : null}

          {fetchError ? <MapInlineNotice tone="error" message={fetchError} /> : null}

          {!loading && items.length ? (
            <AppleListSection size="compact" title="Mensagens">
              <AppleListGroup>
                {items.map((item, index) => (
                  <AppleListRow
                    key={item.id}
                    separator={index > 0}
                    icon={{ iosName: "sparkles", fallbackName: "auto-awesome" }}
                    label={item.title}
                    subtitle={formatDateTime(item.publishedAt)}
                    onPress={() => handleSelect(item)}
                    size="compact"
                  />
                ))}
              </AppleListGroup>
            </AppleListSection>
          ) : null}
        </ScrollView>
        <MapPageCloseFooter bottomInset={bottomInset} onClose={onClose} />
      </View>

      <AppNewsDetailOverlay
        visible={selected !== null}
        item={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  rootWithFooter: {
    flex: 1,
  },
  rootScroll: {
    flex: 1,
  },
  rootScrollContent: {
    flexGrow: 1,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  loadingBox: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
});
