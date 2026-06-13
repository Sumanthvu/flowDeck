// On-device LLM service interface for FlowDeck

export interface ConceptCard {
  id: string;
  concept: string;
  explanation: string;
  quizQuestion: string;
  quizAnswer: string;
  alternateExplanation?: string;
  isMastered: boolean;
  scoreRecall: number;    // Axis 1: cold recall
  scoreRetention: number; // Axis 2: spaced repetition
  scoreTransfer: number;  // Axis 3: Socratic voice loop
}

export interface Deck {
  id: string;
  title: string;
  cards: ConceptCard[];
}

// Default mock datasets so the app works out-of-the-box
const MOCK_DECKS: Deck[] = [
  {
    id: 'phys-1',
    title: 'Newtonian Physics (Mechanics)',
    cards: [
      {
        id: 'p-1',
        concept: 'Newton\'s First Law (Inertia)',
        explanation: 'An object will remain at rest or move at a constant velocity unless acted upon by a net external force.',
        quizQuestion: 'Why do you slide forward when a car suddenly brakes?',
        quizAnswer: 'Inertia. Your body wants to keep moving at the car\'s original speed.',
        isMastered: false,
        scoreRecall: 0,
        scoreRetention: 0,
        scoreTransfer: 0,
      },
      {
        id: 'p-2',
        concept: 'Newton\'s Second Law (F = ma)',
        explanation: 'The acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass.',
        quizQuestion: 'If you double the force on an object, what happens to its acceleration?',
        quizAnswer: 'It doubles.',
        isMastered: false,
        scoreRecall: 0,
        scoreRetention: 0,
        scoreTransfer: 0,
      },
      {
        id: 'p-3',
        concept: 'Newton\'s Third Law (Action & Reaction)',
        explanation: 'For every action force, there is an equal and opposite reaction force acting on a different object.',
        quizQuestion: 'How does a rocket propel itself forward in the vacuum of space?',
        quizAnswer: 'By pushing exhaust gas backward; the reaction force pushes the rocket forward.',
        isMastered: false,
        scoreRecall: 0,
        scoreRetention: 0,
        scoreTransfer: 0,
      },
      {
        id: 'p-4',
        concept: 'Centripetal Force',
        explanation: 'A force that makes a body follow a curved path, directed inwards toward the center of curvature.',
        quizQuestion: 'What force keeps a satellite in orbit around the Earth?',
        quizAnswer: 'Gravity (acting as the centripetal force).',
        isMastered: false,
        scoreRecall: 0,
        scoreRetention: 0,
        scoreTransfer: 0,
      },
      {
        id: 'p-5',
        concept: 'Law of Conservation of Momentum',
        explanation: 'The total linear momentum of a closed system remains constant if no external forces act on it.',
        quizQuestion: 'What happens to the total momentum when two billiard balls collide?',
        quizAnswer: 'It remains the same (momentum is transferred, not lost).',
        isMastered: false,
        scoreRecall: 0,
        scoreRetention: 0,
        scoreTransfer: 0,
      }
    ]
  },
  {
    id: 'cs-1',
    title: 'Data Structures (Trees)',
    cards: [
      {
        id: 'c-1',
        concept: 'Binary Search Tree (BST)',
        explanation: 'A node-based tree structure where the left subtree contains values less than the parent, and the right contains greater.',
        quizQuestion: 'In a BST, where would you insert a node smaller than the root?',
        quizAnswer: 'In the left subtree.',
        isMastered: false,
        scoreRecall: 0,
        scoreRetention: 0,
        scoreTransfer: 0,
      },
      {
        id: 'c-2',
        concept: 'In-Order Traversal',
        explanation: 'A traversal method that visits nodes in the order: Left, Root, Right. Visited in sorted order for BSTs.',
        quizQuestion: 'What traversal of a BST gives elements in ascending sorted order?',
        quizAnswer: 'In-Order Traversal.',
        isMastered: false,
        scoreRecall: 0,
        scoreRetention: 0,
        scoreTransfer: 0,
      },
      {
        id: 'c-3',
        concept: 'Depth-First Search (DFS)',
        explanation: 'An algorithm for traversing tree/graph structures starting from the root and exploring as deep as possible along each branch.',
        quizQuestion: 'Which data structure is typically used to implement DFS iteratively?',
        quizAnswer: 'A Stack.',
        isMastered: false,
        scoreRecall: 0,
        scoreRetention: 0,
        scoreTransfer: 0,
      },
      {
        id: 'c-4',
        concept: 'Breadth-First Search (BFS)',
        explanation: 'A traversal method that visits all nodes at the current depth level before moving to nodes at the next level.',
        quizQuestion: 'Which data structure is used to implement BFS traversal?',
        quizAnswer: 'A Queue.',
        isMastered: false,
        scoreRecall: 0,
        scoreRetention: 0,
        scoreTransfer: 0,
      },
      {
        id: 'c-5',
        concept: 'Tree Balancing (AVL)',
        explanation: 'Self-balancing binary search tree where the height difference of any node\'s subtrees is at most one.',
        quizQuestion: 'Why do we need self-balancing trees like AVL or Red-Black trees?',
        quizAnswer: 'To guarantee O(log n) time complexity for search, insert, and delete.',
        isMastered: false,
        scoreRecall: 0,
        scoreRetention: 0,
        scoreTransfer: 0,
      }
    ]
  }
];

