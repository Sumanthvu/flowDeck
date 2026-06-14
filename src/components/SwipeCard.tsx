// src/components/SwipeCard.tsx — FlowDeck Reel Card
import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, View, Text, Dimensions,
  Animated, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import Tts from 'react-native-tts';
import { theme } from '../styles/theme';
import { ConceptCard } from '../services/llmService';

try {
  Tts.setDefaultLanguage('en-US');
  Tts.setDefaultRate(0.5);
} catch (_) {}

const { width: W } = Dimensions.get('window');

interface Props {
  card: ConceptCard;
  isTop: boolean;
  isLoading?: boolean;
  onVoiceLoop: () => void;
  height: number;
  cardIndex: number;      // 1-based display number
  totalCards: number;
}

export const SwipeCard: React.FC<Props> = ({
  card, isTop, isLoading = false, onVoiceLoop, height, cardIndex, totalCards,
}) => {
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { try { Tts.stop(); } catch (_) {} }, [card.id]);

  const speak = (txt: string) => { try { Tts.stop(); Tts.speak(txt); } catch (_) {} };

  const frontRY = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backRY  = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });

  const doFlip = () => {
    Animated.spring(flipAnim, { toValue: flipped ? 0 : 180, friction: 8, useNativeDriver: true }).start();
    setFlipped(f => !f);
  };

  // Build title from card concept, e.g. "Newton's 1st Law — Explanation"
  const cardTitle    = card.concept;
  const cardSubtitle = `Card ${cardIndex} of ${totalCards}`;

  return (
    <View style={[styles.wrap, { height: height - 120 }]}>

      {/* ── FRONT ───────────────────────────────────────────────────────── */}
      <Animated.View
        style={[styles.face, styles.front, { transform: [{ rotateY: frontRY }] }]}
        pointerEvents={flipped ? 'none' : 'auto'}
      >
        <TouchableOpacity style={styles.inner} onPress={doFlip} activeOpacity={1}>

          {/* Card header */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.conceptTag}>
                <Text style={styles.conceptTagText} numberOfLines={1}>{cardTitle}</Text>
              </View>
              <Text style={styles.subtitleText}>{cardSubtitle}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.speakBtn}
                onPress={e => { e.stopPropagation(); speak(card.explanation); }}
              >
                <Text style={{ fontSize: 15 }}>🔊</Text>
              </TouchableOpacity>
              <Text style={styles.flipHintText}>Tap to flip</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Body — explanation */}
          <View style={styles.cardBody}>
            <Text style={styles.sectionLabel}>EXPLANATION</Text>
            {isLoading ? (
              <View style={styles.skeletonWrap}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.skeletonText}>Simplifying explanation...</Text>
              </View>
            ) : (
              <Text style={styles.explanationText}>{card.explanation}</Text>
            )}
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.masteredBadge}>
              {card.isMastered && <Text style={styles.masteredText}>✅ Mastered</Text>}
            </View>
            <Text style={styles.flipCta}>Tap to see Recall Challenge →</Text>
          </View>

        </TouchableOpacity>
      </Animated.View>

      {/* ── BACK ────────────────────────────────────────────────────────── */}
      <Animated.View
        style={[styles.face, styles.back, { transform: [{ rotateY: backRY }] }]}
        pointerEvents={flipped ? 'auto' : 'none'}
      >
        <TouchableOpacity style={styles.inner} onPress={doFlip} activeOpacity={1}>

          {/* Card header */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={[styles.conceptTag, { backgroundColor: theme.colors.accentLight, borderColor: theme.colors.accent }]}>
                <Text style={[styles.conceptTagText, { color: theme.colors.accent }]} numberOfLines={1}>Recall Challenge</Text>
              </View>
              <Text style={styles.subtitleText}>{cardTitle}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.speakBtn}
                onPress={e => { e.stopPropagation(); speak(`Question: ${card.quizQuestion}. Answer: ${card.quizAnswer}`); }}
              >
                <Text style={{ fontSize: 15 }}>🔊</Text>
              </TouchableOpacity>
              <Text style={styles.flipHintText}>Tap to flip</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardBody}>
            <Text style={[styles.sectionLabel, { color: theme.colors.accent }]}>QUESTION</Text>
            <Text style={styles.questionText}>{card.quizQuestion}</Text>

            <View style={styles.answerBox}>
              <Text style={styles.answerLabel}>✅ ANSWER</Text>
              <Text style={styles.answerText}>{card.quizAnswer}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.voiceBtn} onPress={onVoiceLoop}>
            <Text style={styles.voiceBtnText}>🎙️ Teach Me Back (Voice Test)</Text>
          </TouchableOpacity>

        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: W - 24, alignSelf: 'center', position: 'relative' },

  face: {
    position: 'absolute', width: '100%', height: '100%',
    borderRadius: 18, backfaceVisibility: 'hidden', overflow: 'hidden',
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    ...theme.shadows.md,
  },
  front: { backgroundColor: '#FFFFFF' },
  back:  { backgroundColor: '#FAFAFA' },

  inner: { flex: 1, padding: 18, justifyContent: 'space-between' },

  // Header
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: { flex: 1, marginRight: 8 },
  headerRight: { alignItems: 'flex-end', gap: 6 },

  conceptTag: {
    alignSelf: 'flex-start', backgroundColor: theme.colors.primaryLight,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,107,53,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 4,
  },
  conceptTagText: { fontSize: 12, fontWeight: '800', color: theme.colors.primary },
  subtitleText: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '500' },

  speakBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1, borderColor: 'rgba(255,107,53,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  flipHintText: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '600' },

  divider: { height: 1, backgroundColor: theme.colors.separator, marginVertical: 12 },

  // Body
  cardBody: { flex: 1 },
  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: theme.colors.primary,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },

  skeletonWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  skeletonText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },

  explanationText: {
    fontSize: 17, fontWeight: '600', color: theme.colors.textPrimary,
    lineHeight: 26, textAlign: 'left',
  },

  // Footer
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.separator },
  masteredBadge: {},
  masteredText: { fontSize: 12, fontWeight: '700', color: theme.colors.success },
  flipCta: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600' },

  // Back face
  questionText: {
    fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary,
    lineHeight: 24, marginBottom: 16,
  },
  answerBox: {
    backgroundColor: theme.colors.accentLight, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: 'rgba(0,168,150,0.15)',
  },
  answerLabel: { fontSize: 10, fontWeight: '800', color: theme.colors.accent, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  answerText:  { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, lineHeight: 20 },

  voiceBtn: {
    backgroundColor: theme.colors.accent, borderRadius: 12, paddingVertical: 13,
    alignItems: 'center', ...theme.shadows.accent,
  },
  voiceBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
