import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../styles/theme';
import { SwipeCard } from '../components/SwipeCard';
import { llmService, Deck, ConceptCard } from '../services/llmService';

interface SwipeScreenProps {
  deck: Deck;
  onGoBack: () => void;
  onVoiceLaunch: (card: ConceptCard, onComplete: (score: number) => void) => void;
}

export const SwipeScreen: React.FC<SwipeScreenProps> = ({ deck, onGoBack, onVoiceLaunch }) => {
  const [cards, setCards] = useState<ConceptCard[]>([...deck.cards]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [quizInput, setQuizInput] = useState('');
  const [isQuizChecked, setIsQuizChecked] = useState(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState('');

  const activeCard = cards[currentIndex];

  // Helper: check if the card is a Gating Quiz (every 5th card index: 4, 9, 14...)
  const isQuizCard = activeCard && (currentIndex + 1) % 5 === 0 && !activeCard.isMastered;

  const handleSwipeRight = () => {
    // Mark card as mastered and set recall score to 100%
    setCards(prev => {
      const updated = [...prev];
      updated[currentIndex] = {
        ...updated[currentIndex],
        isMastered: true,
        scoreRecall: 100,
        scoreRetention: 100,
      };
      return updated;
    });

    // Reset quiz states
    setQuizInput('');
    setIsQuizChecked(false);
    
    // Advance index
    setCurrentIndex(prev => prev + 1);
  };

  const handleSwipeLeft = async () => {
    setIsLoading(true);
    try {
      // Call LLM simplification service
      const simplified = await llmService.simplifyExplanation(
        activeCard.concept,
        activeCard.explanation
      );

      // Update card explanation locally
      setCards(prev => {
        const updated = [...prev];
        updated[currentIndex] = {
          ...updated[currentIndex],
          explanation: simplified,
        };
        return updated;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunchVoiceLoop = () => {
    onVoiceLaunch(activeCard, (score) => {
      // Callback after voice Feynman loop completes
      setCards(prev => {
        const updated = [...prev];
        updated[currentIndex] = {
          ...updated[currentIndex],
          scoreTransfer: score,
          isMastered: score >= 70, // Mastered if Socratic score is >= 70%
        };
        return updated;
      });
      
      // Auto advance after short delay
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 1500);
    });
  };

  const checkQuizAnswer = async () => {
    if (!quizInput.trim()) return;

    setIsLoading(true);
    try {
      const isCorrect = await llmService.validateQuizAnswer(
        activeCard.quizQuestion,
        activeCard.quizAnswer,
        quizInput
      );

      setIsQuizChecked(true);
      setIsQuizCorrect(isCorrect);

      if (isCorrect) {
        setQuizFeedback('Correct! Swipe Right to unlock the next chapter.');
      } else {
        setQuizFeedback('Incorrect! Triggering Friction Gradient re-explanation...');
        
        // Friction Gradient: Reset the last 3 cards and simplify them!
        setTimeout(async () => {
          const startIndex = Math.max(0, currentIndex - 3);
          const updatedCards = [...cards];
          
          for (let i = startIndex; i <= currentIndex; i++) {
            const cardToSimplify = updatedCards[i];
            const simplified = await llmService.simplifyExplanation(
              cardToSimplify.concept,
              cardToSimplify.explanation
            );
            updatedCards[i] = {
              ...cardToSimplify,
              explanation: simplified,
              isMastered: false, // reset mastery so they re-review
              scoreRecall: 30,   // lower scores
            };
          }
          
          setCards(updatedCards);
          setCurrentIndex(startIndex); // bounce them back to review
          setQuizInput('');
          setIsQuizChecked(false);
        }, 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const isDeckCompleted = currentIndex >= cards.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕ Close</Text>
        </TouchableOpacity>
        <Text style={styles.deckTitle} numberOfLines={1}>{deck.title}</Text>
        <Text style={styles.progressCounter}>
          {isDeckCompleted ? cards.length : currentIndex + 1} / {cards.length}
        </Text>
      </View>

      {/* Main Screen Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <View style={styles.content}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Simplifying Concept on NPU...</Text>
            </View>
          )}

          {isDeckCompleted ? (
            /* Completed Deck Screen */
            <View style={styles.completedContainer}>
              <Text style={styles.completedEmoji}>🏆</Text>
              <Text style={styles.completedTitle}>Syllabus Block Completed!</Text>
              <Text style={styles.completedText}>
                You have processed all concepts in this deck. Your mastery score has updated on the Dashboard.
              </Text>
              <TouchableOpacity onPress={onGoBack} style={styles.returnButton}>
                <Text style={styles.returnButtonText}>Return to Dashboard</Text>
              </TouchableOpacity>
            </View>
          ) : isQuizCard ? (
            /* Gating Quiz Screen */
            <View style={styles.quizCard}>
              <View style={styles.quizHeader}>
                <Text style={styles.quizBadge}>🔒 GATING QUIZ</Text>
                <Text style={styles.quizSubtext}>Verify your recall to unlock the next cards</Text>
              </View>

              <View style={styles.quizBody}>
                <Text style={styles.quizLabel}>QUESTION:</Text>
                <Text style={styles.questionText}>{activeCard.quizQuestion}</Text>

                <TextInput
                  placeholder="Type your answer here..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={quizInput}
                  onChangeText={setQuizInput}
                  style={styles.quizInput}
                  editable={!isQuizChecked}
                />

                {isQuizChecked && (
                  <View style={[
                    styles.feedbackContainer,
                    isQuizCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect
                  ]}>
                    <Text style={[
                      styles.feedbackText,
                      isQuizCorrect ? { color: theme.colors.success } : { color: theme.colors.error }
                    ]}>
                      {quizFeedback}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.quizFooter}>
                {!isQuizChecked ? (
                  <TouchableOpacity
                    style={[styles.checkButton, { opacity: quizInput.trim() ? 1 : 0.6 }]}
                    onPress={checkQuizAnswer}
                    disabled={!quizInput.trim()}
                  >
                    <Text style={styles.checkButtonText}>Submit Answer (Local Verification)</Text>
                  </TouchableOpacity>
                ) : isQuizCorrect ? (
                  <TouchableOpacity style={styles.unlockedButton} onPress={handleSwipeRight}>
                    <Text style={styles.unlockedButtonText}>Unlock Feed →</Text>
                  </TouchableOpacity>
                ) : (
                  <ActivityIndicator size="small" color={theme.colors.error} />
                )}
              </View>
            </View>
          ) : (
            /* Regular Active Swipe Card */
            <View style={styles.cardWrapper}>
              <SwipeCard
                card={activeCard}
                isTop={true}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                onVoiceLoop={handleLaunchVoiceLoop}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1.5,
    borderColor: theme.colors.cardBorder,
  },
  backButton: {
    paddingVertical: theme.spacing.xs,
  },
  backButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  deckTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    maxWidth: '55%',
  },
  progressCounter: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: theme.spacing.md,
  },
  // Gating Quiz Cards layout
  quizCard: {
    width: '100%',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
    height: '75%',
  },
  quizHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
    paddingBottom: theme.spacing.sm,
  },
  quizBadge: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  quizSubtext: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: theme.spacing.xs,
  },
  quizBody: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: theme.spacing.md,
  },
  quizLabel: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  questionText: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '500',
    marginBottom: theme.spacing.lg,
  },
  quizInput: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1.5,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.textPrimary,
    fontSize: 15,
    padding: theme.spacing.md,
    fontWeight: '500',
  },
  feedbackContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
  },
  feedbackCorrect: {
    borderColor: theme.colors.success,
    backgroundColor: `${theme.colors.success}11`,
  },
  feedbackIncorrect: {
    borderColor: theme.colors.error,
    backgroundColor: `${theme.colors.error}11`,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  quizFooter: {
    paddingTop: theme.spacing.sm,
  },
  checkButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  checkButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  unlockedButton: {
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  unlockedButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Completed Screen
  completedContainer: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  completedEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  completedTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  completedText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  returnButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  returnButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
