import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator,
} from "react-native";
import { theme } from "../styles/theme";
import { llmService, Deck } from "../services/llmService";

interface Props {
  onSelectDeck: (deck: Deck) => void;
  onGoToImport: () => void;
}

const DECK_ICONS = ["📖", "🔬", "🧮", "🌍", "⚡", "🎯", "🧬", "💻", "🎨", "🏛️"];

export const DeckListScreen: React.FC<Props> = ({ onSelectDeck, onGoToImport }) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    llmService.getDecks().then(d => { setDecks(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Study Decks</Text>
          <Text style={styles.pageSub}>{decks.length} deck{decks.length !== 1 ? "s" : ""} available</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onGoToImport}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {decks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No decks yet</Text>
          <Text style={styles.emptySub}>Import content to create your first deck</Text>
          <TouchableOpacity style={styles.importBtn} onPress={onGoToImport}>
            <Text style={styles.importBtnText}>📥 Import Content</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={decks}
          keyExtractor={d => d.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: deck, index }) => {
            const mastered = deck.cards.filter(c => c.isMastered).length;
            const pct = deck.cards.length > 0 ? Math.round((mastered / deck.cards.length) * 100) : 0;
            const icon = DECK_ICONS[index % DECK_ICONS.length];
            return (
              <TouchableOpacity style={styles.deckCard} onPress={() => onSelectDeck(deck)} activeOpacity={0.75}>
                <View style={styles.deckIconWrap}>
                  <Text style={styles.deckIconText}>{icon}</Text>
                </View>
                <View style={styles.deckInfo}>
                  <Text style={styles.deckTitle} numberOfLines={1}>{deck.title}</Text>
                  <Text style={styles.deckMeta}>{deck.cards.length} cards · {mastered} mastered</Text>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${pct || 2}%`, backgroundColor: pct > 70 ? theme.colors.success : pct > 30 ? theme.colors.primary : theme.colors.accent }]} />
                  </View>
                </View>
                <View style={styles.pctWrap}>
                  <Text style={[styles.pctText, { color: pct > 70 ? theme.colors.success : theme.colors.primary }]}>{pct}%</Text>
                  <Text style={styles.arrow}>›</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", padding: theme.spacing.md, paddingBottom: 12 },
  pageTitle: { color: theme.colors.textPrimary, fontSize: 26, fontWeight: "800" },
  pageSub: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  addBtn: {
    backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16, paddingVertical: 8,
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  list: { padding: theme.spacing.md, paddingTop: 4, paddingBottom: 32 },
  deckCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    padding: theme.spacing.md, marginBottom: 10, gap: 12,
  },
  deckIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: theme.colors.primaryGlow,
    justifyContent: "center", alignItems: "center",
  },
  deckIconText: { fontSize: 24 },
  deckInfo: { flex: 1 },
  deckTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 3 },
  deckMeta: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 8 },
  progressBg: { height: 5, backgroundColor: theme.colors.cardBorder, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  pctWrap: { alignItems: "flex-end" },
  pctText: { fontSize: 15, fontWeight: "900", marginBottom: 4 },
  arrow: { color: theme.colors.textMuted, fontSize: 20, fontWeight: "300" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: "800", marginBottom: 8 },
  emptySub: { color: theme.colors.textSecondary, fontSize: 14, textAlign: "center", marginBottom: 28 },
  importBtn: {
    backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
    paddingHorizontal: 28, paddingVertical: 14,
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  importBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});