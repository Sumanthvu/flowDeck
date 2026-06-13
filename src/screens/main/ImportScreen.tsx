import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { pick, types, errorCodes, isErrorWithCode } from '@react-native-documents/picker';
import { theme } from '../../styles/theme';
import { llmService, Deck } from '../../services/llmService';
import { extractTextFromPdf } from '../../services/pdfService';

interface Props {
  onDeckCreated: (deck: Deck) => void;
}

type Tab = 'text' | 'pdf';
type PdfState = 'idle' | 'picked' | 'extracting' | 'ready' | 'error';

export const ImportScreen: React.FC<Props> = ({ onDeckCreated }) => {
  const [tab, setTab] = useState<Tab>('text');

  // ── Text tab state ──────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [generatedDeck, setGeneratedDeck] = useState<Deck | null>(null);

  // ── PDF tab state ───────────────────────────────────────────────────
  const [pdfState, setPdfState] = useState<PdfState>('idle');
  const [pdfName, setPdfName] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfChunks, setPdfChunks] = useState<string[]>([]);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfError, setPdfError] = useState('');
  const [pdfDeck, setPdfDeck] = useState<Deck | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // ── Text tab handlers ───────────────────────────────────────────────
  const handleChunkPreview = () => {
    if (!body.trim()) return;
    const chunks = body.split(/\n\n+/).map(s => s.trim()).filter(s => s.length > 20).slice(0, 5);
    setPreview(chunks);
  };

  const handleAtomize = async () => {
    if (!body.trim()) { Alert.alert('Empty', 'Please paste some text first.'); return; }
    setProcessing(true);
    try {
      const deck = await llmService.generateCardsFromText(title || 'Imported Deck', body);
      setGeneratedDeck(deck);
      setPreview([]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate cards');
    } finally {
      setProcessing(false);
    }
  };

  const resetText = () => {
    setGeneratedDeck(null); setTitle(''); setBody(''); setPreview([]);
  };

  // ── PDF tab handlers ────────────────────────────────────────────────
  const handlePickPdf = async () => {
    try {
      const [result] = await pick({ type: [types.pdf] });
      const name = result.name ?? 'Document';
      setPdfName(name);
      setPdfTitle(name.replace(/\.pdf$/i, ''));
      setPdfState('extracting');
      setPdfError('');
      setPdfDeck(null);

      const { chunks, pageCount } = await extractTextFromPdf(result.uri);

      if (chunks.length === 0) {
        setPdfError('No readable text found in this PDF. It may be a scanned image PDF — try copying the text and using the Paste Text tab instead.');
        setPdfState('error');
        return;
      }

      setPdfChunks(chunks);
      setPdfPageCount(pageCount);
      setPdfState('ready');
    } catch (e: any) {
      if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
        setPdfState('idle');
      } else {
        setPdfError(e.message || 'Failed to open PDF.');
        setPdfState('error');
      }
    }
  };

  const handleGenerateFromPdf = async () => {
    if (pdfChunks.length === 0) return;
    setGeneratingPdf(true);
    try {
      const combinedText = pdfChunks.join('\n\n');
      const deck = await llmService.generateCardsFromText(pdfTitle || pdfName, combinedText);
      setPdfDeck(deck);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate cards from PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const resetPdf = () => {
    setPdfState('idle'); setPdfName(''); setPdfTitle('');
    setPdfChunks([]); setPdfPageCount(0); setPdfError(''); setPdfDeck(null);
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.title}>Import Content</Text>
          <Text style={styles.sub}>Transform any material into AI-powered flashcards</Text>
        </View>

        {/* Tab selector */}
        <View style={styles.tabs}>
          {(['text', 'pdf'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'text' ? '📝 Paste Text' : '📄 PDF Upload'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TEXT TAB ── */}
        {tab === 'text' && (
          <View style={styles.card}>
            <Text style={styles.label}>DOCUMENT TITLE</Text>
            <TextInput
              style={styles.inputTitle}
              placeholder="e.g. Newtonian Mechanics — Ch 5"
              placeholderTextColor={theme.colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>CONTENT</Text>
            <TextInput
              style={styles.inputBody}
              placeholder="Paste your lecture notes, textbook content, or study material here..."
              placeholderTextColor={theme.colors.textMuted}
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />

            {body.trim().length > 0 && !generatedDeck && !processing && (
              <TouchableOpacity style={styles.previewBtn} onPress={handleChunkPreview}>
                <Text style={styles.previewBtnText}>
                  👁 Preview Chunks ({body.split(/\n\n+/).filter(s => s.trim().length > 20).length} detected)
                </Text>
              </TouchableOpacity>
            )}

            {preview.length > 0 && (
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>Chunk Preview</Text>
                {preview.map((chunk, i) => (
                  <View key={i} style={styles.chunkCard}>
                    <View style={styles.chunkNum}><Text style={styles.chunkNumText}>{i + 1}</Text></View>
                    <Text style={styles.chunkText} numberOfLines={3}>{chunk}</Text>
                  </View>
                ))}
              </View>
            )}

            {processing ? (
              <View style={styles.processingCard}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
                <Text style={styles.processingText}>⚡ Generating flashcards...</Text>
                <Text style={styles.processingSubText}>Analysing and atomising your content</Text>
              </View>
            ) : generatedDeck ? (
              <View style={styles.successCard}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>{generatedDeck.cards.length} Cards Generated!</Text>
                <Text style={styles.successSub}>"{generatedDeck.title}" is ready to study</Text>
                <TouchableOpacity style={styles.studyNowBtn} onPress={() => onDeckCreated(generatedDeck)}>
                  <Text style={styles.studyNowText}>Study Now →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.importMoreBtn} onPress={resetText}>
                  <Text style={styles.importMoreText}>Import More</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.atomizeBtn, { opacity: body.trim() ? 1 : 0.5 }]}
                onPress={handleAtomize}
                disabled={!body.trim()}
              >
                <Text style={styles.atomizeBtnText}>⚡ Atomize & Generate Cards</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── PDF TAB ── */}
        {tab === 'pdf' && (
          <View style={styles.card}>

            {/* IDLE — pick a file */}
            {pdfState === 'idle' && (
              <>
                <View style={styles.pdfDropZone}>
                  <Text style={styles.pdfIcon}>📄</Text>
                  <Text style={styles.pdfDropTitle}>Upload a PDF</Text>
                  <Text style={styles.pdfDropSub}>
                    Pick any textbook, lecture notes, or study PDF from your device.
                    Text is extracted and turned into flashcards — all on-device.
                  </Text>
                  <TouchableOpacity style={styles.pickBtn} onPress={handlePickPdf}>
                    <Text style={styles.pickBtnText}>📁 Choose PDF File</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.pdfInfoRow}>
                  {[['🔒', '100% On-Device'], ['⚡', 'Instant Extraction'], ['🎯', 'Auto-Chunked']].map(([icon, label]) => (
                    <View key={label} style={styles.pdfInfoItem}>
                      <Text style={styles.pdfInfoIcon}>{icon}</Text>
                      <Text style={styles.pdfInfoText}>{label}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* EXTRACTING */}
            {pdfState === 'extracting' && (
              <View style={styles.processingCard}>
                <ActivityIndicator color={theme.colors.accent} size="large" />
                <Text style={styles.processingText}>📄 Reading "{pdfName}"...</Text>
                <Text style={styles.processingSubText}>Extracting text from PDF</Text>
              </View>
            )}

            {/* ERROR */}
            {pdfState === 'error' && (
              <View style={styles.errorCard}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>Could Not Read PDF</Text>
                <Text style={styles.errorMsg}>{pdfError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={resetPdf}>
                  <Text style={styles.retryBtnText}>Try Another File</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* READY — show extracted info + title input */}
            {(pdfState === 'ready' || pdfState === 'picked') && !pdfDeck && (
              <>
                <View style={styles.pdfSuccessRow}>
                  <Text style={styles.pdfSuccessIcon}>📄</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pdfSuccessName} numberOfLines={1}>{pdfName}</Text>
                    <Text style={styles.pdfSuccessMeta}>
                      ~{pdfPageCount} page{pdfPageCount !== 1 ? 's' : ''} · {pdfChunks.length} text chunks detected
                    </Text>
                  </View>
                  <TouchableOpacity onPress={resetPdf} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>DECK TITLE</Text>
                <TextInput
                  style={styles.inputTitle}
                  placeholder="Name for this deck"
                  placeholderTextColor={theme.colors.textMuted}
                  value={pdfTitle}
                  onChangeText={setPdfTitle}
                />

                {/* Preview first 3 chunks */}
                <Text style={styles.previewTitle}>Content Preview</Text>
                {pdfChunks.slice(0, 3).map((chunk, i) => (
                  <View key={i} style={styles.chunkCard}>
                    <View style={styles.chunkNum}><Text style={styles.chunkNumText}>{i + 1}</Text></View>
                    <Text style={styles.chunkText} numberOfLines={3}>{chunk}</Text>
                  </View>
                ))}
                {pdfChunks.length > 3 && (
                  <Text style={styles.moreChunks}>+{pdfChunks.length - 3} more chunks</Text>
                )}

                {generatingPdf ? (
                  <View style={styles.processingCard}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                    <Text style={styles.processingText}>⚡ Generating flashcards from PDF...</Text>
                    <Text style={styles.processingSubText}>Creating up to {pdfChunks.length} cards</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.atomizeBtn} onPress={handleGenerateFromPdf}>
                    <Text style={styles.atomizeBtnText}>⚡ Generate Cards from PDF</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* SUCCESS */}
            {pdfDeck && (
              <View style={styles.successCard}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>{pdfDeck.cards.length} Cards Generated!</Text>
                <Text style={styles.successSub}>"{pdfDeck.title}" is ready to study</Text>
                <TouchableOpacity style={styles.studyNowBtn} onPress={() => onDeckCreated(pdfDeck)}>
                  <Text style={styles.studyNowText}>Study Now →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.importMoreBtn} onPress={resetPdf}>
                  <Text style={styles.importMoreText}>Import Another PDF</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.md, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { color: theme.colors.textPrimary, fontSize: 26, fontWeight: '800' },
  sub: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 },
  tabs: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: theme.borderRadius.sm },
  tabBtnActive: { backgroundColor: theme.colors.primary },
  tabText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff', fontWeight: '800' },
  card: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    borderWidth: 1, borderColor: theme.colors.cardBorder, padding: theme.spacing.md,
  },
  label: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6, marginTop: 8, textTransform: 'uppercase' },
  inputTitle: {
    borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: theme.borderRadius.md,
    color: theme.colors.textPrimary, fontSize: 15, padding: 12,
    backgroundColor: theme.colors.background, marginBottom: 16, fontWeight: '600',
  },
  inputBody: {
    borderWidth: 1.5, borderColor: theme.colors.cardBorder, borderRadius: theme.borderRadius.md,
    color: theme.colors.textPrimary, fontSize: 14, padding: 12,
    backgroundColor: theme.colors.background, minHeight: 140, marginBottom: 14,
  },
  previewBtn: {
    borderWidth: 1, borderColor: theme.colors.glassBorder, borderRadius: theme.borderRadius.sm,
    paddingVertical: 8, alignItems: 'center', marginBottom: 14,
  },
  previewBtnText: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
  previewSection: { marginBottom: 14 },
  previewTitle: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 4, textTransform: 'uppercase' },
  chunkCard: {
    flexDirection: 'row', backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm, padding: 10, marginBottom: 6, gap: 10,
  },
  chunkNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: theme.colors.primaryGlow, justifyContent: 'center', alignItems: 'center',
  },
  chunkNumText: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  chunkText: { flex: 1, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
  moreChunks: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 12, marginTop: 2 },
  processingCard: { alignItems: 'center', padding: 24 },
  processingText: { color: theme.colors.primary, fontSize: 15, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  processingSubText: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center' },
  successCard: {
    backgroundColor: theme.colors.successBg, borderRadius: theme.borderRadius.lg,
    borderWidth: 1, borderColor: theme.colors.success, padding: 24, alignItems: 'center',
  },
  successIcon: { fontSize: 36, marginBottom: 8 },
  successTitle: { color: theme.colors.success, fontSize: 20, fontWeight: '900', marginBottom: 4 },
  successSub: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: 20, textAlign: 'center' },
  studyNowBtn: {
    backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
    paddingHorizontal: 32, paddingVertical: 14, marginBottom: 10,
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  studyNowText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  importMoreBtn: { paddingVertical: 8 },
  importMoreText: { color: theme.colors.textSecondary, fontSize: 13 },
  atomizeBtn: {
    backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  atomizeBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  // PDF specific
  pdfDropZone: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.lg, padding: 36, alignItems: 'center', marginBottom: 20,
  },
  pdfIcon: { fontSize: 48, marginBottom: 12 },
  pdfDropTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  pdfDropSub: { color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  pickBtn: {
    backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md, paddingHorizontal: 24, paddingVertical: 12,
  },
  pickBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 14 },
  pdfInfoRow: { flexDirection: 'row', justifyContent: 'space-around' },
  pdfInfoItem: { alignItems: 'center', gap: 4 },
  pdfInfoIcon: { fontSize: 20 },
  pdfInfoText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' },
  pdfSuccessRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  pdfSuccessIcon: { fontSize: 28 },
  pdfSuccessName: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
  pdfSuccessMeta: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  clearBtn: { padding: 6 },
  clearBtnText: { color: theme.colors.textMuted, fontSize: 16 },
  errorCard: {
    alignItems: 'center', padding: 24,
    backgroundColor: theme.colors.dangerBg,
    borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.danger,
  },
  errorIcon: { fontSize: 36, marginBottom: 8 },
  errorTitle: { color: theme.colors.danger, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  errorMsg: { color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  retryBtn: {
    borderWidth: 1.5, borderColor: theme.colors.danger, borderRadius: theme.borderRadius.md,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  retryBtnText: { color: theme.colors.danger, fontWeight: '700', fontSize: 14 },
});
