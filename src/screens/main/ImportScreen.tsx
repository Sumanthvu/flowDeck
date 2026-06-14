// src/screens/main/ImportScreen.tsx — FlowDeck Upload Page
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, ActivityIndicator, ScrollView, StatusBar, Animated,
} from 'react-native';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { theme } from '../../styles/theme';
import { llmService, Deck } from '../../services/llmService';
import { authService } from '../../services/authService';
import { extractTextFromPdf } from '../../services/pdfService';

interface Props {
  onDeckCreated: (deck: Deck) => void;
}

type Mode = 'text' | 'pdf';

interface GenStep {
  label: string;
  done: boolean;
  active: boolean;
}

const INIT_STEPS: GenStep[] = [
  { label: 'Parsing text',          done: false, active: false },
  { label: 'Chunking into topics',  done: false, active: false },
  { label: 'Generating cards',      done: false, active: false },
  { label: 'Calculating mastery',   done: false, active: false },
];

export const ImportScreen: React.FC<Props> = ({ onDeckCreated }) => {
  const [mode, setMode]           = useState<Mode>('text');
  const [textInput, setTextInput] = useState('');
  const [pdfName, setPdfName]     = useState<string | null>(null);
  const [pdfUri, setPdfUri]       = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps]         = useState<GenStep[]>(INIT_STEPS);
  const [error, setError]         = useState<string | null>(null);

  const setStepActive = (i: number) => setSteps(prev => prev.map((s, idx) => ({ ...s, active: idx === i, done: idx < i })));
  const setAllDone    = ()           => setSteps(prev => prev.map(s => ({ ...s, active: false, done: true })));

  const pickPdf = async () => {
    try {
      const [res] = await pick({ type: [types.pdf] });
      setPdfUri(res.uri);
      setPdfName(res.name ?? 'document.pdf');
      setError(null);
    } catch (e: any) {
      if (!isErrorWithCode(e) || e.code !== errorCodes.OPERATION_CANCELED) {
        setError('Failed to pick PDF. Please try again.');
      }
    }
  };

  const handleGenerate = async () => {
    if (mode === 'text' && !textInput.trim()) { setError('Please enter some text first.'); return; }
    if (mode === 'pdf'  && !pdfUri)           { setError('Please select a PDF first.');    return; }
    setError(null);
    setIsLoading(true);
    setSteps(INIT_STEPS);

    try {
      const user = await authService.getUser();
      if (!user) throw new Error('Not authenticated.');

      let rawText = textInput;
      const title = mode === 'pdf' && pdfName
        ? pdfName.replace(/\.pdf$/i, '')
        : textInput.slice(0, 60).trim() || 'My Topic';

      if (mode === 'pdf' && pdfUri) {
        setStepActive(0);
        const extracted = await extractTextFromPdf(pdfUri);
        rawText = extracted.text;
      }

      setStepActive(1);
      const newDeck = await llmService.generateCardsFromText(title, rawText);
      setStepActive(2);
      setAllDone();
      setTimeout(() => { setIsLoading(false); onDeckCreated(newDeck); }, 600);
    } catch (e: any) {
      setIsLoading(false);
      setSteps(INIT_STEPS);
      setError(e?.message ?? 'An error occurred. Please try again.');
    }
  };

  const canSubmit = mode === 'text' ? textInput.trim().length > 30 : !!pdfUri;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Page title */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Import Content</Text>
          <Text style={styles.pageSub}>Paste text or upload a PDF to generate your deck</Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          {(['text', 'pdf'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => { setMode(m); setError(null); }}
            >
              <Text style={styles.modeBtnIcon}>{m === 'text' ? '📝' : '📄'}</Text>
              <Text style={[styles.modeBtnLabel, mode === m && styles.modeBtnLabelActive]}>
                {m === 'text' ? 'Paste Text' : 'Upload PDF'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mode Panel */}
        {mode === 'text' ? (
          <View style={styles.panel}>
            <Text style={styles.panelLabel}>PASTE YOUR NOTES OR CONTENT</Text>
            <TextInput
              style={styles.textArea}
              value={textInput}
              onChangeText={setTextInput}
              multiline
              numberOfLines={8}
              placeholder="Paste your lecture notes, textbook excerpt, or any educational content here..."
              placeholderTextColor={theme.colors.textMuted}
              textAlignVertical="top"
              editable={!isLoading}
            />
            <Text style={styles.charCount}>{textInput.length} characters</Text>
          </View>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.panelLabel}>SELECT A PDF DOCUMENT</Text>
            {pdfUri ? (
              <View style={styles.pdfSelectedBox}>
                <Text style={{ fontSize: 28 }}>📄</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pdfSelectedName} numberOfLines={2}>{pdfName}</Text>
                  <Text style={styles.pdfSelectedSub}>Ready to process</Text>
                </View>
                <TouchableOpacity onPress={() => { setPdfUri(null); setPdfName(null); }} style={styles.pdfClearBtn}>
                  <Text style={styles.pdfClearText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.pdfDropZone} onPress={pickPdf}>
                <Text style={styles.pdfDropIcon}>📂</Text>
                <Text style={styles.pdfDropTitle}>Tap to browse files</Text>
                <Text style={styles.pdfDropSub}>PDF files supported</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Generate Button */}
        {!isLoading && (
          <TouchableOpacity
            style={[styles.generateBtn, !canSubmit && { opacity: 0.5 }]}
            onPress={handleGenerate}
            disabled={!canSubmit}
          >
            <Text style={styles.generateBtnText}>✨ Generate Flashcards</Text>
          </TouchableOpacity>
        )}

        {/* Progress Panel */}
        {isLoading && (
          <View style={styles.progressCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.progressTitle}>Generating Deck...</Text>
            <Text style={styles.progressSub}>This runs fully on-device. It may take 30–60 seconds.</Text>

            <View style={styles.stepsList}>
              {steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={[
                    styles.stepDot,
                    step.done   && styles.stepDotDone,
                    step.active && styles.stepDotActive,
                  ]}>
                    {step.active && <ActivityIndicator size="small" color="#FFF" />}
                    {step.done   && <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>✓</Text>}
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    step.done   && styles.stepLabelDone,
                    step.active && styles.stepLabelActive,
                  ]}>
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Info cards */}
        {!isLoading && (
          <View style={styles.infoGrid}>
            {[
              { icon: '🔒', title: 'Fully Offline',     desc: 'AI runs on-device. No data ever leaves your phone.' },
              { icon: '⚡', title: 'Instant Deck',       desc: 'Concept cards + quiz questions generated automatically.' },
              { icon: '🧠', title: 'Spaced Repetition',  desc: 'FlowDeck tracks mastery and surfaces weak cards more.' },
            ].map(card => (
              <View key={card.title} style={styles.infoCard}>
                <Text style={styles.infoIcon}>{card.icon}</Text>
                <Text style={styles.infoTitle}>{card.title}</Text>
                <Text style={styles.infoDesc}>{card.desc}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: 16, paddingBottom: 32 },

  pageHeader: { marginBottom: 16 },
  pageTitle:  { fontSize: 24, fontWeight: '900', color: theme.colors.textPrimary, letterSpacing: -0.5 },
  pageSub:    { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, fontWeight: '500' },

  // Mode Toggle
  modeToggle: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: theme.colors.cardBorder, marginBottom: 14,
    ...theme.shadows.xs,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 9,
  },
  modeBtnActive: { backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: 'rgba(255,107,53,0.25)' },
  modeBtnIcon:   { fontSize: 16 },
  modeBtnLabel:  { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
  modeBtnLabelActive: { color: theme.colors.primary, fontWeight: '800' },

  // Panel
  panel: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: theme.colors.cardBorder, marginBottom: 14,
    ...theme.shadows.xs,
  },
  panelLabel: {
    fontSize: 10, fontWeight: '800', color: theme.colors.textMuted,
    letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' as const,
  },

  textArea: {
    borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: 10,
    color: theme.colors.textPrimary, fontSize: 15, padding: 12,
    backgroundColor: '#FAFAFA', minHeight: 160, lineHeight: 22,
  },
  charCount: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'right', marginTop: 6, fontWeight: '600' },

  // PDF
  pdfDropZone: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.accent,
    borderRadius: 12, padding: 32, alignItems: 'center',
    backgroundColor: theme.colors.accentLight,
  },
  pdfDropIcon:  { fontSize: 36, marginBottom: 10 },
  pdfDropTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 4 },
  pdfDropSub:   { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },

  pdfSelectedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.accentLight, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: theme.colors.accent,
  },
  pdfSelectedName: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, lineHeight: 18 },
  pdfSelectedSub:  { fontSize: 11, color: theme.colors.accent, marginTop: 2, fontWeight: '600' },
  pdfClearBtn: { padding: 6, backgroundColor: '#FFFFFF', borderRadius: 999, borderWidth: 1, borderColor: theme.colors.cardBorder },
  pdfClearText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '700' },

  // Error
  errorBox: {
    backgroundColor: theme.colors.dangerBg, borderRadius: 10, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: { color: theme.colors.danger, fontSize: 13, fontWeight: '600' },

  // Generate button
  generateBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 20, ...theme.shadows.primary,
  },
  generateBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 },

  // Progress card
  progressCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.cardBorder, marginBottom: 20,
    ...theme.shadows.md,
  },
  progressTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary, marginTop: 12, marginBottom: 4 },
  progressSub:   { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 20 },

  stepsList: { width: '100%', gap: 10 },
  stepRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: theme.colors.cardBorder, justifyContent: 'center', alignItems: 'center',
  },
  stepDotDone:   { backgroundColor: theme.colors.success },
  stepDotActive: { backgroundColor: theme.colors.primary },
  stepLabel:     { fontSize: 14, color: theme.colors.textMuted, fontWeight: '500' },
  stepLabelDone: { color: theme.colors.success, fontWeight: '700' },
  stepLabelActive:{ color: theme.colors.primary, fontWeight: '700' },

  // Info cards
  infoGrid: { gap: 10 },
  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    ...theme.shadows.xs,
  },
  infoIcon:  { fontSize: 22, marginTop: 2 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 3 },
  infoDesc:  { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
});
