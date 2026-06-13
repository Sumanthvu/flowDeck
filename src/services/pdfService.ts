import RNBlobUtil from 'react-native-blob-util';
import { pick, types } from '@react-native-documents/picker';
import PdfToImage from 'react-native-pdf-to-image';
import TextRecognition from '@react-native-ml-kit/text-recognition';

export interface PdfReadResult {
  text: string;
  chunks: string[];
  pageCount: number;
}

export interface PdfExtractionOptions {
  startPage?: number; // 1-based, defaults to 1
  endPage?: number;   // 1-based, defaults to last page
}

// ---------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------

export function chunkText(text: string): string[] {
  if (!text.trim()) return [];

  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  const CHUNK_SIZE = 1000;
  const OVERLAP = 200;

  let startIndex = 0;

  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + CHUNK_SIZE, words.length);
    const chunk = words.slice(startIndex, endIndex).join(' ');

    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }

    startIndex += CHUNK_SIZE - OVERLAP;

    if (startIndex >= words.length - OVERLAP) {
      break;
    }
  }

  return chunks;
}

// ---------------------------------------------------------------------
// Topic text input
// ---------------------------------------------------------------------

export function extractTextFromTopicInput(topicName: string, topicContext: string): PdfReadResult {
  const heading = topicName.trim();
  const body = topicContext.trim();

  if (!body) {
    throw new Error('Topic context is empty. Please enter some text to generate flashcards from.');
  }

  const combined = heading ? `${heading}:\n\n${body}` : body;
  const chunks = chunkText(combined);

  if (chunks.length === 0) {
    throw new Error('Could not split the entered text into meaningful sections.');
  }

  return { text: combined, chunks, pageCount: 1 };
}

// ---------------------------------------------------------------------
// PDF upload
// ---------------------------------------------------------------------

export async function pickPdfFile(): Promise<string | null> {
  try {
    const [result] = await pick({
      type: [types.pdf],
      copyTo: 'cachesDirectory',
    });

    return result.uri;
  } catch (err: any) {
    // User cancelled
    if (err && typeof err === 'object' && 'code' in err) {
      return null;
    }
    throw new Error(`Failed to pick PDF file: ${err}`);
  }
}



// ---------------------------------------------------------------------
// OCR extraction (scanned PDFs) — processed page-by-page, batch at a time
// ---------------------------------------------------------------------

/**
 * Renders and OCRs a PDF file.
 * Each page image is deleted right after OCR runs on it.
 */
async function extractTextWithOCR(filePath: string): Promise<{ text: string; pageCount: number }> {
  console.log('[PDF] Extracting text with OCR...');

  let fullText = '';
  let pageCount = 0;

  // Native PdfToImage.convert expects a Uri string starting with file:// or content:// on Android
  const fileUriForNative = filePath.startsWith('file://') || filePath.startsWith('content://')
    ? filePath
    : `file://${filePath}`;

  let result: any;
  try {
    result = await PdfToImage.convert(fileUriForNative);
  } catch (err) {
    throw err;
  }

  const pageImages: string[] = Array.isArray(result) ? result : (result.outputFiles || []);

  if (pageImages.length === 0) {
    throw new Error('Could not render any pages from this PDF for OCR.');
  }

  for (let i = 0; i < pageImages.length; i++) {
    const imagePath = pageImages[i];
    
    // Native TextRecognition.recognize also expects a Uri string
    const imageUriForNative = imagePath.startsWith('file://') || imagePath.startsWith('content://')
      ? imagePath
      : `file://${imagePath}`;

    const recognized = await TextRecognition.recognize(imageUriForNative);
    console.log(`[OCR-DEBUG] PAGE ${i + 1}/${pageImages.length} EXTRACTED TEXT:\n--------------------\n${recognized.text}\n--------------------`);
    fullText += recognized.text + '\n\n';
    pageCount++;

    // RNBlobUtil.fs.unlink expects a raw filepath without file:// prefix
    const rawImagePath = imagePath.replace('file://', '');
    await RNBlobUtil.fs.unlink(rawImagePath).catch(() => {});
  }

  console.log('[PDF] OCR processed pages 1 -', pageCount);
  console.log('[PDF] OCR extracted', fullText.length, 'characters across', pageCount, 'pages');

  return { text: fullText.trim(), pageCount };
}

// ---------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------

