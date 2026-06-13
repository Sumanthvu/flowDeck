// On-device Whisper speech-to-text service interface for FlowDeck

let isRecording = false;
let recordTimer: any = null;
let recordingSeconds = 0;

export const whisperService = {
  // Start recording mock audio
  startRecording: async (onTick: (seconds: number) => void): Promise<boolean> => {
    if (isRecording) return false;

    isRecording = true;
    recordingSeconds = 0;
    
    recordTimer = setInterval(() => {
      recordingSeconds++;
      onTick(recordingSeconds);
    }, 1000);

    console.log('On-device audio recording started.');
    return true;
  },

  // Stop recording and return a mock audio file path
  stopRecording: async (): Promise<string> => {
    if (!isRecording) return '';

    if (recordTimer) {
      clearInterval(recordTimer);
      recordTimer = null;
    }
    
    isRecording = false;
    console.log(`Audio recording stopped. Duration: ${recordingSeconds}s`);
    return `file:///storage/emulated/0/Android/data/com.flowdeck/cache/audio_${Date.now()}.wav`;
  },

  // Transcribe local audio to text (offline Whisper)
  transcribeAudio: async (
    _audioPath: string,
    concept: string
  ): Promise<string> => {
    // Simulate Whisper model inference latency (1.2 seconds)
    await new Promise<void>((resolve) => setTimeout(resolve, 1200));

    // Preset transcript answers matching our default mock dataset
    const transcripts: Record<string, string> = {
      'Newton\'s First Law (Inertia)': 'inertia tells us that bodies want to keep moving at the same speed and in the same direction unless they are forced to change by some outside force',
      'Newton\'s Second Law (F = ma)': 'force is mass times acceleration so if you double the force the acceleration will also double because mass is constant',
      'Newton\'s Third Law (Action & Reaction)': 'for every action there is a react force that is equal and opposite in direction which acts on another object',
      'Binary Search Tree (BST)': 'a binary search tree holds elements where the left nodes are smaller than the parent and the right nodes are larger than the parent',
      'In-Order Traversal': 'in order traversal visits nodes left then root then right and it visits elements in ascending order in a binary search tree'
    };

    return transcripts[concept] || "I think the concept explains that when you apply force, it results in a direct change in speed or acceleration depending on the mass of the object.";
  }
};
