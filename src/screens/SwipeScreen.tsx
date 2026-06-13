import React, { useState } from "react";
import {
  StyleSheet, View, Text, TouchableOpacity, SafeAreaView,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar,
} from "react-native";
import { theme } from "../styles/theme";
import { SwipeCard } from "../components/SwipeCard";
import { llmService, Deck, ConceptCard } from "../services/llmService";

interface Props {
  deck: Deck;
  onBack: () => void;
  onVoiceChallenge: (cardIndex: number) => void;
}

export const SwipeScreen: React.FC<Props> = ({ deck, onBack, onVoiceChallenge }) => {
  const [cards, setCards] = useState<ConceptCard[]>([...deck.cards]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [quizInput, setQuizInput] = useState("");
  const [isQuizChecked, setIsQuizChecked] = useState(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState("");

  const activeCard = cards[currentIndex];
  const isQuizCard = activeCard && (currentIndex + 1) % 5 === 0 && !activeCard.isMastered;
  const progress = cards.length > 0 ? currentIndex / cards.length : 0;

  const handleSwipeRight = () => {
    setCards(prev => {
      const updated = [...prev];
      updated[currentIndex] = { ...updated[currentIndex], isMastered: true, scoreRecall: 100, scoreRetention: 100 };
      return updated;
    });
    setQuizInput(""); setIsQuizChecked(false);
    setCurrentIndex(prev => prev + 1);
  };

  const handleSwipeLeft = async () => {
    setIsLoading(true);
    try {
      const simpler = await llmService.simplifyConcept(activeCard);
      setCards(prev => {
        const updated = [...prev];
        updated[currentIndex] = { ...updated[currentIndex], concept: simpler, scoreRetention: Math.max(0, (updated[currentIndex].scoreRetention ?? 50) - 10) };
        return updated;
      });
    } catch {}
    setIsLoading(false);
    setCurrentIndex(prev => prev + 1);
  };

  const handleCheckQuiz = async () => {
    if (!quizInput.trim()) return;
    setIsLoading(true);
    try {
      const result = await llmService.evaluateQuizAnswer(activeCard, quizInput);
      setIsQuizCorrect(result.correct);
      setQuizFeedback(result.feedback);
      setIsQuizChecked(true);
      if (result.correct) {
        setCards(prev => {
          const updated = [...prev];
          updated[currentIndex] = { ...updated[currentIndex], scoreTransfer: 100 };
          return updated;
        });
      }
    } catch {
      setIsQuizChecked(true);
      setIsQuizCorrect(false);
      setQuizFeedback("Could not evaluate. Try again.");
    }
    setIsLoading(false);
  };

  const handleNextAfterQuiz = () => {
    setQuizInput(""); setIsQuizChecked(false); setIsQuizCorrect(false); setQuizFeedback("");
    setCurrentIndex(prev => prev + 1);
  };

  const masteredCount = cards.filter(c => c.isMastered).length;

  if (!activeCard || currentIndex >= cards.length) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />
        <View style={styles.completedContainer}>
          <Text style={styles.completedEmoji}>🏆</Text>
          <Text style={styles.completedTitle}>Deck Complete!</Text>
          <Text style={styles.completedSub}>You mastered {masteredCount} of {cards.length} concepts</Text>
          <View style={styles.completedStats}>
            <View style={styles.completedStat}>
              <Text style={styles.completedStatVal}>{masteredCount}</Text>
              <Text style={styles.completedStatLabel}>MASTERED</Text>
            </View>
            <View style={styles.completedStat}>
              <Text style={[styles.completedStatVal, { color: theme.colors.success }]}>{Math.round((masteredCount / cards.length) * 100)}%</Text>
              <Text style={styles.completedStatLabel}>SCORE</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← Back to Decks</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBack}>
          <Text style={styles.headerBackText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{deck.title}</Text>
        <TouchableOpacity onPress={() => onVoiceChallenge(currentIndex)} style={styles.voiceBtn}>
          <Text style={styles.voiceBtnText}>🎙️</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{currentIndex + 1} / {cards.length}</Text>
      </View>

      {/* Stats Strip */}
      <View style={styles.statsStrip}>
        <Text style={styles.statChip}>✅ {masteredCount} mastered</Text>
        <Text style={styles.statChip}>⚡ {currentIndex + 1} seen</Text>
      </View>

      {/* Card */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>NPU Processing...</Text>
        </View>
      ) : isQuizCard ? (
        <KeyboardAvoidingView style={styles.quizWrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.quizCard}>
            <View style={styles.quizBadge}><Text style={styles.quizBadgeText}>🎯 QUIZ TIME</Text></View>
            <Text style={styles.quizQ}>{activeCard.quizQuestion || `Explain the concept: "${activeCard.concept.slice(0, 80)}..."`}</Text>
            {!isQuizChecked ? (
              <>
                <TextInput
                  style={styles.quizInput}
                  placeholder="Type your answer here..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={quizInput}
                  onChangeText={setQuizInput}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <TouchableOpacity style={[styles.submitBtn, { opacity: quizInput.trim() ? 1 : 0.5 }]} onPress={handleCheckQuiz} disabled={!quizInput.trim()}>
                  <Text style={styles.submitBtnText}>Check Answer ⚡</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={[styles.feedbackCard, { borderColor: isQuizCorrect ? theme.colors.success : theme.colors.danger }]}>
                <Text style={styles.feedbackEmoji}>{isQuizCorrect ? "✅" : "❌"}</Text>
                <Text style={[styles.feedbackTitle, { color: isQuizCorrect ? theme.colors.success : theme.colors.danger }]}>
                  {isQuizCorrect ? "Correct!" : "Not quite"}
                </Text>
                <Text style={styles.feedbackText}>{quizFeedback}</Text>
                <TouchableOpacity style={[styles.nextBtn, { backgroundColor: isQuizCorrect ? theme.colors.success : theme.colors.primary }]} onPress={handleNextAfterQuiz}>
                  <Text style={styles.nextBtnText}>{isQuizCorrect ? "Continue →" : "Try Next Card →"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      ) : (
        <SwipeCard
          card={activeCard}
          isTop={true}
          onSwipeLeft={() => { handleSwipeLeft(); }}
          onSwipeRight={handleSwipeRight}
          onVoiceLoop={() => onVoiceChallenge(currentIndex)}
        />
      )}

      {/* Swipe hints */}
      {!isQuizCard && !isLoading && (
        <View style={styles.hintsRow}>
          <View style={styles.hintLeft}><Text style={styles.hintText}>← Simplify</Text></View>
          <View style={styles.hintRight}><Text style={styles.hintText}>Got it! →</Text></View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 },
  headerBack: { paddingRight: 12 },
  headerBackText: { color: theme.colors.primary, fontSize: 15, fontWeight: "700" },
  headerTitle: { flex: 1, color: theme.colors.textPrimary, fontSize: 15, fontWeight: "700", textAlign: "center" },
  voiceBtn: { paddingLeft: 12 },
  voiceBtnText: { fontSize: 22 },
  progressWrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 8, gap: 10 },
  progressBg: { flex: 1, height: 6, backgroundColor: theme.colors.cardBorder, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: theme.colors.primary, borderRadius: 3 },
  progressText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", minWidth: 48, textAlign: "right" },
  statsStrip: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  statChip: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: "600" },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 12, fontWeight: "600" },
  quizWrap: { flex: 1, padding: 16 },
  quizCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl,
    borderWidth: 1.5, borderColor: theme.colors.accent, padding: 20,
  },
  quizBadge: {
    alignSelf: "flex-start", backgroundColor: theme.colors.accentGlow,
    borderRadius: theme.borderRadius.full, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 14,
  },
  quizBadgeText: { color: theme.colors.accent, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  quizQ: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: "700", lineHeight: 26, marginBottom: 16 },
  quizInput: {
    borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: theme.borderRadius.md,
    color: theme.colors.textPrimary, fontSize: 15, padding: 12,
    backgroundColor: theme.colors.background, minHeight: 90, marginBottom: 14,
  },
  submitBtn: { backgroundColor: theme.colors.accent, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: "center" },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  feedbackCard: { borderWidth: 1.5, borderRadius: theme.borderRadius.lg, padding: 16, alignItems: "center" },
  feedbackEmoji: { fontSize: 32, marginBottom: 8 },
  feedbackTitle: { fontSize: 18, fontWeight: "900", marginBottom: 8 },
  feedbackText: { color: theme.colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 16 },
  nextBtn: { borderRadius: theme.borderRadius.md, paddingVertical: 12, paddingHorizontal: 24, alignItems: "center" },
  nextBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  hintsRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 16 },
  hintLeft: { backgroundColor: theme.colors.dangerBg, borderRadius: theme.borderRadius.full, paddingHorizontal: 16, paddingVertical: 6 },
  hintRight: { backgroundColor: theme.colors.successBg, borderRadius: theme.borderRadius.full, paddingHorizontal: 16, paddingVertical: 6 },
  hintText: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary },
  completedContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  completedEmoji: { fontSize: 64, marginBottom: 20 },
  completedTitle: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: "900", marginBottom: 8 },
  completedSub: { color: theme.colors.textSecondary, fontSize: 15, marginBottom: 32, textAlign: "center" },
  completedStats: { flexDirection: "row", gap: 32, marginBottom: 40 },
  completedStat: { alignItems: "center" },
  completedStatVal: { color: theme.colors.primary, fontSize: 36, fontWeight: "900" },
  completedStatLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginTop: 4 },
  backBtn: {
    backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 32, paddingVertical: 14,
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  backBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});