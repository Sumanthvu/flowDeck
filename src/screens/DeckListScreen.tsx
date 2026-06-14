// src/screens/DeckListScreen.tsx — FlowDeck Learn Page
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TouchableWithoutFeedback,
  StatusBar, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { llmService, Deck } from '../services/llmService';

interface Props {
  onSelectDeck: (deck: Deck) => void;
  onReviseDeck: (deck: Deck) => void;
  onGoToImport: () => void;
}

const DECK_COLORS = [
  { bg: '#FFF0EB', border: '#FFCDB9', icon: '#FF6B35' },
  { bg: '#E6F7F5', border: '#B3E8E2', icon: '#00A896' },
  { bg: '#EFF6FF', border: '#BFDBFE', icon: '#3B82F6' },
  { bg: '#FEF3C7', border: '#FDE68A', icon: '#D97706' },
  { bg: '#FCE7F3', border: '#FBCFE8', icon: '#DB2777' },
  { bg: '#ECFDF5', border: '#A7F3D0', icon: '#059669' },
];

const DECK_ICONS = ['📚', '🔬', '🧮', '🌍', '⚡', '🎯', '🧬', '💻', '🎨', '🏛️', '📐', '🔭'];

// ── Animated Deck Card ────────────────────────────────────────────────────────
const DeckCard = ({ deck, index, onStudy, onRevise }: {
  deck: Deck; index: number;
  onStudy: () => void; onRevise: () => void;
}) => {
  const mastered = deck.cards.filter(c => c.isMastered).length;
  const pct      = deck.cards.length > 0 ? Math.round((mastered / deck.cards.length) * 100) : 0;
  const col      = DECK_COLORS[index % DECK_COLORS.length];
  const icon     = DECK_ICONS[index % DECK_ICONS.length];
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, speed: 30 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1,     useNativeDriver: true, speed: 30 }).start();

  return (
    <Animated.View style={[styles.deckCard, { transform: [{ scale: scaleAnim }] }]}>
      {/* Card top row */}
      <View style={styles.deckCardTop}>
        <View style={[styles.deckIconBox, { backgroundColor: col.bg, borderColor: col.border }]}>
          <Text style={styles.deckIconText}>{icon}</Text>
        </View>

        <View style={styles.deckInfo}>
          <Text style={styles.deckTitle} numberOfLines={2}>{deck.title}</Text>
          <Text style={styles.deckMeta}>{deck.cards.length} cards • {mastered} mastered</Text>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View style={[
              styles.progressFill,
              { width: `${pct || 2}%`,
                backgroundColor: pct > 70 ? theme.colors.success
                  : pct > 35 ? theme.colors.primary
                  : theme.colors.accent }
            ]} />
          </View>
        </View>

        <View style={styles.deckPct}>
          <Text style={[styles.deckPctText, {
            color: pct > 70 ? theme.colors.success
              : pct > 35 ? theme.colors.primary
              : theme.colors.accent
          }]}>{pct}%</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.deckActions}>
        <TouchableOpacity
          style={[styles.deckActionBtn, styles.deckActionPrimary]}
          onPress={onStudy}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={0.85}
        >
          <Text style={styles.deckActionPrimaryText}>▶  Continue Learning</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deckActionBtn, styles.deckActionSecondary]}
          onPress={onRevise}
          activeOpacity={0.8}
        >
          <Text style={styles.deckActionSecondaryText}>🎯 Revise</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const DeckListScreen: React.FC<Props> = ({ onSelectDeck, onReviseDeck, onGoToImport }) => {
  const [decks, setDecks]   = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    llmService.getDecks().then(d => { setDecks(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>My Lessons</Text>
          <Text style={styles.pageSub}>{decks.length} topic{decks.length !== 1 ? 's' : ''} imported</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {decks.length > 0 && (
            <TouchableOpacity 
              style={styles.clearBtn} 
              onPress={() => {
                const { Alert } = require('react-native');
                Alert.alert(
                  "Clear All Lessons",
                  "Are you sure you want to clear all lessons?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { 
                      text: "Clear", 
                      style: "destructive",
                      onPress: () => {
                        llmService.clearAllDecks().then(() => {
                          setDecks([]);
                        });
                      } 
                    }
                  ]
                );
              }}
            >
              <Text style={styles.clearBtnText}>🗑️ Clear All</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.newBtn} onPress={onGoToImport}>
            <Text style={styles.newBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {decks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📖</Text>
          <Text style={styles.emptyTitle}>No lessons yet</Text>
          <Text style={styles.emptySub}>Import a topic or upload a PDF to get started</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={onGoToImport}>
            <Text style={styles.emptyBtnText}>Import Your First Topic</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={decks}
          keyExtractor={d => d.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: deck, index }) => (
            <DeckCard
              deck={deck}
              index={index}
              onStudy={() => onSelectDeck(deck)}
              onRevise={() => onReviseDeck(deck)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: theme.colors.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: theme.colors.background,
  },
  pageTitle: { fontSize: 24, fontWeight: '900', color: theme.colors.textPrimary, letterSpacing: -0.5 },
  pageSub:   { fontSize: 13, color: theme.colors.textMuted, marginTop: 2, fontWeight: '500' },
  newBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    ...theme.shadows.primary,
  },
  newBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  clearBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1.5, borderColor: theme.colors.danger,
  },
  clearBtnText: { color: theme.colors.danger, fontWeight: '800', fontSize: 13 },

  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

  // Deck card
  deckCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    padding: 14, ...theme.shadows.sm,
  },
  deckCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  deckIconBox: {
    width: 50, height: 50, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
  },
  deckIconText:  { fontSize: 24 },
  deckInfo:      { flex: 1 },
  deckTitle:     { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary, lineHeight: 20, marginBottom: 3 },
  deckMeta:      { fontSize: 12, color: theme.colors.textMuted, fontWeight: '500', marginBottom: 8 },
  progressTrack: { height: 5, backgroundColor: theme.colors.cardBorder, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  deckPct:       { alignItems: 'flex-end', paddingTop: 2 },
  deckPctText:   { fontSize: 15, fontWeight: '900' },

  // Action row
  deckActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  deckActionBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  deckActionPrimary: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.primary,
  },
  deckActionPrimaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  deckActionSecondary:   {
    backgroundColor: theme.colors.accentLight,
    borderWidth: 1.5, borderColor: theme.colors.accent,
  },
  deckActionSecondaryText: { color: theme.colors.accent, fontWeight: '800', fontSize: 13 },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 8 },
  emptySub:   { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  emptyBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 14,
    ...theme.shadows.primary,
  },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});