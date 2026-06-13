import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { theme } from '../styles/theme';
import { RadarChart } from '../components/RadarChart';
import { llmService, Deck } from '../services/llmService';

interface DashboardScreenProps {
  onSelectDeck: (deck: Deck) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onSelectDeck }) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customTitle, setCustomTitle] = useState('');
  const [customText, setCustomText] = useState('');
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);

  // Load decks on mount
  useEffect(() => {
    const loadInitialData = async () => {
      await llmService.loadModel();
      const loadedDecks = await llmService.getDecks();
      setDecks(loadedDecks);
      setIsLoading(false);
    };
    loadInitialData();
  }, []);

  // Compute overall average mastery metrics
  const getOverallMetrics = () => {
    let totalRecall = 0;
    let totalRetention = 0;
    let totalTransfer = 0;
    let totalCards = 0;

    decks.forEach(deck => {
      deck.cards.forEach(card => {
        totalRecall += card.scoreRecall;
        totalRetention += card.scoreRetention;
        totalTransfer += card.scoreTransfer;
        totalCards++;
      });
    });

    if (totalCards === 0) return { recall: 0, retention: 0, transfer: 0, masteredCount: 0, totalCards: 0 };

    return {
      recall: totalRecall / totalCards,
      retention: totalRetention / totalCards,
      transfer: totalTransfer / totalCards,
      masteredCount: decks.reduce((acc, d) => acc + d.cards.filter(c => c.isMastered).length, 0),
      totalCards,
    };
  };

  const handleCreateCustomDeck = async () => {
    if (!customText.trim()) return;

    setIsProcessingDoc(true);
    try {
      const newDeck = await llmService.generateCardsFromText(
        customTitle || 'Custom Syllabus Feed',
        customText
      );
      setDecks(prev => [newDeck, ...prev]);
      setCustomTitle('');
      setCustomText('');
    } catch (e) {
      console.error('Failed to parse text', e);
    } finally {
      setIsProcessingDoc(false);
    }
  };

  const metrics = getOverallMetrics();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Initializing On-Device NPU Environment...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.logoText}>Flow<Text style={{ color: theme.colors.primary }}>Deck</Text></Text>
          <Text style={styles.subtitleText}>Gen-Z Active Mastery AI Tutor</Text>
        </View>

        {/* Radar Chart Dashboard Section */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Syllabus Mastery Map</Text>
          <Text style={styles.progressSubtext}>
            Mastered {metrics.masteredCount} of {metrics.totalCards} concepts globally
          </Text>
          
          <View style={styles.radarContainer}>
            <RadarChart
              scoreRecall={metrics.recall}
              scoreRetention={metrics.retention}
              scoreTransfer={metrics.transfer}
              size={220}
            />
          </View>
        </View>

        {/* Decks Listing Section */}
        <View style={styles.decksSection}>
          <Text style={styles.sectionTitle}>Your Study Decks</Text>
          
          {decks.map(deck => {
            const masteredCount = deck.cards.filter(c => c.isMastered).length;
            const progressPercent = Math.round((masteredCount / deck.cards.length) * 100);

            return (
              <TouchableOpacity
                key={deck.id}
                style={styles.deckItem}
                onPress={() => onSelectDeck(deck)}
              >
                <View style={styles.deckInfo}>
                  <Text style={styles.deckTitle}>{deck.title}</Text>
                  <Text style={styles.deckMeta}>
                    {deck.cards.length} cards  |  {masteredCount} mastered
                  </Text>
                </View>
                
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent || 5}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{progressPercent}%</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Office Kit Import Pipeline Simulation */}
        <View style={styles.importCard}>
          <Text style={styles.sectionTitle}>📥 Office Kit Import Pipeline</Text>
          <Text style={styles.importSubtext}>
            Simulate dropping a lecture PDF or web syllabus into the folder:
          </Text>

          <TextInput
            placeholder="Document Title (e.g. Gravitation Part 2)"
            placeholderTextColor={theme.colors.textMuted}
            value={customTitle}
            onChangeText={setCustomTitle}
            style={styles.inputTitle}
          />

          <TextInput
            placeholder="Paste syllabus text, lecture notes, or key definitions here..."
            placeholderTextColor={theme.colors.textMuted}
            value={customText}
            onChangeText={setCustomText}
            multiline
            numberOfLines={4}
            style={styles.inputBody}
          />

          {isProcessingDoc ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: theme.spacing.md }} />
          ) : (
            <TouchableOpacity
              style={[
                styles.importButton,
                { opacity: customText.trim() ? 1 : 0.6 }
              ]}
              onPress={handleCreateCustomDeck}
              disabled={!customText.trim()}
            >
              <Text style={styles.importButtonText}>Atomize & Generate Cards (NPU local)</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  logoText: {
    color: theme.colors.textPrimary,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitleText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: theme.spacing.xs,
  },
  statsCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressSubtext: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  decksSection: {
    marginBottom: theme.spacing.lg,
  },
  deckItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  deckInfo: {
    flex: 1,
  },
  deckTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  deckMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  progressContainer: {
    alignItems: 'flex-end',
    width: 80,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.cardBorder,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  progressText: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  importCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  importSubtext: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  inputTitle: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1.5,
    borderRadius: theme.borderRadius.sm,
    color: theme.colors.textPrimary,
    fontSize: 14,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    fontWeight: '500',
  },
  inputBody: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1.5,
    borderRadius: theme.borderRadius.sm,
    color: theme.colors.textPrimary,
    fontSize: 14,
    padding: theme.spacing.sm,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.md,
    fontWeight: '500',
  },
  importButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  importButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
