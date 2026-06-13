import { LlamaContext, initLlama } from 'llama.rn';
import RNBlobUtil from 'react-native-blob-util';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as pdfService from './pdfService';

const MODEL_URL = 'https://huggingface.co/Qwen/Qwen2-0.5B-Instruct-GGUF/resolve/main/qwen2-0_5b-instruct-q4_k_m.gguf';
const MODEL_PATH = `${RNBlobUtil.fs.dirs.DocumentDir}/qwen2-0_5b-instruct-q4_k_m.gguf`;

export interface ConceptCard {
  id: string;
  concept: string;
  explanation: string;
  quizQuestion: string;
  quizAnswer: string;
  alternateExplanation?: string;
  isMastered: boolean;
  scoreRecall: number;
  scoreRetention: number;
  scoreTransfer: number;
}

export interface Deck {
  id: string;
  title: string;
  cards: ConceptCard[];
  pendingPageImages?: string[]; // Converted image paths waiting for OCR
  isIncremental?: boolean;      // True if deck has pending pages
  isGeneratingMore?: boolean;   // Active background generation flag
}

// In-memory storage for user-created decks (no mock data)
let userDecks: Deck[] = [];
const DECKS_STORAGE_KEY = '@flowdeck_decks';
let isDecksLoaded = false;

let llamaContext: LlamaContext | null = null;
let isModelLoading = false;

// Ensures the local LLM is loaded before any LLM-dependent call.
// Throws if the model cannot be loaded.
async function ensureModelLoaded(): Promise<void> {
  if (llamaContext) return;

  const loaded = await llmService.loadModel();
  if (!loaded || !llamaContext) {
    throw new Error(
      'Local LLM model is not available. Make sure the model file is bundled with the app and try again.'
    );
  }
}

