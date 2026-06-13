import React, { useState, useRef } from 'react';
import {
  StyleSheet, View, Text, Dimensions,
  Animated, PanResponder, TouchableOpacity,
} from 'react-native';
import { theme } from '../styles/theme';
import { ConceptCard } from '../services/llmService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

interface SwipeCardProps {
  card: ConceptCard;
  isTop: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onVoiceLoop: () => void;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  card, isTop, onSwipeLeft, onSwipeRight, onVoiceLoop,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;
  const flipAnim = useRef(new Animated.Value(0)).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });

  const gotItOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD / 2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const simplifyOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD / 2, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const frontRotateY = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backRotateY = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const handleFlip = () => {
    const toValue = isFlipped ? 0 : 180;
    Animated.spring(flipAnim, { toValue, friction: 8, useNativeDriver: true }).start();
    setIsFlipped(!isFlipped);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onMoveShouldSetPanResponder: (_, gs) => isTop && Math.abs(gs.dx) > 5,
      onPanResponderMove: (_, gs) => {
        position.setValue({ x: gs.dx, y: gs.dy * 0.2 });
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.vx < -0.5 || gs.dx < -SWIPE_THRESHOLD) {
          Animated.timing(position, {
            toValue: { x: -SCREEN_WIDTH * 1.5, y: gs.dy },
            duration: 250,
            useNativeDriver: true,
          }).start(() => { position.setValue({ x: 0, y: 0 }); onSwipeLeft(); });
        } else if (gs.vx > 0.5 || gs.dx > SWIPE_THRESHOLD) {
          Animated.timing(position, {
            toValue: { x: SCREEN_WIDTH * 1.5, y: gs.dy },
            duration: 250,
            useNativeDriver: true,
          }).start(() => { position.setValue({ x: 0, y: 0 }); onSwipeRight(); });
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] },
      ]}
      {...panResponder.panHandlers}
    >
      {/* GOT IT badge */}
      <Animated.View style={[styles.badge, styles.badgeGotIt, { opacity: gotItOpacity }]}>
        <Text style={styles.badgeText}>GOT IT!</Text>
      </Animated.View>

      {/* SIMPLIFY badge */}
      <Animated.View style={[styles.badge, styles.badgeSimplify, { opacity: simplifyOpacity }]}>
        <Text style={styles.badgeText}>SIMPLIFY</Text>
      </Animated.View>

      {/* FRONT */}
      <Animated.View
        style={[
          styles.face, styles.front,
          { transform: [{ rotateY: frontRotateY }] },
        ]}
        pointerEvents={isFlipped ? 'none' : 'auto'}
      >
        <TouchableOpacity style={styles.faceInner} onPress={handleFlip} activeOpacity={1}>
          <View style={styles.faceHeader}>
            <Text style={styles.conceptTitle}>{card.concept}</Text>
            <Text style={styles.flipHint}>Tap to flip</Text>
          </View>
          <View style={styles.faceBody}>
            <Text style={styles.explanationText}>{card.explanation}</Text>
          </View>
          <View style={styles.faceFooter}>
            <Text style={styles.instructionText}>← Simplify   |   Got it! →</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* BACK */}
      <Animated.View
        style={[
          styles.face, styles.back,
          { transform: [{ rotateY: backRotateY }] },
        ]}
        pointerEvents={isFlipped ? 'auto' : 'none'}
      >
        <TouchableOpacity style={styles.faceInner} onPress={handleFlip} activeOpacity={1}>
          <View style={styles.faceHeader}>
            <Text style={[styles.conceptTitle, { color: theme.colors.accent }]}>Recall Challenge</Text>
            <Text style={styles.flipHint}>Tap to flip</Text>
          </View>
          <View style={styles.faceBody}>
            <Text style={styles.quizLabel}>QUESTION:</Text>
            <Text style={styles.questionText}>{card.quizQuestion}</Text>
            <Text style={styles.answerLabel}>ANSWER:</Text>
            <Text style={styles.answerText}>{card.quizAnswer}</Text>
          </View>
          <TouchableOpacity style={styles.voiceButton} onPress={onVoiceLoop}>
            <Text style={styles.voiceButtonText}>🎙️ Teach Me Back (Feynman Loop)</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.55,
    alignSelf: 'center',
  },
  face: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    backfaceVisibility: 'hidden',
    overflow: 'hidden',
  },
  front: {
    backgroundColor: theme.colors.cardBackground,
  },
  back: {
    backgroundColor: '#1C263A',
  },
  faceInner: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  faceHeader: {
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
  flipHint: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  faceBody: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
  },
  faceFooter: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    paddingTop: theme.spacing.sm,
  },
  explanationText: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    lineHeight: 32,
    textAlign: 'center',
    fontWeight: '500',
  },
  instructionText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
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
  badge: {
    position: 'absolute',
    top: 25,
    zIndex: 10,
    borderWidth: 2,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  badgeGotIt: {
    right: 25,
    borderColor: theme.colors.success,
    backgroundColor: `${theme.colors.success}33`,
    transform: [{ rotate: '-15deg' }],
  },
  badgeSimplify: {
    left: 25,
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}33`,
    transform: [{ rotate: '15deg' }],
  },
  badgeText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
