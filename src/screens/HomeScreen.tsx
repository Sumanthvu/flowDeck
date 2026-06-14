// src/screens/HomeScreen.tsx — FlowDeck Premium Dashboard (v2)
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { authService, User } from '../services/authService';
import { llmService, Deck } from '../services/llmService';
import { RadarChart } from '../components/RadarChart';

const { width: W } = Dimensions.get('window');

interface Props {
  onSelectDeck: (deck: Deck) => void;
  onGoToImport: () => void;
  onGoToLearn: () => void;
}

// ─── Reusable subcomponents ───────────────────────────────────────────────────

const StatPill = ({
  icon, value, label, color,
}: { icon: string; value: string; label: string; color: string }) => (
  <View style={styles.statPill}>
    <View style={[styles.statPillIcon, { backgroundColor: color + '18' }]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
    </View>
    <Text style={[styles.statPillValue, { color }]}>{value}</Text>
    <Text style={styles.statPillLabel}>{label}</Text>
  </View>
);

const FeatureChip = ({ icon, text }: { icon: string; text: string }) => (
  <View style={styles.featureChip}>
    <Text style={styles.featureChipIcon}>{icon}</Text>
    <Text style={styles.featureChipText}>{text}</Text>
  </View>
);

const StepCard = ({ n, title, desc }: { n: number; title: string; desc: string }) => (
  <View style={styles.stepCard}>
    <View style={styles.stepNumBox}>
      <Text style={styles.stepNum}>{n}</Text>
    </View>
    <View style={styles.stepBody}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDesc}>{desc}</Text>
    </View>
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const HomeScreen: React.FC<Props> = ({ onSelectDeck, onGoToImport, onGoToLearn }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [decks, setDecks]     = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus]       = useState('Initializing AI engine...');
  const [downloadProgress, setDownloadProgress] = useState(0);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    (async () => {
      const u = await authService.getUser();
      setUser(u);
      // Load LLM in the background without blocking the UI transition
      llmService.loadModel((p, s) => {
        setLoadingStatus(s);
        setDownloadProgress(p);
      });
      const d = await llmService.getDecks();
      setDecks(d);
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]).start();
    })();
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  // Aggregate mastery metrics
  const metrics = (() => {
    let r = 0, ret = 0, tr = 0, n = 0;
    decks.forEach(d => d.cards.forEach(c => {
      r += c.scoreRecall; ret += c.scoreRetention; tr += c.scoreTransfer; n++;
    }));
    const mastered = decks.reduce((a, d) => a + d.cards.filter(c => c.isMastered).length, 0);
    return n === 0
      ? { recall: 0, retention: 0, transfer: 0, mastered, total: 0 }
      : { recall: r / n, retention: ret / n, transfer: tr / n, mastered, total: n };
  })();

  const totalCards = decks.reduce((s, d) => s + d.cards.length, 0);
  const masteryPct = totalCards > 0 ? Math.round((metrics.mastered / totalCards) * 100) : 0;
  const xp         = metrics.mastered * 10 + decks.length * 5;

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingCard}>
          <View style={styles.loadingLogo}>
            <Text style={styles.loadingLogoText}>FlowDeck</Text>
            <View style={styles.loadingDot} />
          </View>
          <ActivityIndicator color={theme.colors.primary} size="large" style={{ marginVertical: 22 }} />
          <Text style={styles.loadingStatus}>{loadingStatus}</Text>
          {downloadProgress > 0 && downloadProgress < 1 && (
            <View style={styles.downloadTrack}>
              <View style={[styles.downloadFill, { width: `${downloadProgress * 100}%` }]} />
            </View>
          )}
        </View>
      </View>
    );
  }

  // ── Main dashboard ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Top App Bar ────────────────────────────────────────────── */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.appWordmark}>FlowDeck</Text>
              <Text style={styles.greetingLine}>{getGreeting()}, {user?.name?.split(' ')[0] ?? 'Learner'} 👋</Text>
            </View>
            <View style={styles.topBarRight}>
              <View style={styles.xpBadge}>
                <Text style={styles.xpBadgeText}>⚡ {xp} XP</Text>
              </View>
              <View style={styles.avatar}>
                <Text style={styles.avatarChar}>{(user?.name ?? 'F')[0].toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* ── Hero Banner ────────────────────────────────────────────── */}
          <View style={styles.heroBanner}>
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>🔥 Day {user?.streak ?? 1} Streak</Text>
              </View>
              <Text style={styles.heroHeading}>
                {decks.length === 0
                  ? 'Start Learning\nSomething New'
                  : `${masteryPct}% of\nContent Mastered`}
              </Text>
              <Text style={styles.heroSub}>
                {decks.length === 0
                  ? 'Import any topic or PDF and FlowDeck generates interactive flashcards instantly.'
                  : `${metrics.mastered} of ${totalCards} cards mastered across ${decks.length} topic${decks.length !== 1 ? 's' : ''}.`}
              </Text>
              <View style={styles.heroActions}>
                <TouchableOpacity style={styles.heroBtn} onPress={onGoToLearn}>
                  <Text style={styles.heroBtnText}>Study Now →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.heroOutlineBtn} onPress={onGoToImport}>
                  <Text style={styles.heroOutlineBtnText}>+ Import</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Decorative accent circle */}
            <View style={styles.heroDecor} pointerEvents="none" />
          </View>

          {/* ── Stats Row ──────────────────────────────────────────────── */}
          <View style={styles.statsRow}>
            <StatPill icon="📚" value={String(decks.length)}      label="Topics"    color={theme.colors.accent}   />
            <View style={styles.statsDivider} />
            <StatPill icon="📇" value={String(totalCards)}         label="Cards"     color={theme.colors.primary}  />
            <View style={styles.statsDivider} />
            <StatPill icon="✅" value={String(metrics.mastered)}   label="Mastered"  color={theme.colors.success}  />
            <View style={styles.statsDivider} />
            <StatPill icon="🔥" value={`${user?.streak ?? 1}d`}   label="Streak"    color="#F59E0B"               />
          </View>

          {/* ── Mastery Radar ──────────────────────────────────────────── */}
          {totalCards > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>Mastery Map</Text>
                  <Text style={styles.cardSub}>Recall · Retention · Transfer</Text>
                </View>
                <View style={[styles.miniPct, { borderColor: masteryPct > 60 ? theme.colors.success : theme.colors.primary }]}>
                  <Text style={[styles.miniPctText, { color: masteryPct > 60 ? theme.colors.success : theme.colors.primary }]}>
                    {masteryPct}%
                  </Text>
                </View>
              </View>
              <View style={styles.radarWrap}>
                <RadarChart
                  scoreRecall={metrics.recall}
                  scoreRetention={metrics.retention}
                  scoreTransfer={metrics.transfer}
                  size={200}
                />
              </View>

              {/* Radar legend */}
              <View style={styles.radarLegend}>
                {[
                  { label: 'Recall',     color: theme.colors.primary, val: Math.round(metrics.recall)    },
                  { label: 'Retention',  color: theme.colors.accent,  val: Math.round(metrics.retention) },
                  { label: 'Transfer',   color: '#F59E0B',             val: Math.round(metrics.transfer)  },
                ].map(l => (
                  <View key={l.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                    <Text style={styles.legendLabel}>{l.label}</Text>
                    <Text style={[styles.legendVal, { color: l.color }]}>{l.val}%</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Continue Learning (recent deck) ───────────────────────── */}
          {decks.length > 0 && (() => {
            const recent = decks[decks.length - 1];
            const m = recent.cards.filter(c => c.isMastered).length;
            const pct = recent.cards.length > 0 ? Math.round((m / recent.cards.length) * 100) : 0;
            return (
              <TouchableOpacity style={styles.continueCard} onPress={() => onSelectDeck(recent)} activeOpacity={0.88}>
                <View style={styles.continueLeft}>
                  <Text style={styles.continueTag}>CONTINUE WHERE YOU LEFT OFF</Text>
                  <Text style={styles.continueTitle} numberOfLines={2}>{recent.title}</Text>
                  <View style={styles.continueTrack}>
                    <View style={[styles.continueFill, {
                      width: `${pct || 2}%`,
                      backgroundColor: pct > 70 ? theme.colors.success : theme.colors.primary,
                    }]} />
                  </View>
                  <Text style={styles.continueMeta}>{m}/{recent.cards.length} mastered · {pct}%</Text>
                </View>
                <View style={styles.continueArrow}>
                  <Text style={styles.continueArrowText}>▶</Text>
                </View>
              </TouchableOpacity>
            );
          })()}

          {/* ── Empty state if no decks ──────────────────────────────── */}
          {decks.length === 0 && (
            <TouchableOpacity style={styles.emptyCard} onPress={onGoToImport} activeOpacity={0.85}>
              <Text style={styles.emptyCardIcon}>📤</Text>
              <View>
                <Text style={styles.emptyCardTitle}>Import your first topic</Text>
                <Text style={styles.emptyCardSub}>Paste notes or upload a PDF to get started</Text>
              </View>
              <Text style={{ fontSize: 20, color: theme.colors.primary }}>›</Text>
            </TouchableOpacity>
          )}

          {/* ── What FlowDeck Can Do ──────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What You Can Do</Text>
            <View style={styles.featureGrid}>
              <FeatureChip icon="📱" text="Reel Cards"          />
              <FeatureChip icon="🎙️" text="Voice AI Grading"   />
              <FeatureChip icon="💡" text="Inline Simplify"     />
              <FeatureChip icon="🎯" text="Spaced Quizzes"      />
              <FeatureChip icon="🔒" text="100% Offline"        />
              <FeatureChip icon="🧠" text="Mastery Tracking"    />
            </View>
          </View>

          {/* ── How It Works ────────────────────────────────────────────── */}
          <View style={[styles.card, { marginBottom: 32 }]}>
            <Text style={styles.cardTitle}>How It Works</Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              <StepCard n={1} title="Import Any Content" desc="Paste notes or upload any PDF — text is parsed entirely on-device." />
              <StepCard n={2} title="AI Builds Your Deck" desc="On-device AI creates concept cards + quiz questions automatically." />
              <StepCard n={3} title="Study via Reel View" desc="Scroll vertically through cards. Tap to flip for the quiz challenge." />
              <StepCard n={4} title="Speak → Get Graded" desc="Record yourself explaining the concept. AI grades you Socratically." />
            </View>
          </View>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingBottom: 20 },

  // ── Loading ──────────────────────────────────────────────────────────────
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  loadingCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 36, alignItems: 'center', width: '78%',
    ...theme.shadows.lg,
  },
  loadingLogo:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loadingLogoText: { fontSize: 26, fontWeight: '900', color: theme.colors.primary },
  loadingDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.accent, marginTop: 2 },
  loadingStatus:   { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  downloadTrack:   { width: '100%', height: 5, backgroundColor: theme.colors.cardBorder, borderRadius: 3, marginTop: 14, overflow: 'hidden' },
  downloadFill:    { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 },

  // ── Top Bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8,
  },
  appWordmark: { fontSize: 20, fontWeight: '900', color: theme.colors.primary, letterSpacing: -0.4 },
  greetingLine: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500', marginTop: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  xpBadge: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,107,53,0.2)',
  },
  xpBadgeText: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 2, borderColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarChar: { color: theme.colors.primary, fontSize: 14, fontWeight: '900' },

  // ── Hero Banner ──────────────────────────────────────────────────────────
  heroBanner: {
    marginHorizontal: 14, marginTop: 6, marginBottom: 14,
    backgroundColor: theme.colors.primary,
    borderRadius: 20, padding: 22, overflow: 'hidden',
    minHeight: 180, justifyContent: 'flex-end',
    ...theme.shadows.primary,
  },
  heroContent: { zIndex: 2 },
  heroBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10,
  },
  heroBadgeText:  { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  heroHeading:    { fontSize: 26, fontWeight: '900', color: '#FFFFFF', lineHeight: 32, marginBottom: 8, letterSpacing: -0.5 },
  heroSub:        { fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: '500', lineHeight: 18, marginBottom: 16 },
  heroActions:    { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  heroBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 11,
  },
  heroBtnText:        { color: theme.colors.primary, fontWeight: '800', fontSize: 14 },
  heroOutlineBtn: {
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 11,
  },
  heroOutlineBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  heroDecor: {
    position: 'absolute', right: -30, top: -30,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // ── Stats Row ────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row', marginHorizontal: 14, marginBottom: 14,
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6,
    borderWidth: 1, borderColor: theme.colors.cardBorder, ...theme.shadows.sm,
  },
  statPill:      { flex: 1, alignItems: 'center', gap: 4 },
  statPillIcon:  { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statPillValue: { fontSize: 18, fontWeight: '900' },
  statPillLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  statsDivider:  { width: 1, backgroundColor: theme.colors.separator, marginVertical: 4 },

  // ── Generic card ─────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginHorizontal: 14, marginBottom: 14,
    borderWidth: 1, borderColor: theme.colors.cardBorder, ...theme.shadows.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitle:  { fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary },
  cardSub:    { fontSize: 11, color: theme.colors.textMuted, fontWeight: '500', marginTop: 2 },

  miniPct: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  miniPctText: { fontSize: 13, fontWeight: '900' },

  // Radar
  radarWrap:    { alignItems: 'center', paddingVertical: 6 },
  radarLegend:  { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.separator },
  legendItem:   { alignItems: 'center', gap: 3 },
  legendDot:    { width: 8, height: 8, borderRadius: 4 },
  legendLabel:  { fontSize: 10, fontWeight: '600', color: theme.colors.textMuted },
  legendVal:    { fontSize: 13, fontWeight: '800' },

  // ── Continue card ─────────────────────────────────────────────────────────
  continueCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginHorizontal: 14, marginBottom: 14,
    borderWidth: 1.5, borderColor: theme.colors.primary,
    ...theme.shadows.primary,
  },
  continueLeft:   { flex: 1, marginRight: 12 },
  continueTag:    { fontSize: 10, fontWeight: '800', color: theme.colors.primary, letterSpacing: 0.5, marginBottom: 4 },
  continueTitle:  { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 8, lineHeight: 20 },
  continueTrack:  { height: 5, backgroundColor: theme.colors.separator, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  continueFill:   { height: '100%', borderRadius: 3 },
  continueMeta:   { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600' },
  continueArrow: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1, borderColor: 'rgba(255,107,53,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  continueArrowText: { fontSize: 18, color: theme.colors.primary },

  // ── Empty card ──────────────────────────────────────────────────────────
  emptyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.colors.accentLight, borderRadius: 14, padding: 16,
    marginHorizontal: 14, marginBottom: 14,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.accent,
  },
  emptyCardIcon:  { fontSize: 28 },
  emptyCardTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.textPrimary },
  emptyCardSub:   { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },

  // ── Feature chips ────────────────────────────────────────────────────────
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  featureChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.background, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  featureChipIcon: { fontSize: 14 },
  featureChipText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },

  // ── Step cards ───────────────────────────────────────────────────────────
  stepCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: theme.colors.background, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  stepNumBox: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 1,
  },
  stepNum:   { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  stepBody:  { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 3 },
  stepDesc:  { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
});
