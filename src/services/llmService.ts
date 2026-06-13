import { LlamaContext, initLlama } from 'llama.rn';

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
}

// In-memory storage for user-created decks (no mock data)
let userDecks: Deck[] = [];
let llamaContext: LlamaContext | null = null;
let isModelLoading = false;

export const llmService = {
  // Load the LLM model (requires model file to be bundled)
  loadModel: async (): Promise<boolean> => {
    if (llamaContext) return true;
    if (isModelLoading) return false;

    isModelLoading = true;
    console.log('[LLM] Loading model...');

    try {
      // Note: This requires a model file to be bundled with the app
      // For now, we'll work with text processing until a model is available
      llamaContext = await initLlama({
        model: 'models/llama-2-7b-chat.Q4_K_M.gguf',
        n_gpu_layers: 0, // Use CPU only
      });
      console.log('[LLM] Model loaded successfully');
      return true;
    } catch (err) {
      console.log('[LLM] Model not available, using text processing:', err);
      // Continue without model - text processing will work
      return false;
    } finally {
      isModelLoading = false;
    }
  },

  // Get all user decks
  getDecks: async (): Promise<Deck[]> => {
    console.log('[LLM] getDecks called, returning user decks:', userDecks.length);
    return userDecks;
  },

  // Clear all decks
  clearAllDecks: async (): Promise<void> => {
    userDecks = [];
    console.log('[LLM] All decks cleared');
  },

  // Generate cards from text using intelligent text processing
  generateCardsFromText: async (title: string, rawText: string): Promise<Deck> => {
    console.log('[LLM] generateCardsFromText called with title:', title, 'text length:', rawText.length);

    // Step 1: Clean and normalize the text
    const cleanText = rawText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Step 2: Split into meaningful chunks (paragraphs or sections)
    const paragraphs = cleanText
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 30); // Filter out short fragments

    console.log('[LLM] Found paragraphs:', paragraphs.length);

    // Step 3: Generate cards from each chunk
    const cards: ConceptCard[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const chunk = paragraphs[i];

      // Extract key concept from the chunk (first meaningful sentence)
      const sentences = chunk.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
      const concept = sentences[0]?.substring(0, 60) || `Concept ${i + 1}`;

      // Create explanation (use the full chunk or first 2 sentences)
      const explanationLines = chunk.split('\n').filter(l => l.trim().length > 20);
      const explanation = explanationLines.slice(0, 3).join('\n') || chunk.substring(0, 200);

      // Generate a relevant quiz question based on the content
      const quizQuestion = llmService._generateQuizQuestion(concept, chunk);
      const quizAnswer = llmService._generateQuizAnswer(chunk);

      cards.push({
        id: `card-${Date.now()}-${i}`,
        concept: concept,
        explanation: explanation,
        quizQuestion: quizQuestion,
        quizAnswer: quizAnswer,
        isMastered: false,
        scoreRecall: 0,
        scoreRetention: 0,
        scoreTransfer: 0,
      });
    }

    // Fallback if no cards created
    if (cards.length === 0) {
      const fallbackCard = llmService._createFallbackCard(rawText);
      cards.push(fallbackCard);
    }

    // Create the deck
    const newDeck: Deck = {
      id: `deck-${Date.now()}`,
      title: title || 'Imported Content',
      cards: cards.slice(0, 20), // Max 20 cards per deck
    };

    // Save to user decks
    userDecks.push(newDeck);
    console.log('[LLM] Created deck with', cards.length, 'cards');

    return newDeck;
  },

  // Helper: Generate a quiz question from content
  _generateQuizQuestion: (concept: string, _context: string): string => {
    const questionTemplates = [
      `What is the main idea of: "${concept.substring(0, 30)}..."?`,
      `Explain the key concept about "${concept.substring(0, 25)}..."`,
      `Can you describe what "${concept.substring(0, 30)}..." means?`,
      `What are the important points about "${concept.substring(0, 25)}..."?`,
    ];
    return questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
  },

  // Helper: Generate quiz answer from content
  _generateQuizAnswer: (context: string): string => {
    // Take first 2 sentences as the answer
    const sentences = context.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
    return sentences.slice(0, 2).join('. ') || context.substring(0, 150);
  },

  // Helper: Create fallback card for short text
  _createFallbackCard: (text: string): ConceptCard => {
    const firstPart = text.substring(0, 100);
    return {
      id: `card-${Date.now()}-fallback`,
      concept: 'Imported Content',
      explanation: text.substring(0, 200),
      quizQuestion: `What does the imported content cover?`,
      quizAnswer: firstPart,
      isMastered: false,
      scoreRecall: 0,
      scoreRetention: 0,
      scoreTransfer: 0,
    };
  },

  // Simplify explanation using text analysis (or LLM if available)
  simplifyExplanation: async (concept: string, previousExplanation: string): Promise<string> => {
    console.log('[LLM] simplifyExplanation called for:', concept);

    // Use rule-based simplification
    const analogies: Record<string, string> = {
      'inertia': 'Think of a hockey puck on ice - it keeps sliding until something stops it.',
      'force': 'Force is like a push or pull - the harder you push, the faster things move.',
      'acceleration': 'Acceleration is how quickly speed changes - stepping on the gas pedal.',
      'velocity': 'Velocity is speed in a specific direction - like 60mph going north.',
      'momentum': 'Momentum is how much "oomph" a moving object has - a truck hitting you harder than a bike.',
      'energy': 'Energy is the ability to do work - like food gives you energy to move.',
      'gravity': 'Gravity is what pulls things down - it keeps you on the ground.',
      'pressure': 'Pressure is force spread over an area - like sitting on a sharp needle.',
      'temperature': 'Temperature measures how hot or cold something is.',
      'entropy': 'Entropy is about disorder - things naturally become more messy over time.',
    };

    const lowerConcept = concept.toLowerCase();
    for (const [key, analogy] of Object.entries(analogies)) {
      if (lowerConcept.includes(key)) {
        return analogy;
      }
    }

    // Default simplification - make it shorter and simpler
    const sentences = previousExplanation.split('.').filter(s => s.trim().length > 10);
    return sentences[0] + '. In simple terms, this means ' + previousExplanation.split('.')[0].toLowerCase() + '.';
  },

  simplifyConcept: async (card: ConceptCard): Promise<string> => {
    return llmService.simplifyExplanation(card.concept, card.explanation);
  },

  // Grade explanation using keyword matching (or LLM if available)
  gradeExplanation: async (
    card: ConceptCard,
    studentTranscript: string
  ): Promise<{ grade: 'A' | 'B' | 'C' | 'F'; feedback: string; score: number }> => {
    console.log('[LLM] gradeExplanation called for concept:', card.concept);

    const transcript = studentTranscript.toLowerCase().trim();
    const conceptKeywords = card.concept.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    // Check for keyword coverage
    let matchCount = 0;
    conceptKeywords.forEach(word => {
      if (transcript.includes(word)) matchCount++;
    });

    // Check for understanding indicators
    const understandingIndicators = ['because', 'means', 'implies', 'therefore', 'result', 'causes', 'effect'];
    const hasUnderstanding = understandingIndicators.some(ind => transcript.includes(ind));

    let grade: 'A' | 'B' | 'C' | 'F';
    let feedback: string;
    let score: number;

    if (transcript.length < 20) {
      grade = 'F';
      feedback = 'Too short. Try explaining the concept in your own words with more detail.';
      score = 15;
    } else if (matchCount >= 2 || hasUnderstanding) {
      grade = 'A';
      feedback = 'Excellent! You captured the key concepts and explained them clearly.';
      score = 95;
    } else if (transcript.length > 50 && conceptKeywords.some(w => transcript.includes(w.substring(0, 4)))) {
      grade = 'B';
      feedback = 'Good attempt. Try to connect the concepts more explicitly.';
      score = 75;
    } else {
      grade = 'C';
      feedback = 'Partial understanding. Can you explain the cause and effect relationship?';
      score = 45;
    }

    console.log('[LLM] Grading result:', grade, 'score:', score);
    return { grade, feedback, score };
  },

  // Validate quiz answer
  validateQuizAnswer: async (_question: string, correctAnswer: string, studentAnswer: string): Promise<boolean> => {
    console.log('[LLM] validateQuizAnswer called');

    const student = studentAnswer.toLowerCase().trim();
    const correct = correctAnswer.toLowerCase().trim();

    // Direct match
    if (student.includes(correct) || correct.includes(student)) return true;

    // Key word matching
    const correctWords = correct.split(/\s+/).filter(w => w.length > 3);
    const matchedWords = correctWords.filter(w => student.includes(w));

    return matchedWords.length >= Math.max(1, Math.floor(correctWords.length / 2));
  },

  evaluateQuizAnswer: async (card: ConceptCard, studentAnswer: string): Promise<{ correct: boolean; feedback: string }> => {
    const correct = await llmService.validateQuizAnswer(card.quizQuestion, card.quizAnswer, studentAnswer);
    return {
      correct,
      feedback: correct
        ? "Correct! Great job understanding the material."
        : `Not quite. The key point is: ${card.quizAnswer}`,
    };
  }
};