export async function extractTextFromPdf(
  fileUri: string,
  options: PdfExtractionOptions = {}
): Promise<PdfReadResult> {
  let path = fileUri;

  console.log('[PDF] Starting extraction (OCR-only) for:', fileUri);

  if (fileUri.startsWith('content://')) {
    try {
      const dest = `${RNBlobUtil.fs.dirs.CacheDir}/flowdeck_import_${Date.now()}.pdf`;
      await RNBlobUtil.fs.cp(fileUri, dest);
      path = dest;
      console.log('[PDF] Copied to cache:', path);
    } catch (err) {
      throw new Error(`Failed to copy PDF: ${err}`);
    }
  } else if (fileUri.startsWith('file://')) {
    path = fileUri.replace('file://', '');
  }

  let text = '';
  let pageCount = 0;

  try {
    const ocrResult = await extractTextWithOCR(path);
    text = ocrResult.text;
    pageCount = ocrResult.pageCount;
  } catch (err) {
    throw new Error(
      `Unable to extract text from this PDF.\n\n` +
      `OCR extraction failed: ${err}`
    );
  }

  const chunks = chunkText(text);
  console.log('[PDF] Created', chunks.length, 'semantic chunks');

  if (chunks.length === 0) {
    throw new Error('No readable text found in PDF.');
  }

  console.log('[PDF] Success! Pages:', pageCount, 'Chunks:', chunks.length);

  return { text, chunks, pageCount };
}

export async function convertPdfToImages(fileUri: string): Promise<string[]> {
  let path = fileUri;
  console.log('[PDF] Converting PDF to images:', fileUri);

  if (fileUri.startsWith('content://')) {
    try {
      const dest = `${RNBlobUtil.fs.dirs.CacheDir}/flowdeck_import_${Date.now()}.pdf`;
      await RNBlobUtil.fs.cp(fileUri, dest);
      path = dest;
      console.log('[PDF] Copied to cache for conversion:', path);
    } catch (err) {
      throw new Error(`Failed to copy PDF: ${err}`);
    }
  } else if (fileUri.startsWith('file://')) {
    path = fileUri.replace('file://', '');
  }

  const fileUriForNative = path.startsWith('file://') || path.startsWith('content://')
    ? path
    : `file://${path}`;

  const result = await PdfToImage.convert(fileUriForNative);
  const pageImages: string[] = Array.isArray(result) ? result : (result.outputFiles || []);

  if (pageImages.length === 0) {
    throw new Error('Could not convert PDF to images.');
  }

  return pageImages;
}

export async function ocrPageImages(imagePaths: string[]): Promise<string> {
  console.log('[PDF] Running OCR on batch of page images, size:', imagePaths.length);
  let fullText = '';

  for (const imagePath of imagePaths) {
    const imageUriForNative = imagePath.startsWith('file://') || imagePath.startsWith('content://')
      ? imagePath
      : `file://${imagePath}`;

    try {
      const recognized = await TextRecognition.recognize(imageUriForNative);
      console.log(`[OCR-DEBUG] BATCH PAGE (${imagePath}) EXTRACTED TEXT:\n--------------------\n${recognized.text}\n--------------------`);
      fullText += recognized.text + '\n\n';
    } catch (err) {
      console.log(`[PDF] OCR failed for page image ${imagePath}:`, err);
    } finally {
      // Always delete the image file right after processing to free disk space
      const rawImagePath = imagePath.replace('file://', '');
      await RNBlobUtil.fs.unlink(rawImagePath).catch(() => {});
    }
  }

  return fullText.trim();
}

export function chunkTextIntoWindows(text: string): string[] {
  if (!text || !text.trim()) return [];

  // Split text into sentences using punctuation boundaries
  const sentences = text
    .replace(/([.!?])\s+/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 5);

  if (sentences.length === 0) return [];

  const chunks: string[] = [];
  const WINDOW_SIZE = 5;
  const SLIDE_SIZE = 3; // Overlap of 2 sentences

  for (let i = 0; i < sentences.length; i += SLIDE_SIZE) {
    const windowSentences = sentences.slice(i, i + WINDOW_SIZE);
    const chunk = windowSentences.join(' ').trim();
    if (chunk.length > 35) {
      chunks.push(chunk);
    }
    if (i + WINDOW_SIZE >= sentences.length) {
      break;
    }
  }

  return chunks;
}