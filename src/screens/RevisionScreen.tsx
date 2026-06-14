// src/screens/RevisionScreen.tsx
import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { llmService, Deck, ConceptCard } from '../services/llmService';

interface Props {
  deck: Deck;
  onBack: () => void;
}

export const RevisionScreen: React.FC<Props> = ({ deck, onBack }) => {
  // We revise cards that have either been seen or mastered, or all of them if none are mastered yet.
  const cardsToRevise = deck.cards.filter(c => c.scoreRecall > 0 || c.isMastered);
  const activeCards = cardsToRevise.length > 0 ? cardsToRevise : deck.cards;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizInput, setQuizInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isQuizChecked, setIsQuizChecked] = useState(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState('');
  const [scoreCount, setScoreCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const activeCard = activeCards[currentIndex];

  const handleCheckQuiz = async () => {
    if (!quizInput.trim() || !activeCard) return;
    setIsLoading(true);
    try {
      const result = await llmService.evaluateQuizAnswer(activeCard, quizInput);
      setIsQuizCorrect(result.correct);
      setQuizFeedback(result.feedback);
      setIsQuizChecked(true);
      if (result.correct) {
        setScoreCount(prev => prev + 1);
        // Also update scores in deck
        activeCard.scoreTransfer = 100;
        activeCard.isMastered = true;
        await llmService.updateDeck(deck.id, deck.cards);
      }
    } catch (err) {
      console.log('[Revision] Error checking quiz:', err);
      setIsQuizChecked(true);
      setIsQuizCorrect(false);
      setQuizFeedback('Could not evaluate answer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    setQuizInput('');
    setIsQuizChecked(false);
    setIsQuizCorrect(false);
    setQuizFeedback('');
    
    if (currentIndex + 1 < activeCards.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  if (activeCards.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.completedContainer}>
          <Text style={styles.completedEmoji}>📭</Text>
          <Text style={styles.completedTitle}>No Cards to Revise</Text>
          <Text style={styles.completedSub}>Study this topic's flashcards first before taking the revision quiz.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← Back to Decks</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (quizFinished) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.completedContainer}>
          <Text style={styles.completedEmoji}>🎉</Text>
          <Text style={styles.completedTitle}>Revision Complete!</Text>
          <Text style={styles.completedSub}>
            You scored {scoreCount} out of {activeCards.length} correct.
          </Text>
          
          <View style={styles.completedStats}>
            <View style={styles.completedStat}>
              <Text style={styles.completedStatVal}>{scoreCount}</Text>
              <Text style={styles.completedStatLabel}>CORRECT</Text>
            </View>
            <View style={styles.completedStat}>
              <Text style={[styles.completedStatVal, { color: theme.colors.success }]}>
                {Math.round((scoreCount / activeCards.length) * 100)}%
              </Text>
              <Text style={styles.completedStatLabel}>ACCURACY</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← Finish Revision</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBack}>
          <Text style={styles.headerBackText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Revise: {deck.title}</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${((currentIndex + 1) / activeCards.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{currentIndex + 1} / {activeCards.length}</Text>
      </View>

      {/* Main card viewport */}
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.quizCard}>
          <View style={styles.quizBadge}>
            <Text style={styles.quizBadgeText}>🎯 REVISION QUIZ</Text>
          </View>
          
          <Text style={styles.conceptLabel}>Concept: {activeCard?.concept}</Text>
          <Text style={styles.quizQ}>{activeCard?.quizQuestion}</Text>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Evaluating Answer...</Text>
            </View>
          ) : !isQuizChecked ? (
            <>
              <TextInput
                style={styles.quizInput}
                placeholder="Type your answer based on what you learned..."
                placeholderTextColor={theme.colors.textMuted}
                value={quizInput}
                onChangeText={setQuizInput}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <TouchableOpacity 
                style={[styles.submitBtn, { opacity: quizInput.trim() ? 1 : 0.6 }]} 
                onPress={handleCheckQuiz} 
                disabled={!quizInput.trim()}
              >
                <Text style={styles.submitBtnText}>Submit Answer ⚡</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={[styles.feedbackCard, { borderColor: isQuizCorrect ? theme.colors.success : theme.colors.danger }]}>
              <Text style={styles.feedbackEmoji}>{isQuizCorrect ? '✅' : '❌'}</Text>
              <Text style={[styles.feedbackTitle, { color: isQuizCorrect ? theme.colors.success : theme.colors.danger }]}>
                {isQuizCorrect ? 'Correct!' : 'Incorrect'}
              </Text>
              <Text style={styles.feedbackText}>{quizFeedback}</Text>
              
              <View style={styles.correctAnswerWrap}>
                <Text style={styles.correctAnswerLabel}>Reference Answer:</Text>
                <Text style={styles.correctAnswerText}>{activeCard?.quizAnswer}</Text>
              </View>

              <TouchableOpacity 
                style={[styles.nextBtn, { backgroundColor: isQuizCorrect ? theme.colors.success : theme.colors.primary }]} 
                onPress={handleNext}
              >
                <Text style={styles.nextBtnText}>
                  {currentIndex + 1 < activeCards.length ? 'Next Question →' : 'View Summary 🎉'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder
  },
  headerBack: { paddingVertical: 4 },
  headerBackText: { color: theme.colors.primary, fontSize: 16, fontWeight: '700' },
  headerTitle: { flex: 1, color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  
  progressWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginVertical: 12, gap: 10 },
  progressBg: { flex: 1, height: 6, backgroundColor: theme.colors.cardBorder, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 },
  progressText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', minWidth: 44, textAlign: 'right' },
  
  container: { flex: 1, padding: 16 },
  quizCard: {
    backgroundColor: '#FFFFFF', 
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1.5, 
    borderColor: theme.colors.cardBorder, 
    padding: 20,
    ...theme.shadows.sm,
  },
  quizBadge: {
    alignSelf: 'flex-start', 
    backgroundColor: theme.colors.primaryGlow,
    borderRadius: theme.borderRadius.full, 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    marginBottom: 14,
  },
  quizBadgeText: { color: theme.colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  conceptLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  quizQ: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800', lineHeight: 24, marginBottom: 16 },
  
  loadingWrap: { padding: 32, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 12, fontWeight: '600' },
  
  quizInput: {
    borderWidth: 1.5, 
    borderColor: theme.colors.cardBorder, 
    borderRadius: theme.borderRadius.md,
    color: theme.colors.textPrimary, 
    fontSize: 15, 
    padding: 12,
    backgroundColor: theme.colors.surfaceAlt, 
    minHeight: 120, 
    marginBottom: 16,
    lineHeight: 20,
  },
  submitBtn: { 
    backgroundColor: theme.colors.primary, 
    borderRadius: theme.borderRadius.md, 
    paddingVertical: 14, 
    alignItems: 'center',
    ...theme.shadows.primary
  },
  submitBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  
  feedbackCard: { borderWidth: 1.5, borderRadius: theme.borderRadius.lg, padding: 16, alignItems: 'center' },
  feedbackEmoji: { fontSize: 32, marginBottom: 6 },
  feedbackTitle: { fontSize: 18, fontWeight: '900', marginBottom: 6 },
  feedbackText: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 18, marginBottom: 12 },
  
  correctAnswerWrap: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  correctAnswerLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  correctAnswerText: { fontSize: 13, color: theme.colors.textPrimary, fontWeight: '600', lineHeight: 18 },

  nextBtn: { borderRadius: theme.borderRadius.md, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center', width: '100%' },
  nextBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  
  completedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  completedEmoji: { fontSize: 64, marginBottom: 16 },
  completedTitle: { color: theme.colors.textPrimary, fontSize: 26, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  completedSub: { color: theme.colors.textSecondary, fontSize: 15, marginBottom: 28, textAlign: 'center', lineHeight: 20 },
  completedStats: { flexDirection: 'row', gap: 32, marginBottom: 32 },
  completedStat: { alignItems: 'center' },
  completedStatVal: { color: theme.colors.primary, fontSize: 32, fontWeight: '900' },
  completedStatLabel: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },
  backBtn: {
    backgroundColor: theme.colors.primary, 
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 28, 
    paddingVertical: 14,
    ...theme.shadows.primary
  },
  backBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