export const llmService = {
  // Load the LLM model (requires model file to be bundled)
  loadModel: async (onProgress?: (progress: number, text: string) => void): Promise<boolean> => {
    if (llamaContext) return true;
    if (isModelLoading) return false;

    isModelLoading = true;
    console.log('[LLM] loadModel called');

    try {
      const exists = await RNBlobUtil.fs.exists(MODEL_PATH);
      if (!exists) {
        console.log('[LLM] Model not found locally. Starting download...');
        if (onProgress) onProgress(0, 'Downloading AI Model (350MB)...');

        await RNBlobUtil.config({
          path: MODEL_PATH,
        })
          .fetch('GET', MODEL_URL)
          .progress((received: string | number, total: string | number) => {
            const rec = Number(received);
            const tot = Number(total);
            const progress = tot > 0 ? rec / tot : 0;
            if (onProgress) {
              onProgress(progress, `Downloading AI Model (${Math.round(progress * 100)}%)...`);
            }
          });
        console.log('[LLM] Download completed successfully');
      }

      if (onProgress) onProgress(1, 'Initializing AI engine...');
      console.log('[LLM] Initializing llama.rn with model:', MODEL_PATH);

      llamaContext = await initLlama({
        model: MODEL_PATH,
        n_ctx: 2048,
        n_gpu_layers: 0, // Use CPU only
      });

      console.log('[LLM] Model loaded successfully');
      if (onProgress) onProgress(1, 'AI Engine Ready');
      return true;
    } catch (err) {
      console.log('[LLM] Model failed to load/download:', err);
      try {
        const exists = await RNBlobUtil.fs.exists(MODEL_PATH);
        if (exists) {
          await RNBlobUtil.fs.unlink(MODEL_PATH);
        }
      } catch (cleanupErr) {
        console.log('[LLM] Cleanup failed:', cleanupErr);
      }
      llamaContext = null;
      if (onProgress) onProgress(0, `Error: ${err instanceof Error ? err.message : err}`);
      return false;
    } finally {
      isModelLoading = false;
    }
  },

  // Save all decks to AsyncStorage
  saveDecks: async (): Promise<void> => {
    try {
      // Avoid saving the runtime volatile boolean flag
      const serializedDecks = userDecks.map(d => ({
        ...d,
        isGeneratingMore: false,
      }));
      await AsyncStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(serializedDecks));
      console.log('[LLM] Decks successfully saved to AsyncStorage');
    } catch (err) {
      console.log('[LLM] Error saving decks to AsyncStorage:', err);
    }
  },

  // Load all decks from AsyncStorage
  loadDecks: async (): Promise<Deck[]> => {
    if (isDecksLoaded) return userDecks;
    try {
      const stored = await AsyncStorage.getItem(DECKS_STORAGE_KEY);
      if (stored) {
        userDecks = JSON.parse(stored);
        console.log('[LLM] Loaded', userDecks.length, 'decks from AsyncStorage');
      } else {
        userDecks = [];
      }
      isDecksLoaded = true;
    } catch (err) {
      console.log('[LLM] Error loading decks from AsyncStorage:', err);
      userDecks = [];
      isDecksLoaded = true;
    }
    return userDecks;
  },

  // Get all user decks
  getDecks: async (): Promise<Deck[]> => {
    await llmService.loadDecks();
    console.log('[LLM] getDecks called, returning user decks:', userDecks.length);
    return userDecks;
  },

  // Clear all decks
  clearAllDecks: async (): Promise<void> => {
    userDecks = [];
    try {
      await AsyncStorage.removeItem(DECKS_STORAGE_KEY);
      console.log('[LLM] All decks cleared');
    } catch (err) {
      console.log('[LLM] Error clearing decks from AsyncStorage:', err);
    }
  },

  // Update a single deck's cards and save
  updateDeck: async (deckId: string, updatedCards: ConceptCard[]): Promise<void> => {
    const deck = userDecks.find(d => d.id === deckId);
    if (deck) {
      deck.cards = updatedCards;
      await llmService.saveDecks();
    }
  },

  // Generate cards from text using the local LLM only.
  // Will log errors and skip chunks that fail, returning a deck from successful ones.
  generateCardsFromText: async (title: string, rawText: string): Promise<Deck> => {
    console.log('[LLM] generateCardsFromText called with title:', title, 'text length:', rawText.length);

    await ensureModelLoaded();

    // Step 1: Clean and normalize the text
    const cleanText = rawText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Step 2: Split into meaningful overlapping sentence windows
    const paragraphs = pdfService.chunkTextIntoWindows(cleanText);

    console.log('[LLM] Found paragraphs:', paragraphs.length);

    if (paragraphs.length === 0) {
      throw new Error('No usable text found to generate flashcards from.');
    }

    // Step 3: Generate cards from each chunk using the LLM
    const cards: ConceptCard[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const chunk = paragraphs[i];
      try {
        console.log(`[LLM] Generating card ${i + 1} of ${paragraphs.length}...`);
        const card = await llmService._generateCardWithLLM(chunk, i);
        if (card) {
          // Concept duplication check
          const isDuplicate = cards.some(
            c => c.concept.toLowerCase().trim() === card.concept.toLowerCase().trim()
          );
          if (isDuplicate) {
            console.log(`[LLM] Skipping duplicate card concept: "${card.concept}"`);
          } else {
            cards.push(card);
          }
        } else {
          console.log(`[LLM] Warning: Failed to generate card for chunk ${i + 1}. Skipping.`);
        }
      } catch (err) {
        console.log(`[LLM] Error generating card for chunk ${i + 1}:`, err);
      }
    }

    if (cards.length === 0) {
      throw new Error('Local AI engine failed to extract any valid flashcards from the document. Please try a different section or text.');
    }

    // Create the deck
    const newDeck: Deck = {
      id: `deck-${Date.now()}`,
      title: title || 'Imported Content',
      cards: cards, // No arbitrary limit - include all generated cards
    };

    // Save to user decks
    userDecks.push(newDeck);
    console.log('[LLM] Created deck with', cards.length, 'cards');

    await llmService.saveDecks(); // Save to AsyncStorage!

    return newDeck;
  },

  // Generate card using LLM inference. Returns null if the LLM response
  // could not be parsed into a valid card (caller skips this chunk).
  _generateCardWithLLM: async (chunk: string, index: number): Promise<ConceptCard | null> => {
    if (!llamaContext) return null;

    // Use ChatML formatting
    const prompt = `<|im_start|>system
You are a flashcard generator. Given the following text chunk, create a single flashcard.
If the text does NOT contain any meaningful educational concepts, core facts, definitions, or study material (e.g. if it consists only of cover page metadata, table of contents, references, copyright declarations, page numbers, index entries, or blank/garbage lines), return ONLY the word: null
Otherwise, return ONLY valid JSON with this exact structure, with no markdown formatting or comments:
{
  "concept": "Brief title (max 60 chars)",
  "explanation": "Clear explanation of the concept",
  "quizQuestion": "A question to test understanding",
  "quizAnswer": "The answer to the quiz question"
}<|im_end|>
<|im_start|>user
Text: "${chunk.substring(0, 500)}"<|im_end|>
<|im_start|>assistant
`;

    console.log(`[LLM-DEBUG] ========================================`);
    console.log(`[LLM-DEBUG] LLM CALL: _generateCardWithLLM (Index: ${index})`);
    console.log(`[LLM-DEBUG] FULL TEXT CHUNK (first 1000 chars):\n${chunk.substring(0, 1000)}`);
    console.log(`[LLM-DEBUG] PROMPT SENT TO LLM:\n${prompt}`);
    console.log(`[LLM-DEBUG] ----------------------------------------`);

    try {
      const result = await llamaContext.completion({
        prompt: prompt,
        n_predict: 350,
        temperature: 0.3,
        top_p: 0.9,
        top_k: 40,
        penalty_repeat: 1.15,
        stop: ['<|im_end|>', '<|endoftext|>'],
      });

      const fullResponseText = result.text.trim();
      console.log(`[LLM-DEBUG] RAW RESPONSE:\n${fullResponseText}`);

      if (fullResponseText === 'null' || fullResponseText.toLowerCase() === 'null') {
        console.log('[LLM-DEBUG] DECISION: Chunker skipped irrelevant content (returned null)');
        console.log(`[LLM-DEBUG] ========================================`);
        return null;
      }

      const jsonMatch = fullResponseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('[LLM-DEBUG] DECISION: Failed - No JSON found in response');
        console.log(`[LLM-DEBUG] ========================================`);
        return null;
      }

      const cardData = JSON.parse(jsonMatch[0]);

      if (!cardData.concept || !cardData.explanation || !cardData.quizQuestion || !cardData.quizAnswer) {
        console.log('[LLM-DEBUG] DECISION: Failed - Card data missing required fields:', JSON.stringify(cardData));
        console.log(`[LLM-DEBUG] ========================================`);
        return null;
      }

      console.log('[LLM-DEBUG] DECISION: Success - Card generated:', JSON.stringify(cardData, null, 2));
      console.log(`[LLM-DEBUG] ========================================`);

      return {
        id: `card-${Date.now()}-${index}`,
        concept: cardData.concept,
        explanation: cardData.explanation,
        quizQuestion: cardData.quizQuestion,
        quizAnswer: cardData.quizAnswer,
        isMastered: false,
        scoreRecall: 0,
        scoreRetention: 0,
        scoreTransfer: 0,
      };
    } catch (err) {
      console.log('[LLM-DEBUG] ERROR generating card:', err);
      console.log(`[LLM-DEBUG] ========================================`);
      return null;
    }
  },

  // Simplify explanation using the local LLM only.
  simplifyExplanation: async (concept: string, previousExplanation: string): Promise<string> => {
    console.log('[LLM] simplifyExplanation called for:', concept);

    await ensureModelLoaded();

    const prompt = `<|im_start|>system
You are a tutor. Rewrite the explanation of the concept so it is simpler and easier to understand, ideally using a short analogy. Keep it to 1-3 sentences.
Return ONLY the simplified explanation text, with no preamble, labels, or quotation marks.<|im_end|>
<|im_start|>user
Concept: "${concept}"
Original explanation: "${previousExplanation}"<|im_end|>
<|im_start|>assistant
`;

    console.log(`[LLM-DEBUG] ========================================`);
    console.log(`[LLM-DEBUG] LLM CALL: simplifyExplanation`);
    console.log(`[LLM-DEBUG] PROMPT SENT TO LLM:\n${prompt}`);
    console.log(`[LLM-DEBUG] ----------------------------------------`);

    try {
      const result = await llamaContext!.completion({
        prompt: prompt,
        n_predict: 200,
        temperature: 0.5,
        top_p: 0.9,
        top_k: 40,
        penalty_repeat: 1.15,
        stop: ['<|im_end|>', '<|endoftext|>'],
      });

      const simplified = result.text.trim();
      console.log(`[LLM-DEBUG] RAW RESPONSE:\n${simplified}`);
      console.log(`[LLM-DEBUG] ========================================`);

      if (!simplified) {
        throw new Error('AI engine returned an empty response.');
      }
      return simplified;
    } catch (err) {
      console.log('[LLM-DEBUG] ERROR simplifying explanation:', err);
      console.log(`[LLM-DEBUG] ========================================`);
      throw new Error(`Failed to simplify explanation: ${err instanceof Error ? err.message : err}`);
    }
  },

  simplifyConcept: async (card: ConceptCard): Promise<string> => {
    return llmService.simplifyExplanation(card.concept, card.explanation);
  },

  // Grade explanation using the local LLM only.
  gradeExplanation: async (
    card: ConceptCard,
    studentTranscript: string
  ): Promise<{ grade: 'A' | 'B' | 'C' | 'F'; feedback: string; score: number }> => {
    console.log('[LLM] gradeExplanation called for concept:', card.concept);

    await ensureModelLoaded();

    const prompt = `<|im_start|>system
You are grading a student's spoken explanation of a concept.
Grade the student's explanation based on accuracy and completeness compared to the reference explanation.
Return ONLY valid JSON with this exact structure, with no markdown formatting:
{
  "grade": "A" | "B" | "C" | "F",
  "feedback": "one or two sentences of feedback",
  "score": 0-100
}<|im_end|>
<|im_start|>user
Concept: "${card.concept}"
Reference explanation: "${card.explanation}"
Student's explanation: "${studentTranscript}"<|im_end|>
<|im_start|>assistant
{`;

    console.log(`[LLM-DEBUG] ========================================`);
    console.log(`[LLM-DEBUG] LLM CALL: gradeExplanation`);
    console.log(`[LLM-DEBUG] PROMPT SENT TO LLM:\n${prompt}`);
    console.log(`[LLM-DEBUG] ----------------------------------------`);

    try {
      const result = await llamaContext!.completion({
        prompt: prompt,
        n_predict: 250,
        temperature: 0.3,
        top_p: 0.9,
        top_k: 40,
        penalty_repeat: 1.15,
        stop: ['<|im_end|>', '<|endoftext|>'],
      });

      const fullText = '{' + result.text;
      console.log(`[LLM-DEBUG] RAW RESPONSE (including prepended brace):\n${fullText}`);
      console.log(`[LLM-DEBUG] ----------------------------------------`);

      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI engine did not return valid JSON.');
      }

      const gradeData = JSON.parse(jsonMatch[0]);

      if (!gradeData || !gradeData.grade || !gradeData.feedback) {
        throw new Error('AI engine returned malformed grading data.');
      }

      const grade = gradeData.grade.toUpperCase().trim();
      if (!['A', 'B', 'C', 'F'].includes(grade)) {
        throw new Error(`AI engine returned an invalid grade: "${grade}"`);
      }

      let score = typeof gradeData.score === 'number' ? gradeData.score : 0;
      if (typeof gradeData.score !== 'number') {
        if (grade === 'A') score = 95;
        else if (grade === 'B') score = 80;
        else if (grade === 'C') score = 60;
        else score = 30;
      }

      console.log('[LLM-DEBUG] DECISION: Grading success:', JSON.stringify({ grade, feedback: gradeData.feedback, score }, null, 2));
      console.log(`[LLM-DEBUG] ========================================`);

      return {
        grade: grade as 'A' | 'B' | 'C' | 'F',
        feedback: gradeData.feedback,
        score: score,
      };
    } catch (err) {
      console.log('[LLM-DEBUG] ERROR grading explanation:', err);
      console.log(`[LLM-DEBUG] ========================================`);
      throw new Error(`Failed to grade explanation: ${err instanceof Error ? err.message : err}`);
    }
  },

  // Validate quiz answer using the local LLM only.
  validateQuizAnswer: async (card: ConceptCard, studentAnswer: string): Promise<boolean> => {
    console.log('[LLM] validateQuizAnswer called');

    await ensureModelLoaded();

    const prompt = `<|im_start|>system
You are a teacher grading a student's answer to a quiz question.
You will be given the original flashcard details (Concept and Explanation), the Quiz Question, the Correct Answer, and the Student's Answer.
Compare the Student's Answer to the Correct Answer using the Flashcard Explanation as context.
Does the Student's Answer show a correct understanding and answer the question correctly?
Respond with ONLY "YES" or "NO". Do not write any other explanation or words.<|im_end|>
<|im_start|>user
Flashcard Concept: "${card.concept}"
Flashcard Explanation: "${card.explanation}"
Quiz Question: "${card.quizQuestion}"
Correct Answer: "${card.quizAnswer}"
Student's Answer: "${studentAnswer}"<|im_end|>
<|im_start|>assistant
`;

    console.log(`[LLM-DEBUG] ========================================`);
    console.log(`[LLM-DEBUG] LLM CALL: validateQuizAnswer`);
    console.log(`[LLM-DEBUG] PROMPT SENT TO LLM:\n${prompt}`);
    console.log(`[LLM-DEBUG] ----------------------------------------`);

    try {
      const result = await llamaContext!.completion({
        prompt: prompt,
        n_predict: 10,
        temperature: 0.1,
        top_p: 0.9,
        top_k: 40,
        penalty_repeat: 1.15,
        stop: ['<|im_end|>', '<|endoftext|>'],
      });

      const response = result.text.trim().toUpperCase();
      console.log(`[LLM-DEBUG] RAW RESPONSE:\n${response}`);
      console.log(`[LLM-DEBUG] ----------------------------------------`);

      const hasYes = response.includes('YES');
      console.log(`[LLM-DEBUG] DECISION: Graded correct = ${hasYes}`);
      console.log(`[LLM-DEBUG] ========================================`);

      if (response.includes('YES')) return true;
      if (response.includes('NO')) return false;

      return response.indexOf('YES') !== -1;
    } catch (err) {
      console.log('[LLM-DEBUG] ERROR validating quiz answer:', err);
      console.log(`[LLM-DEBUG] ========================================`);
      throw new Error(`Failed to validate quiz answer: ${err instanceof Error ? err.message : err}`);
    }
  },

  evaluateQuizAnswer: async (card: ConceptCard, studentAnswer: string): Promise<{ correct: boolean; feedback: string }> => {
    const correct = await llmService.validateQuizAnswer(card, studentAnswer);
    return {
      correct,
      feedback: correct
        ? "Correct! Great job understanding the material."
        : `Not quite. The key point is: ${card.quizAnswer}`,
    };
  },

  // Generate cards from text chunk without saving it as a new deck
  generateTempCardsFromText: async (rawText: string, existingCards: ConceptCard[] = []): Promise<ConceptCard[]> => {
    console.log('[LLM] generateTempCardsFromText, text length:', rawText.length);
    const cleanText = rawText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const paragraphs = pdfService.chunkTextIntoWindows(cleanText);

    const cards: ConceptCard[] = [];
    for (let i = 0; i < paragraphs.length; i++) {
      const chunk = paragraphs[i];
      try {
        console.log(`[LLM] Generating temp card ${i + 1} of ${paragraphs.length}...`);
        const card = await llmService._generateCardWithLLM(chunk, i);
        if (card) {
          // Concept duplication check
          const normConcept = card.concept.toLowerCase().trim();
          const isDuplicate = cards.some(c => c.concept.toLowerCase().trim() === normConcept) ||
                              existingCards.some(c => c.concept.toLowerCase().trim() === normConcept);
          if (isDuplicate) {
            console.log(`[LLM] Skipping duplicate temp card concept: "${card.concept}"`);
          } else {
            cards.push(card);
          }
        }
      } catch (err) {
        console.log('[LLM] Error generating temp card:', err);
      }
    }
    return cards;
  },

  // Progressively OCR and generate more cards from the next batch of PDF page images
  loadMoreCardsForDeck: async (deckId: string, onCardsAdded?: (newCards: ConceptCard[]) => void): Promise<void> => {
    const deck = userDecks.find(d => d.id === deckId);
    if (!deck || !deck.isIncremental || !deck.pendingPageImages || deck.pendingPageImages.length === 0 || deck.isGeneratingMore) {
      return;
    }

    deck.isGeneratingMore = true;
    console.log('[LLM] Progressive loading started for deck:', deck.title);

    try {
      const BATCH_SIZE = 3;
      const batchImages = deck.pendingPageImages.slice(0, BATCH_SIZE);
      const remainingImages = deck.pendingPageImages.slice(BATCH_SIZE);

      const text = await pdfService.ocrPageImages(batchImages);
      if (text.trim()) {
        const newCards = await llmService.generateTempCardsFromText(text, deck.cards);
        if (newCards.length > 0) {
          deck.cards = [...deck.cards, ...newCards];
          if (onCardsAdded) {
            onCardsAdded(newCards);
          }
          console.log('[LLM] Appended', newCards.length, 'progressive cards to deck');
        }
      }

      deck.pendingPageImages = remainingImages;
      deck.isIncremental = remainingImages.length > 0;
    } catch (err) {
      console.log('[LLM] Progressive card loading failed:', err);
    } finally {
      deck.isGeneratingMore = false;
      await llmService.saveDecks();
    }
  }
};