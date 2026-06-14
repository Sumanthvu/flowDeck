// src/screens/VoiceScreen.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { theme } from '../styles/theme';
import { ConceptCard, llmService } from '../services/llmService';
import { whisperService } from '../services/whisperService';

interface VoiceScreenProps {
  card: ConceptCard;
  onGoBack: () => void;
  onFeedbackComplete: (score: number) => void;
}

export const VoiceScreen: React.FC<VoiceScreenProps> = ({
  card,
  onGoBack,
  onFeedbackComplete,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Processing speech transcript & grading locally...');
  const [transcript, setTranscript] = useState('');
  const [gradeResult, setGradeResult] = useState<{
    grade: 'A' | 'B' | 'C' | 'F';
    feedback: string;
    score: number;
  } | null>(null);

  const handleStartRecording = async () => {
    setGradeResult(null);
    setTranscript('');

    const isDownloaded = await whisperService.isModelDownloaded();
    if (!isDownloaded) {
      setIsLoading(true);
      setLoadingText('Downloading Voice Model (~75MB)...');
      const loaded = await whisperService.loadModel((progress, text) => {
        setLoadingText(`${text}`);
      });
      setIsLoading(false);
      if (!loaded) {
        console.log('[VoiceScreen] Whisper model download/load failed');
        return;
      }
    }
    
    const success = await whisperService.startRecording((seconds) => {
      setRecordDuration(seconds);
    });
    
    if (success) {
      setIsRecording(true);
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    setIsLoading(true);
    setLoadingText('Processing speech transcript & grading locally...');
    
    try {
      const audioPath = await whisperService.stopRecording();
      if (!audioPath) {
        throw new Error("Could not capture recorded audio data.");
      }
      const text = await whisperService.transcribeAudio(audioPath, card.concept);
      setTranscript(text);
      
      const grading = await llmService.gradeExplanation(card, text);
      setGradeResult(grading);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "An error occurred during audio processing.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateAnswer = async (type: 'best' | 'weak') => {
    setGradeResult(null);
    setIsLoading(true);

    const text = type === 'best' 
      ? `Newton's third law says action forces are equal and opposite to reaction forces and they always act on different objects. Like a rocket engine pushing down and accelerating up.`
      : `Basically things push back. If you hit a table it hits you back.`;

    setTimeout(async () => {
      setTranscript(text);
      try {
        const grading = await llmService.gradeExplanation(card, text);
        setGradeResult(grading);
      } catch (err) {
        console.log('[VoiceScreen] Simulation grading error:', err);
      }
      setIsLoading(false);
    }, 1000);
  };

  const handleSaveMasteryScore = () => {
    if (gradeResult) {
      onFeedbackComplete(gradeResult.score);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.titleText}>Socratic Voice Loop</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Concept Box */}
        <View style={styles.conceptBox}>
          <Text style={styles.conceptLabel}>CONCEPT TO EXPLAIN IN YOUR OWN WORDS:</Text>
          <Text style={styles.conceptTitle}>{card.concept}</Text>
          <Text style={styles.conceptExplanation}>{card.explanation}</Text>
        </View>

        {/* Recording Controller */}
        <View style={styles.audioSection}>
          {isRecording ? (
            <View style={styles.recordingContainer}>
              <View style={styles.pulseContainer}>
                <View style={[styles.pulseLine, styles.pulseLineActive]} />
                <View style={[styles.pulseLine, styles.pulseLineActive, { height: 45 }]} />
                <View style={[styles.pulseLine, styles.pulseLineActive, { height: 60 }]} />
                <View style={[styles.pulseLine, styles.pulseLineActive, { height: 45 }]} />
                <View style={[styles.pulseLine, styles.pulseLineActive]} />
              </View>
              
              <Text style={styles.timerText}>Recording... {recordDuration}s</Text>
              
              <TouchableOpacity onPress={handleStopRecording} style={styles.stopButton}>
                <Text style={styles.stopButtonText}>⏹️ Stop & Grade (Offline)</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.idleContainer}>
              <TouchableOpacity onPress={handleStartRecording} style={styles.recordButton}>
                <Text style={styles.recordButtonText}>🎙️ Tap to Explain (Speak Aloud)</Text>
              </TouchableOpacity>
              <Text style={styles.idleSubtext}>The app will analyze and grade your explanation locally</Text>
            </View>
          )}
        </View>

        {/* Simulations for Testing */}
        {!isRecording && !isLoading && !gradeResult && (
          <View style={styles.simulationCard}>
            <Text style={styles.simTitle}>⚡ Socratic AI Simulation Options</Text>
            <View style={styles.simButtons}>
              <TouchableOpacity
                onPress={() => handleSimulateAnswer('best')}
                style={[styles.simBtn, { backgroundColor: '#E8F5E9', borderColor: '#81C784' }]}
              >
                <Text style={[styles.simBtnText, { color: '#2E7D32' }]}>Simulate A Grade</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSimulateAnswer('weak')}
                style={[styles.simBtn, { backgroundColor: '#FFEBEE', borderColor: '#E57373' }]}
              >
                <Text style={[styles.simBtnText, { color: '#C62828' }]}>Simulate C Grade</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Processing State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        )}

        {/* Grading Results */}
        {gradeResult && !isLoading && (
          <View style={styles.resultsCard}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Socratic Evaluation</Text>
              <View style={[
                styles.gradeBadge,
                gradeResult.grade === 'A' ? styles.badgeA :
                gradeResult.grade === 'B' ? styles.badgeB : styles.badgeF
              ]}>
                <Text style={styles.gradeBadgeText}>Grade {gradeResult.grade}</Text>
              </View>
            </View>

            <View style={styles.resultsBody}>
              <Text style={styles.transcriptLabel}>YOUR SPEECH TRANSCRIPT</Text>
              <Text style={styles.transcriptText}>"{transcript}"</Text>

              <Text style={styles.feedbackLabel}>AI SOCRATIC FEEDBACK</Text>
              <Text style={styles.feedbackText}>{gradeResult.feedback}</Text>

              <View style={styles.progressScoreContainer}>
                <Text style={styles.scoreText}>Concept Mastery Score: {gradeResult.score}%</Text>
              </View>
            </View>

            <TouchableOpacity onPress={handleSaveMasteryScore} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Apply Mastery & Save</Text>
            </TouchableOpacity>
          </View>
        )}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1.2,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.md,
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  titleText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  conceptBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  conceptLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  conceptTitle: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  conceptExplanation: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  audioSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.lg,
  },
  idleContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  recordButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.primary,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  idleSubtext: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.sm,
    fontWeight: '600',
  },
  recordingContainer: {
    alignItems: 'center',
  },
  pulseContainer: {
    flexDirection: 'row',
    height: 80,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  pulseLine: {
    width: 4,
    height: 25,
    backgroundColor: theme.colors.primary,
    marginHorizontal: 4,
    borderRadius: 2,
  },
  pulseLineActive: {
    backgroundColor: theme.colors.primary,
  },
  timerText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: theme.spacing.md,
  },
  stopButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: theme.colors.danger,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  stopButtonText: {
    color: theme.colors.danger,
    fontWeight: '800',
    fontSize: 13,
  },
  simulationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  simTitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  simButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  simBtn: {
    flex: 0.48,
    borderWidth: 1.5,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  simBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  resultsTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  gradeBadge: {
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  badgeA: {
    backgroundColor: theme.colors.successBg,
  },
  badgeB: {
    backgroundColor: theme.colors.primaryGlow,
  },
  badgeF: {
    backgroundColor: theme.colors.dangerBg,
  },
  gradeBadgeText: {
    color: theme.colors.textPrimary,
    fontWeight: '800',
    fontSize: 12,
  },
  resultsBody: {
    marginBottom: theme.spacing.md,
  },
  transcriptLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: theme.spacing.xs,
  },
  transcriptText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
    fontWeight: '600',
  },
  feedbackLabel: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: theme.spacing.xs,
  },
  feedbackText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  progressScoreContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    paddingTop: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  scoreText: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.primary,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
