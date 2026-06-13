import React, { useState } from 'react';
import { StyleSheet, View, Text, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { theme } from '../styles/theme';
import { ConceptCard } from '../services/llmService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

interface SwipeCardProps {
  card: ConceptCard;
  isTop: boolean;
  onSwipeLeft: () => void;  // Simplify
  onSwipeRight: () => void; // Mastered/Got it
  onVoiceLoop: () => void;  // Go to voice Feynman mode
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  card,
  isTop,
  onSwipeLeft,
  onSwipeRight,
  onVoiceLoop,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Animation shared values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotateCard = useSharedValue(0); // Card flip rotation: 0 to 180

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    rotateCard.value = withSpring(isFlipped ? 0 : 180, { damping: 15 });
  };

  const handleLeftSwipeAction = () => {
    onSwipeLeft();
  };

  const handleRightSwipeAction = () => {
    onSwipeRight();
  };

  // Configure Gesture Handler Pan
  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.2; // Resist vertical movement
    })
    .onEnd((event) => {
      if (event.velocityX < -500 || translateX.value < -SWIPE_THRESHOLD) {
        // Fly Left (Simplify)
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 250 }, () => {
          runOnJS(handleLeftSwipeAction)();
        });
      } else if (event.velocityX > 500 || translateX.value > SWIPE_THRESHOLD) {
        // Fly Right (Got it!)
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 250 }, () => {
          runOnJS(handleRightSwipeAction)();
        });
      } else {
        // Snap Back to Center
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
      }
    });

  // Animated styles for swiping
  const swipeStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-8, 0, 8]
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  // Front card flip style
  const frontStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotateY: `${rotateCard.value}deg` }],
      backfaceVisibility: 'hidden',
    };
  });

  // Back card flip style (rotated 180 deg by default)
  const backStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotateY: `${rotateCard.value - 180}deg` }],
      backfaceVisibility: 'hidden',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    };
  });

  // Badge Opacity animations
  const gotItBadgeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [0, SWIPE_THRESHOLD / 2], [0, 1]);
    return { opacity };
  });

  const simplifyBadgeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [-SWIPE_THRESHOLD / 2, 0], [1, 0]);
    return { opacity };
  });

  return (
    <GestureHandlerRootView style={styles.cardContainer}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, swipeStyle]}>
          <TouchableWithoutFeedback onPress={handleFlip}>
            <View style={styles.cardInner}>
              {/* FRONT OF THE CARD */}
              <Animated.View style={[styles.frontCard, frontStyle]}>
                <View style={styles.header}>
                  <Text style={styles.conceptTitle}>{card.concept}</Text>
                  <Text style={styles.cardIndicator}>Tap to flip</Text>
                </View>

                <View style={styles.body}>
                  <Text style={styles.explanationText}>{card.explanation}</Text>
                </View>

                <View style={styles.footer}>
                  <Text style={styles.instructionText}>
                    ← Swipe Left to Simplify   |   Swipe Right to Master →
                  </Text>
                </View>
              </Animated.View>

              {/* BACK OF THE CARD */}
              <Animated.View style={[styles.backCard, backStyle]}>
                <View style={styles.headerBack}>
                  <Text style={styles.conceptTitleBack}>Recall Challenge</Text>
                  <Text style={styles.cardIndicator}>Tap to flip</Text>
                </View>

                <View style={styles.bodyBack}>
                  <Text style={styles.quizLabel}>QUESTION:</Text>
                  <Text style={styles.questionText}>{card.quizQuestion}</Text>

                  <Text style={styles.answerLabel}>ANSWER CONCEPT:</Text>
                  <Text style={styles.answerText}>{card.quizAnswer}</Text>
                </View>

                {/* Socratic Feynman voice loop action */}
                <TouchableWithoutFeedback onPress={onVoiceLoop}>
                  <View style={styles.voiceButton}>
                    <Text style={styles.voiceButtonText}>🎙️ Teach Me Back (Feynman Loop)</Text>
                  </View>
                </TouchableWithoutFeedback>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>

          {/* Swipe Badges */}
          <Animated.View style={[styles.badge, styles.badgeGotIt, gotItBadgeStyle]}>
            <Text style={styles.badgeText}>GOT IT! (MASTER)</Text>
          </Animated.View>

          <Animated.View style={[styles.badge, styles.badgeSimplify, simplifyBadgeStyle]}>
            <Text style={styles.badgeText}>SIMPLIFY (REMIX)</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.55,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
  },
  frontCard: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  backCard: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
    backgroundColor: '#1C263A', // slightly different color for back
    borderRadius: theme.borderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
    paddingBottom: theme.spacing.sm,
  },
  headerBack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
    paddingBottom: theme.spacing.sm,
  },
  conceptTitle: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    maxWidth: '70%',
  },
  conceptTitleBack: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: 'bold',
    maxWidth: '70%',
  },
  cardIndicator: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
  },
  bodyBack: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
  },
  explanationText: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    lineHeight: 32,
    textAlign: 'center',
    fontWeight: '500',
  },
  quizLabel: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  questionText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: theme.spacing.md,
  },
  answerLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  answerText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    paddingTop: theme.spacing.sm,
  },
  instructionText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  voiceButton: {
    backgroundColor: `${theme.colors.accent}22`,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  voiceButtonText: {
    color: theme.colors.accent,
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Swipe indicator badges
  badge: {
    position: 'absolute',
    top: 25,
    borderWidth: 2,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    transform: [{ rotate: '-15deg' }],
  },
  badgeGotIt: {
    right: 25,
    borderColor: theme.colors.success,
    backgroundColor: `${theme.colors.success}33`,
  },
  badgeSimplify: {
    left: 25,
    borderColor: theme.colors.secondary,
    backgroundColor: `${theme.colors.secondary}33`,
    transform: [{ rotate: '15deg' }],
  },
  badgeText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
