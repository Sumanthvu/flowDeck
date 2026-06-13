import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Animated, ActivityIndicator,
} from 'react-native';
import { theme } from '../styles/theme';
import { authService, User } from '../services/authService';
import { llmService, Deck } from '../services/llmService';
import { RadarChart } from '../components/RadarChart';

interface Props {
  onSelectDeck: (deck: Deck) => void;
  onGoToImport: () => void;
  onGoToLearn: () => void;
}

export const HomeScreen: React.FC<Props> = ({ onSelectDeck, onGoToImport, onGoToLearn }) => {
  const [user, setUser] = useState<User | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('⚡ Initializing NPU...');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const load = async () => {
      const u = await authService.getUser();
      setUser(u);
      await llmService.loadModel((progress, status) => {
        setLoadingStatus(status);
        setDownloadProgress(progress);
      });
      const d = await llmService.getDecks();
      setDecks(d);
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    };
    load();
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getOverallMetrics = () => {
    let totalRecall = 0, totalRetention = 0, totalTransfer = 0, totalCards = 0;
    decks.forEach(deck => deck.cards.forEach(card => {
      totalRecall += card.scoreRecall;
      totalRetention += card.scoreRetention;
      totalTransfer += card.scoreTransfer;
      totalCards++;
    }));
    if (totalCards === 0) return { recall: 0, retention: 0, transfer: 0, masteredCount: 0, totalCards: 0 };
    return {
      recall: totalRecall / totalCards,
      retention: totalRetention / totalCards,
      transfer: totalTransfer / totalCards,
      masteredCount: decks.reduce((acc, d) => acc + d.cards.filter(c => c.isMastered).length, 0),
      totalCards,
    };
  };

  const metrics = getOverallMetrics();
  const totalMastered = metrics.masteredCount;
  const totalCards = decks.reduce((s, d) => s + d.cards.length, 0);
  const xp = totalMastered * 10 + decks.length * 5;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginBottom: 16 }} />
        <Text style={styles.loadingText}>{loadingStatus}</Text>
        {downloadProgress > 0 && downloadProgress < 1 && (
          <View style={styles.downloadBarWrap}>
            <View style={[styles.downloadBarFill, { width: `${downloadProgress * 100}%` }]} />
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{user?.name ?? 'Learner'} 👋</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.name ?? 'U')[0].toUpperCase()}</Text>
            </View>
          </View>

          {/* Streak Banner */}
          <View style={styles.streakBanner}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View>
              <Text style={styles.streakTitle}>Day {user?.streak ?? 1} Streak!</Text>
              <Text style={styles.streakSub}>Keep going — you're on fire!</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>⚡ {xp} XP</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            {[
              { label: 'TOTAL CARDS', value: totalCards.toString(), color: theme.colors.primary },
              { label: 'MASTERED', value: totalMastered.toString(), color: theme.colors.success },
              { label: 'DECKS', value: decks.length.toString(), color: theme.colors.accent },
            ].map(stat => (
              <View key={stat.label} style={styles.statChip}>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Radar */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Mastery Map</Text>
            <Text style={styles.sectionSub}>Mastered {totalMastered} of {totalCards} concepts</Text>
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <RadarChart
                scoreRecall={metrics.recall}
                scoreRetention={metrics.retention}
                scoreTransfer={metrics.transfer}
                size={200}
              />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={onGoToLearn}>
              <Text style={styles.actionIcon}>📚</Text>
              <Text style={styles.actionLabel}>Start Learning</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAccent]} onPress={onGoToImport}>
              <Text style={styles.actionIcon}>📥</Text>
              <Text style={styles.actionLabel}>Import Content</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Decks */}
          {decks.length > 0 && (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>Your Decks</Text>
                <TouchableOpacity onPress={async () => {
                  await llmService.clearAllDecks();
                  setDecks([]);
                }}>
                  <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: '700' }}>🗑️ Clear All</Text>
                </TouchableOpacity>
              </View>
              {decks.slice(0, 3).map(deck => {
                const mastered = deck.cards.filter(c => c.isMastered).length;
                const pct = deck.cards.length > 0 ? Math.round((mastered / deck.cards.length) * 100) : 0;
                return (
                  <TouchableOpacity key={deck.id} style={styles.deckCard} onPress={() => onSelectDeck(deck)}>
                    <View style={styles.deckIcon}>
                      <Text style={{ fontSize: 20 }}>📖</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deckTitle} numberOfLines={1}>{deck.title}</Text>
                      <Text style={styles.deckMeta}>{deck.cards.length} cards · {mastered} mastered</Text>
                      <View style={styles.progressBg}>
                        <View style={[styles.progressFill, { width: `${pct || 2}%` }]} />
                      </View>
                    </View>
                    <Text style={[styles.pct, { color: pct > 50 ? theme.colors.success : theme.colors.primary }]}>{pct}%</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {decks.length === 0 && (
            <TouchableOpacity style={styles.emptyCard} onPress={onGoToImport}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.emptyTitle}>No decks yet</Text>
              <Text style={styles.emptySub}>Tap to import your first syllabus</Text>
            </TouchableOpacity>
          )}

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.md, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  loadingText: { color: theme.colors.primary, fontSize: 16, fontWeight: '700' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { color: theme.colors.textSecondary, fontSize: 14 },
  userName: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '800' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.colors.primaryGlow,
    borderWidth: 2, borderColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: theme.colors.primary, fontSize: 18, fontWeight: '800' },
  streakBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,176,32,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,176,32,0.25)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md, marginBottom: 16,
  },
  streakEmoji: { fontSize: 28, marginRight: 12 },
  streakTitle: { color: theme.colors.warning, fontSize: 16, fontWeight: '800' },
  streakSub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  streakBadge: {
    marginLeft: 'auto',
    backgroundColor: theme.colors.primaryGlow,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  streakBadgeText: { color: theme.colors.primary, fontWeight: '700', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statChip: {
    flex: 1, backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    padding: theme.spacing.sm, alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { color: theme.colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  card: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    padding: theme.spacing.md, marginBottom: 16,
  },
  sectionTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sectionSub: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: {
    flex: 1, backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg, borderWidth: 1.5,
    borderColor: theme.colors.primary, padding: 16, alignItems: 'center',
  },
  actionBtnAccent: { borderColor: theme.colors.accent },
  actionIcon: { fontSize: 26, marginBottom: 6 },
  actionLabel: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' },
  deckCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    padding: theme.spacing.md, marginBottom: 10, gap: 12,
  },
  deckIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: theme.colors.primaryGlow,
    justifyContent: 'center', alignItems: 'center',
  },
  deckTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' },
  deckMeta: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2, marginBottom: 6 },
  progressBg: { height: 4, backgroundColor: theme.colors.cardBorder, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 2 },
  pct: { fontSize: 13, fontWeight: '800', minWidth: 36, textAlign: 'right' },
  emptyCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl,
    borderWidth: 1.5, borderColor: theme.colors.glassBorder,
    borderStyle: 'dashed', padding: 40, alignItems: 'center', marginTop: 8,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptySub: { color: theme.colors.textSecondary, fontSize: 14 },
  downloadBarWrap: {
    width: '80%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  downloadBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
});
