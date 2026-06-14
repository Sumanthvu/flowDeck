// src/screens/SwipeScreen.tsx — FlowDeck Vertical Reel Viewer
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar,
  FlatList, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { SwipeCard } from '../components/SwipeCard';
import { llmService, Deck, ConceptCard } from '../services/llmService';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
  deck: Deck;
  initialIndex?: number;
  onBack: () => void;
  onVoiceChallenge: (cardIndex: number) => void;
}

export const SwipeScreen: React.FC<Props> = ({ deck, initialIndex = 0, onBack, onVoiceChallenge }) => {
  const [cards, setCards]               = useState<ConceptCard[]>([...deck.cards]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading]       = useState(false);
  const [isSimplifying, setIsSimplifying] = useState(false);

  // Quiz state
  const [quizInput, setQuizInput]       = useState('');
  const [isQuizChecked, setIsQuizChecked] = useState(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState('');
  const [inQuiz, setInQuiz]             = useState(false);
  const [quizCard, setQuizCard]         = useState<ConceptCard | null>(null);
  const [lastQuizzedIndex, setLastQuizzedIndex] = useState(-1);

  // Background load state
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [remainingPending, setRemainingPending]        = useState(deck.pendingPageImages?.length || 0);

  const [viewportH, setViewportH] = useState(SCREEN_H - 160);
  const flatListRef = useRef<FlatList>(null);

  // Sync to storage
  useEffect(() => {
    deck.cards = cards;
    llmService.updateDeck(deck.id, cards);
  }, [cards, deck]);

  // Background page scan trigger
  useEffect(() => {
    if (cards.length - currentIndex < 8 && remainingPending > 0 && !isBackgroundLoading) {
      setIsBackgroundLoading(true);
      llmService.loadMoreCardsForDeck(deck.id, (newCards) => {
        if (newCards?.length > 0) setCards(prev => [...prev, ...newCards]);
      }).then(() => setRemainingPending(deck.pendingPageImages?.length || 0))
        .catch(e => console.log('[SwipeScreen] BG load error:', e))
        .finally(() => setIsBackgroundLoading(false));
    }
  }, [currentIndex, cards.length, remainingPending, isBackgroundLoading, deck.id]);

  // Interstitial quiz trigger every 4 cards
  useEffect(() => {
    if (currentIndex > 0 && currentIndex % 4 === 0 && currentIndex !== lastQuizzedIndex && !inQuiz) {
      const start = currentIndex - 4;
      const prev  = cards.slice(start, currentIndex);
      if (prev.length > 0) {
        setQuizCard(prev[Math.floor(Math.random() * prev.length)]);
        setInQuiz(true);
        setLastQuizzedIndex(currentIndex);
      }
    }
  }, [currentIndex, cards, inQuiz, lastQuizzedIndex]);

  // Scroll to initialIndex on mount
  useEffect(() => {
    if (initialIndex > 0 && flatListRef.current && viewportH > 0) {
      setTimeout(() => flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false }), 200);
    }
  }, [viewportH, initialIndex]);

  const activeCard   = cards[currentIndex];
  const masteredCount = cards.filter(c => c.isMastered).length;
  const progress     = cards.length > 0 ? (currentIndex + 1) / cards.length : 0;

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleMarkMastered = () => {
    setCards(prev => {
      const u = [...prev];
      u[currentIndex] = { ...u[currentIndex], isMastered: true, scoreRecall: 100, scoreRetention: 100 };
      return u;
    });
    if (currentIndex + 1 < cards.length && flatListRef.current)
      flatListRef.current.scrollToIndex({ index: currentIndex + 1, animated: true });
  };

  const handleSimplify = async () => {
    if (isSimplifying || !activeCard) return;
    setIsSimplifying(true);
    try {
      const simpler = await llmService.simplifyConcept(activeCard);
      setCards(prev => {
        const u = [...prev];
        u[currentIndex] = { ...u[currentIndex], explanation: simpler, scoreRetention: Math.max(0, (u[currentIndex].scoreRetention ?? 50) - 10) };
        return u;
      });
    } catch (e) {
      console.log('[SwipeScreen] Simplify error:', e);
    } finally {
      setIsSimplifying(false);
    }
  };

  const handleCheckQuiz = async () => {
    if (!quizInput.trim() || !quizCard) return;
    setIsLoading(true);
    try {
      const result = await llmService.evaluateQuizAnswer(quizCard, quizInput);
      setIsQuizCorrect(result.correct);
      setQuizFeedback(result.feedback);
      setIsQuizChecked(true);
      if (result.correct) {
        setCards(prev => {
          const u = [...prev];
          const idx = u.findIndex(c => c.id === quizCard.id);
          if (idx !== -1) u[idx] = { ...u[idx], scoreTransfer: 100, isMastered: true };
          return u;
        });
      }
    } catch {
      setIsQuizChecked(true); setIsQuizCorrect(false);
      setQuizFeedback('Could not evaluate. Please try again.');
    }
    setIsLoading(false);
  };

  const handleNextAfterQuiz = () => {
    setQuizInput(''); setIsQuizChecked(false); setIsQuizCorrect(false); setQuizFeedback('');
    setInQuiz(false); setQuizCard(null);
    // Force FlatList to snap to the correct current index on quiz exit
    setTimeout(() => {
      if (flatListRef.current && viewportH > 0) {
        flatListRef.current.scrollToIndex({ index: currentIndex, animated: false });
      }
    }, 50);
  };

  // ── Special states ─────────────────────────────────────────────────────────
  if (currentIndex >= cards.length && (remainingPending > 0 || isBackgroundLoading)) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centeredWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.centeredTitle}>Reading next pages...</Text>
          <Text style={styles.centeredSub}>AI is generating more cards in the background.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!inQuiz && (!activeCard || currentIndex >= cards.length)) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centeredWrap}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🏆</Text>
          <Text style={styles.centeredTitle}>Deck Complete!</Text>
          <Text style={styles.centeredSub}>You mastered {masteredCount} of {cards.length} concepts</Text>
          <View style={styles.completedStats}>
            <View style={styles.completedStat}>
              <Text style={styles.completedStatVal}>{masteredCount}</Text>
              <Text style={styles.completedStatLabel}>MASTERED</Text>
            </View>
            <View style={styles.completedStat}>
              <Text style={[styles.completedStatVal, { color: theme.colors.success }]}>
                {Math.round((masteredCount / cards.length) * 100)}%
              </Text>
              <Text style={styles.completedStatLabel}>ACCURACY</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← Back to Lessons</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main Render ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{deck.title}</Text>
        <TouchableOpacity onPress={() => onVoiceChallenge(currentIndex)}>
          <Text style={styles.voiceLink}>🎙️</Text>
        </TouchableOpacity>
      </View>

      {/* Progress strip */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{currentIndex + 1}/{cards.length}</Text>
      </View>

      {/* Stats pills */}
      <View style={styles.statsPills}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>✅ {masteredCount} mastered</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: theme.colors.accentLight }]}>
          <Text style={[styles.pillText, { color: theme.colors.accent }]}>👁 {currentIndex + 1} seen</Text>
        </View>
      </View>

      {/* Content area */}
      <View style={{ flex: 1 }} onLayout={e => setViewportH(e.nativeEvent.layout.height)}>

        {/* ── Quiz Mode ─────────────────────────────────────────────────── */}
        {inQuiz ? (
          <KeyboardAvoidingView style={styles.quizWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.quizCard}>
              <View style={styles.quizTagRow}>
                <View style={styles.quizTag}><Text style={styles.quizTagText}>🎯 QUIZ CHECK</Text></View>
              </View>
              <Text style={styles.quizConceptHint}>Testing: {quizCard?.concept}</Text>
              <Text style={styles.quizQ}>{quizCard?.quizQuestion ?? `Explain: "${quizCard?.concept}"`}</Text>

              {isLoading ? (
                <View style={styles.centeredWrap}><ActivityIndicator color={theme.colors.accent} size="large" /></View>
              ) : !isQuizChecked ? (
                <>
                  <TextInput
                    style={styles.quizInput}
                    placeholder="Write your answer here..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={quizInput} onChangeText={setQuizInput}
                    multiline numberOfLines={4} textAlignVertical="top"
                  />
                  <TouchableOpacity style={[styles.submitBtn, !quizInput.trim() && { opacity: 0.5 }]} onPress={handleCheckQuiz} disabled={!quizInput.trim()}>
                    <Text style={styles.submitBtnText}>Submit Answer ⚡</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={[styles.feedbackBox, { borderColor: isQuizCorrect ? theme.colors.success : theme.colors.danger }]}>
                  <Text style={styles.feedbackEmoji}>{isQuizCorrect ? '✅' : '❌'}</Text>
                  <Text style={[styles.feedbackTitle, { color: isQuizCorrect ? theme.colors.success : theme.colors.danger }]}>
                    {isQuizCorrect ? 'Correct!' : 'Incorrect'}
                  </Text>
                  <Text style={styles.feedbackBody}>{quizFeedback}</Text>
                  <View style={styles.refAnswerBox}>
                    <Text style={styles.refAnswerLabel}>REFERENCE ANSWER</Text>
                    <Text style={styles.refAnswerText}>{quizCard?.quizAnswer}</Text>
                  </View>
                  <TouchableOpacity style={[styles.continueBtn, { backgroundColor: isQuizCorrect ? theme.colors.success : theme.colors.primary }]} onPress={handleNextAfterQuiz}>
                    <Text style={styles.continueBtnText}>Continue →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        ) : (
          viewportH > 0 && (
            /* ── Reel FlatList ─────────────────────────────────────────── */
            <FlatList
              ref={flatListRef}
              data={cards}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              keyExtractor={item => item.id}
              decelerationRate="fast"
              getItemLayout={(_, index) => ({ length: viewportH, offset: viewportH * index, index })}
              onMomentumScrollEnd={e => {
                const idx = Math.round(e.nativeEvent.contentOffset.y / viewportH);
                if (idx >= 0 && idx < cards.length) setCurrentIndex(idx);
              }}
              renderItem={({ item, index }) => (
                <View style={{ height: viewportH, paddingVertical: 8 }}>
                  <SwipeCard
                    card={item}
                    isTop={index === currentIndex}
                    isLoading={isSimplifying && index === currentIndex}
                    onVoiceLoop={() => onVoiceChallenge(index)}
                    height={viewportH}
                    cardIndex={index + 1}
                    totalCards={cards.length}
                  />

                  {/* Action buttons */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.simplifyBtn, isSimplifying && index === currentIndex && { opacity: 0.65 }]}
                      onPress={handleSimplify}
                      disabled={isSimplifying && index === currentIndex}
                    >
                      {isSimplifying && index === currentIndex
                        ? <ActivityIndicator size="small" color={theme.colors.primary} />
                        : <Text style={styles.simplifyBtnText}>💡 Simplify</Text>
                      }
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.masteredBtn, item.isMastered && { backgroundColor: theme.colors.success }]}
                      onPress={handleMarkMastered}
                    >
                      <Text style={styles.masteredBtnText}>{item.isMastered ? '✅ Mastered' : '✔ Got It'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )
        )}
      </View>

      {/* BG scan badge */}
      {isBackgroundLoading && (
        <View style={styles.bgBadge}>
          <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginRight: 6 }} />
          <Text style={styles.bgBadgeText}>Scanning next pages in background...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder,
    ...theme.shadows.xs,
  },
  backLink:   { color: theme.colors.primary, fontSize: 15, fontWeight: '700' },
  headerTitle:{ flex: 1, color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800', textAlign: 'center', marginHorizontal: 8 },
  voiceLink:  { fontSize: 22 },

  progressWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', gap: 10 },
  progressTrack:{ flex: 1, height: 6, backgroundColor: theme.colors.cardBorder, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 },
  progressLabel:{ fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, minWidth: 40, textAlign: 'right' },

  statsPills: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: theme.colors.separator },
  pill: { backgroundColor: theme.colors.primaryLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '700', color: theme.colors.primaryDark },

  // Quiz
  quizWrap: { flex: 1, padding: 16 },
  quizCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18,
    borderWidth: 1.5, borderColor: theme.colors.accent,
    ...theme.shadows.md,
  },
  quizTagRow: { marginBottom: 10 },
  quizTag: {
    alignSelf: 'flex-start', backgroundColor: theme.colors.accentLight,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4,
  },
  quizTagText:     { color: theme.colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  quizConceptHint: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600', marginBottom: 8 },
  quizQ:           { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary, lineHeight: 26, marginBottom: 14 },
  quizInput: {
    borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: 12,
    color: theme.colors.textPrimary, fontSize: 15, padding: 12,
    backgroundColor: '#FAFAFA', minHeight: 110, marginBottom: 14, lineHeight: 20,
  },
  submitBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    ...theme.shadows.primary,
  },
  submitBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },

  feedbackBox: { borderWidth: 1.5, borderRadius: 14, padding: 16, alignItems: 'center' },
  feedbackEmoji: { fontSize: 32, marginBottom: 6 },
  feedbackTitle: { fontSize: 18, fontWeight: '900', marginBottom: 6 },
  feedbackBody:  { color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 12 },
  refAnswerBox: {
    width: '100%', backgroundColor: '#FAFAFA', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: theme.colors.cardBorder, marginBottom: 14,
  },
  refAnswerLabel: { fontSize: 10, fontWeight: '800', color: theme.colors.textMuted, textTransform: 'uppercase', marginBottom: 3 },
  refAnswerText:  { fontSize: 13, color: theme.colors.textPrimary, fontWeight: '600' },
  continueBtn:    { width: '100%', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  continueBtnText:{ color: '#FFF', fontWeight: '800', fontSize: 14 },

  // Actions bar
  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, marginTop: 10 },
  actionBtn:  { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  simplifyBtn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  simplifyBtnText: { color: theme.colors.primaryDark, fontWeight: '800', fontSize: 13 },
  masteredBtn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, ...theme.shadows.primary },
  masteredBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },

  // Completed / centered states
  centeredWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  centeredTitle:{ fontSize: 22, fontWeight: '900', color: theme.colors.textPrimary, marginTop: 12, textAlign: 'center' },
  centeredSub:  { fontSize: 14, color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  completedStats: { flexDirection: 'row', gap: 36, marginTop: 24, marginBottom: 32 },
  completedStat:  { alignItems: 'center' },
  completedStatVal:   { fontSize: 32, fontWeight: '900', color: theme.colors.primary },
  completedStatLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.5, marginTop: 4 },
  backBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14,
    ...theme.shadows.primary,
  },
  backBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },

  bgBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16,
    borderWidth: 1, borderColor: theme.colors.cardBorder, marginHorizontal: 32, marginBottom: 12,
    alignSelf: 'center', ...theme.shadows.xs,
  },
  bgBadgeText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },
});