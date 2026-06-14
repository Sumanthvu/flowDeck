// On-device Whisper speech-to-text service interface for FlowDeck
// @ts-ignore
import { initWhisper, WhisperContext } from 'whisper.rn';
import RNBlobUtil from 'react-native-blob-util';
// @ts-ignore
import LiveAudioStream from '@fugood/react-native-audio-pcm-stream';
import { PermissionsAndroid, Platform } from 'react-native';

const WHISPER_MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin';
const WHISPER_MODEL_PATH = `${RNBlobUtil.fs.dirs.DocumentDir}/ggml-tiny.en.bin`;
const AUDIO_RECORD_PATH = `${RNBlobUtil.fs.dirs.CacheDir}/recording.wav`;

let whisperContext: WhisperContext | null = null;
let isModelLoading = false;
let isRecording = false;
let recordTimer: any = null;
let recordingSeconds = 0;

// Simple WAV header creation helper for mono 16-bit PCM audio
function writeWavHeader(numSamples: number, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  /* RIFF identifier */
  view.setUint32(0, 0x52494646, false); // "RIFF"
  /* file length */
  view.setUint32(4, 36 + numSamples * 2, true);
  /* RIFF type */
  view.setUint32(8, 0x57415645, false); // "WAVE"
  /* format chunk identifier */
  view.setUint32(12, 0x666d7420, false); // "fmt "
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true); // Mono
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  view.setUint32(36, 0x64617461, false); // "data"
  /* data chunk length */
  view.setUint32(40, numSamples * 2, true);

  return buffer;
}

// Temporary in-memory audio buffer while recording
let recordedChunks: string[] = [];

async function requestRecordPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'FlowDeck needs access to your microphone to transcribe speech.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn(err);
    return false;
  }
}

export const whisperService = {
  // Check if model exists locally
  isModelDownloaded: async (): Promise<boolean> => {
    return RNBlobUtil.fs.exists(WHISPER_MODEL_PATH);
  },

  // Download and load the Whisper model
  loadModel: async (onProgress?: (progress: number, text: string) => void): Promise<boolean> => {
    if (whisperContext) return true;
    if (isModelLoading) return false;

    isModelLoading = true;
    console.log('[Whisper] loadModel called');

    try {
      const exists = await RNBlobUtil.fs.exists(WHISPER_MODEL_PATH);
      if (!exists) {
        console.log('[Whisper] Model not found locally. Starting download...');
        if (onProgress) onProgress(0, 'Downloading Voice Model (75MB)...');

        await RNBlobUtil.config({
          path: WHISPER_MODEL_PATH,
        })
          .fetch('GET', WHISPER_MODEL_URL)
          .progress((received: string | number, total: string | number) => {
            const rec = Number(received);
            const tot = Number(total);
            const progress = tot > 0 ? rec / tot : 0;
            if (onProgress) {
              onProgress(progress, `Downloading Voice Model (${Math.round(progress * 100)}%)...`);
            }
          });
        console.log('[Whisper] Download completed successfully');
      }

      if (onProgress) onProgress(1, 'Initializing Voice Engine...');
      console.log('[Whisper] Initializing whisper.rn with model:', WHISPER_MODEL_PATH);

      whisperContext = await initWhisper({
        filePath: WHISPER_MODEL_PATH,
        useGpu: false, // Default to CPU for reliability
      });

      console.log('[Whisper] Model loaded successfully');
      if (onProgress) onProgress(1, 'Voice Engine Ready');
      return true;
    } catch (err) {
      console.log('[Whisper] Model failed to load/download:', err);
      try {
        const exists = await RNBlobUtil.fs.exists(WHISPER_MODEL_PATH);
        if (exists) {
          await RNBlobUtil.fs.unlink(WHISPER_MODEL_PATH);
        }
      } catch (cleanupErr) {
        console.log('[Whisper] Cleanup failed:', cleanupErr);
      }
      whisperContext = null;
      if (onProgress) onProgress(0, `Error: ${err instanceof Error ? err.message : err}`);
      return false;
    } finally {
      isModelLoading = false;
    }
  },

  // Start recording using @fugood/react-native-audio-pcm-stream
  startRecording: async (onTick: (seconds: number) => void): Promise<boolean> => {
    if (isRecording) return false;

    const hasPermission = await requestRecordPermission();
    if (!hasPermission) {
      console.log('[Whisper] Microphone permission denied');
      return false;
    }

    // Reset chunks
    recordedChunks = [];
    isRecording = true;
    recordingSeconds = 0;

    try {
      LiveAudioStream.init({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6, // VOICE_RECOGNITION
        bufferSize: 4096,
      });

      LiveAudioStream.on('data', (base64Chunk: string) => {
        recordedChunks.push(base64Chunk);
      });

      LiveAudioStream.start();

      recordTimer = setInterval(() => {
        recordingSeconds++;
        onTick(recordingSeconds);
      }, 1000);

      console.log('[Whisper] Voice recording started');
      return true;
    } catch (err) {
      console.error('[Whisper] Failed to start recording:', err);
      isRecording = false;
      return false;
    }
  },

  // Stop recording, construct WAV file, and return the path
  stopRecording: async (): Promise<string> => {
    if (!isRecording) return '';

    if (recordTimer) {
      clearInterval(recordTimer);
      recordTimer = null;
    }

    isRecording = false;
    console.log(`[Whisper] Stop recording. Duration: ${recordingSeconds}s`);

    try {
      LiveAudioStream.stop();
      
      // Construct a single binary WAV buffer from base64 chunks
      const sampleRate = 16000;
      let totalSamples = 0;
      const buffers = recordedChunks.map((base64) => {
        const binaryString = RNBlobUtil.base64.decode(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        totalSamples += len / 2; // 16-bit audio = 2 bytes per sample
        return bytes;
      });

      const headerBuffer = writeWavHeader(totalSamples, sampleRate);
      const headerView = new Uint8Array(headerBuffer);

      // Create destination file with WAV header
      await RNBlobUtil.fs.writeFile(AUDIO_RECORD_PATH, Array.from(headerView), 'ascii');

      // Append raw audio chunks
      for (const buffer of buffers) {
        await RNBlobUtil.fs.appendFile(AUDIO_RECORD_PATH, Array.from(buffer), 'ascii');
      }

      console.log('[Whisper] Recording saved to:', AUDIO_RECORD_PATH);
      return AUDIO_RECORD_PATH;
    } catch (err) {
      console.error('[Whisper] Failed to process recorded audio:', err);
      return '';
    }
  },

  // Transcribe local audio using downloaded offline Whisper model
  transcribeAudio: async (
    audioPath: string,
    _concept: string
  ): Promise<string> => {
    // Ensure model is loaded first (will use cache/download if not present)
    if (!whisperContext) {
      const loaded = await whisperService.loadModel();
      if (!loaded || !whisperContext) {
        console.log('[Whisper] Whisper model not loaded.');
        throw new Error("Voice model could not be loaded. Please ensure it is downloaded and try again.");
      }
    }

    try {
      console.log('[Whisper] Transcribing path:', audioPath);
      const { promise } = whisperContext.transcribe(audioPath, {
        language: 'en',
        maxLen: 0,
      });

      const result = await promise;
      console.log('[Whisper] Transcription result:', result.result);
      const text = result.result.trim();
      if (!text) {
        throw new Error("No speech detected. Please speak louder and clearer.");
      }
      return text;
    } catch (err) {
      console.error('[Whisper] Transcription failed:', err);
      throw new Error(err instanceof Error ? err.message : "Transcription error occurred. Please try speaking clearly.");
    }
  }
};