let isLlamaLoaded = false;

export const llmService = {
  // Load model hook (runs once on startup)
  loadModel: async (): Promise<boolean> => {
    if (isLlamaLoaded) return true;
    
    // Simulate model loading latency (1.5 seconds)
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    isLlamaLoaded = true;
    console.log('On-device LLM (Qwen-1.5B) loaded into RAM successfully.');
    return true;
  },

  // Get list of all decks (mock storage)
  getDecks: async (): Promise<Deck[]> => {
    return MOCK_DECKS;
  },

  // Clear all decks from memory
  clearAllDecks: async (): Promise<void> => {
    MOCK_DECKS.length = 0;
  },

  // Simulate text chunk parsing to cards (Feynman Chunking)
  generateCardsFromText: async (title: string, rawText: string): Promise<Deck> => {
    // Simulate processing delay (3 seconds on iQOO NPU)
    await new Promise<void>((resolve) => setTimeout(resolve, 3000));

    // Simple parser that splits rawText by lines or paragraphs to mock cards
    const lines = rawText.split('\n').filter(l => l.trim().length > 15);
    const cards: ConceptCard[] = lines.slice(0, 5).map((line, idx) => {
      return {
        id: `gen-${Date.now()}-${idx}`,
        concept: line.substring(0, 25) + '...',
        explanation: line,
        quizQuestion: `Explain what this sentence means: "${line.substring(0, 30)}..."?`,
        quizAnswer: line,
        isMastered: false,
        scoreRecall: 0,
        scoreRetention: 0,
        scoreTransfer: 0,
      };
    });

    // Fallback if text is too short
    if (cards.length === 0) {
      cards.push({
        id: `gen-fallback`,
        concept: 'Custom Text Concept',
        explanation: rawText,
        quizQuestion: 'Summarize the core meaning of the custom text you provided.',
        quizAnswer: rawText,
        isMastered: false,
        scoreRecall: 0,
        scoreRetention: 0,
        scoreTransfer: 0,
      });
    }

    const newDeck: Deck = {
      id: `deck-${Date.now()}`,
      title: title || 'Custom Document Feed',
      cards,
    };
    MOCK_DECKS.push(newDeck);
    return newDeck;
  },

  // Simplify explanation (Swipe Left - Feynman Simplification)
  simplifyExplanation: async (concept: string, previousExplanation: string): Promise<string> => {
    // Simulate generation latency (1.2 seconds)
    await new Promise<void>((resolve) => setTimeout(resolve, 1200));

    // Simple analogies mapping
    const analogies: Record<string, string> = {
      'Newton\'s First Law (Inertia)': 'Think of sliding on ice: once you slide, you keep going forever until friction (an external force) stops you.',
      'Newton\'s Second Law (F = ma)': 'Think of pushing a light shopping cart vs a heavy truck. The heavy truck takes a lot more muscle (force) to speed up.',
      'Newton\'s Third Law (Action & Reaction)': 'Think of blowing up a balloon and letting it go. The air rushes out down (action), pushing the balloon up (reaction).',
      'Binary Search Tree (BST)': 'Like looking up a name in a phone book: if the name is after \'M\', you ignore the left half and search the right half.',
    };

    return analogies[concept] || `Simply put: ${previousExplanation.split('.')[0]}. It's like water flowing downhill—it naturally takes the path of least resistance.`;
  },

  simplifyConcept: async (card: ConceptCard): Promise<string> => {
    return llmService.simplifyExplanation(card.concept, card.explanation);
  },

  // Socratic Voice grading (Feynman Loop)
  gradeExplanation: async (
    card: ConceptCard,
    studentTranscript: string
  ): Promise<{ grade: 'A' | 'B' | 'C' | 'F'; feedback: string; score: number }> => {
    // Simulate analysis latency (1.8 seconds)
    await new Promise<void>((resolve) => setTimeout(resolve, 1800));

    const transcript = studentTranscript.toLowerCase();
    const keywords = card.concept.toLowerCase().split(' ');
    
    // Simple mock logic scoring keyword match
    let matchCount = 0;
    keywords.forEach(word => {
      if (word.length > 3 && transcript.includes(word)) matchCount++;
    });

    let grade: 'A' | 'B' | 'C' | 'F' = 'C';
    let feedback = '';
    let score = 50;

    if (transcript.length < 10) {
      grade = 'F';
      feedback = 'I couldn\'t hear much details. Try explaining the core physical or coding rules in more sentences.';
      score = 15;
    } else if (matchCount >= 2 || transcript.includes('because') || transcript.includes('tells')) {
      grade = 'A';
      feedback = 'Excellent explanation! You captured the main logic and connected it well. Mastery complete.';
      score = 95;
    } else if (transcript.length > 25) {
      grade = 'B';
      feedback = 'Good attempt. But can you explain what happens to the *forces* or *values* in this scenario specifically?';
      score = 75;
    } else {
      grade = 'C';
      feedback = 'Partial understanding. Think about the direct relation and try stating it again.';
      score = 45;
    }

    return { grade, feedback, score };
  },

  // Validate Quiz Card answers
  validateQuizAnswer: async (question: string, correctAnswer: string, studentAnswer: string): Promise<boolean> => {
    // Simulate quick classification (0.6 seconds)
    await new Promise<void>((resolve) => setTimeout(resolve, 600));

    const student = studentAnswer.toLowerCase().trim();
    const correct = correctAnswer.toLowerCase().trim();

    // Check direct matching or general semantic equivalence
    if (student.includes(correct) || correct.includes(student)) return true;

    // Standard short word patterns
    if (correct === 'it doubles' && (student.includes('double') || student.includes('x2') || student.includes('2x'))) return true;
    if (correct.includes('inertia') && student.includes('inertia')) return true;
    if (correct.includes('left') && student.includes('left')) return true;
    if (correct.includes('queue') && student.includes('queue')) return true;
    if (correct.includes('stack') && student.includes('stack')) return true;

    // Simple heuristic
    return student.length > 3 && (correct.includes(student.substring(0, 4)) || student.includes(correct.substring(0, 4)));
  },

  evaluateQuizAnswer: async (card: ConceptCard, studentAnswer: string): Promise<{ correct: boolean; feedback: string }> => {
    const correct = await llmService.validateQuizAnswer(card.quizQuestion, card.quizAnswer, studentAnswer);
    return {
      correct,
      feedback: correct 
        ? "Excellent! Your answer is spot on." 
        : `Not quite. The correct concept is: ${card.quizAnswer}.`
    };
  }
};
