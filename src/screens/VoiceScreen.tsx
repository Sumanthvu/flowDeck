import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
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
  const [transcript, setTranscript] = useState('');
  const [gradeResult, setGradeResult] = useState<{
    grade: 'A' | 'B' | 'C' | 'F';
    feedback: string;
    score: number;
  } | null>(null);

  const handleStartRecording = async () => {
    setGradeResult(null);
    setTranscript('');
    
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
    
    try {
      const audioPath = await whisperService.stopRecording();
      const text = await whisperService.transcribeAudio(audioPath, card.concept);
      setTranscript(text);
      
      const grading = await llmService.gradeExplanation(card, text);
      setGradeResult(grading);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Simulation handlers for testing different grading outcomes:
  const handleSimulateAnswer = async (type: 'best' | 'weak') => {
    setGradeResult(null);
    setIsLoading(true);

    const text = type === 'best' 
      ? `Newton's third law says action forces are equal and opposite to reaction forces and they always act on different objects. Like a rocket engine pushing down and accelerating up.`
      : `Basically things push back. If you hit a table it hits you back.`;

    setTimeout(async () => {
      setTranscript(text);
      const grading = await llmService.gradeExplanation(card, text);
      setGradeResult(grading);
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.titleText}>Feynman Voice Loop</Text>
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
                {/* Simulated soundwave pulsing lines */}
                <View style={[styles.pulseLine, styles.pulseLineActive]} />
                <View style={[styles.pulseLine, styles.pulseLineActive, { height: 45 }]} />
                <View style={[styles.pulseLine, styles.pulseLineActive, { height: 60 }]} />
                <View style={[styles.pulseLine, styles.pulseLineActive, { height: 45 }]} />
                <View style={[styles.pulseLine, styles.pulseLineActive]} />
              </View>
              
              <Text style={styles.timerText}>Recording... {recordDuration}s</Text>
              
              <TouchableOpacity onPress={handleStopRecording} style={styles.stopButton}>
                <Text style={styles.stopButtonText}>⏹️ Stop & Transcribe (Offline)</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.idleContainer}>
              <TouchableOpacity onPress={handleStartRecording} style={styles.recordButton}>
                <Text style={styles.recordButtonText}>🎙️ Tap to Teach (Speak Aloud)</Text>
              </TouchableOpacity>
              <Text style={styles.idleSubtext}>The phone will record and grade you locally</Text>
            </View>
          )}
        </View>

        {/* Simulation / Debug Helpers (Highly useful for stage demo) */}
        {!isRecording && !isLoading && !gradeResult && (
          <View style={styles.simulationCard}>
            <Text style={styles.simTitle}>⚡ Stage Demo Simulations (Quick test)</Text>
            <View style={styles.simButtons}>
              <TouchableOpacity
                onPress={() => handleSimulateAnswer('best')}
                style={[styles.simBtn, { backgroundColor: `${theme.colors.success}15`, borderColor: theme.colors.success }]}
              >
                <Text style={[styles.simBtnText, { color: theme.colors.success }]}>Simulate A-Grade</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSimulateAnswer('weak')}
                style={[styles.simBtn, { backgroundColor: `${theme.colors.danger}15`, borderColor: theme.colors.danger }]}
              >
                <Text style={[styles.simBtnText, { color: theme.colors.danger }]}>Simulate C-Grade</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Processing State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={styles.loadingText}>Whisper is transcribing and grading locally...</Text>
          </View>
        )}

        {/* Grading and Feedback results */}
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
              <Text style={styles.transcriptLabel}>YOUR SPEECH TRANSCRIPT:</Text>
              <Text style={styles.transcriptText}>"{transcript}"</Text>

              <Text style={styles.feedbackLabel}>SOCRATIC FEEDBACK:</Text>
              <Text style={styles.feedbackText}>{gradeResult.feedback}</Text>

              <View style={styles.progressScoreContainer}>
                <Text style={styles.scoreText}>Transfer Score: {gradeResult.score}%</Text>
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
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.md,
  },
  backButton: {
    paddingRight: theme.spacing.md,
  },
  backButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  titleText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  conceptBox: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  conceptLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  conceptTitle: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
  },
  conceptExplanation: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  audioSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: '#0F1626',
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
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  recordButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  idleSubtext: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: theme.spacing.sm,
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
    backgroundColor: theme.colors.danger,
    marginHorizontal: 4,
    borderRadius: 2,
  },
  pulseLineActive: {
    backgroundColor: theme.colors.danger,
  },
  timerText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: theme.spacing.md,
  },
  stopButton: {
    backgroundColor: theme.colors.cardBorder,
    borderWidth: 1.5,
    borderColor: theme.colors.danger,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  stopButtonText: {
    color: theme.colors.danger,
    fontWeight: 'bold',
    fontSize: 13,
  },
  simulationCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  simTitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
  resultsCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
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
    fontWeight: 'bold',
  },
  gradeBadge: {
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  badgeA: {
    backgroundColor: `${theme.colors.success}33`,
  },
  badgeB: {
    backgroundColor: `${theme.colors.primary}33`,
  },
  badgeF: {
    backgroundColor: `${theme.colors.danger}33`,
  },
  gradeBadgeText: {
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  resultsBody: {
    marginBottom: theme.spacing.md,
  },
  transcriptLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  transcriptText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
  },
  feedbackLabel: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  feedbackText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: theme.spacing.md,
  },
  progressScoreContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    paddingTop: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  scoreText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
