import RNBlobUtil from 'react-native-blob-util';

// Decode PDF escape sequences and hex strings inside text streams
function decodePdfString(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

// Convert hex-encoded PDF string <hex> to readable text
function hexToString(hex: string): string {
  let str = '';
  for (let i = 0; i < hex.length - 1; i += 2) {
    const code = parseInt(hex.substring(i, i + 2), 16);
    if (code > 31 && code < 127) str += String.fromCharCode(code);
  }
  return str;
}

// Extract all readable text from raw PDF binary content
function extractTextFromPdfBinary(pdfContent: string): string {
  const textChunks: string[] = [];

  // Strategy 1: Extract content between BT (begin text) and ET (end text) markers
  const textBlockRegex = /BT[\s\S]*?ET/g;
  let blockMatch;
  while ((blockMatch = textBlockRegex.exec(pdfContent)) !== null) {
    const block = blockMatch[0];

    // Tj operator: (text)Tj or (text) Tj
    const tjRegex = /\(([^)]*(?:\\.)*[^)]*)\)\s*Tj/g;
    let m;
    while ((m = tjRegex.exec(block)) !== null) {
      const decoded = decodePdfString(m[1]).trim();
      if (decoded.length > 1) textChunks.push(decoded);
    }

    // TJ operator: [(text)(text)...]TJ — array of strings with kerning
    const tjArrayRegex = /\[((?:[^[\]]*(?:\([^)]*\)[^[\]]*)*)*)\]\s*TJ/g;
    while ((m = tjArrayRegex.exec(block)) !== null) {
      const inner = m[1];
      const strRegex = /\(([^)]*(?:\\.)*[^)]*)\)/g;
      let sm;
      let combined = '';
      while ((sm = strRegex.exec(inner)) !== null) {
        combined += decodePdfString(sm[1]);
      }
      if (combined.trim().length > 1) textChunks.push(combined.trim());
    }

    // Hex strings: <hex>Tj
    const hexTjRegex = /<([0-9a-fA-F]+)>\s*Tj/g;
    while ((m = hexTjRegex.exec(block)) !== null) {
      const decoded = hexToString(m[1]).trim();
      if (decoded.length > 1) textChunks.push(decoded);
    }
  }

  // Strategy 2: Fallback — extract all parenthesised strings from stream blocks
  if (textChunks.length < 3) {
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let sm;
    while ((sm = streamRegex.exec(pdfContent)) !== null) {
      const streamContent = sm[1];
      const parenRegex = /\(([^)]{3,150})\)/g;
      let pm;
      while ((pm = parenRegex.exec(streamContent)) !== null) {
        const text = decodePdfString(pm[1]).trim();
        // Only include strings that look like real readable text
        if (/[a-zA-Z]{3,}/.test(text) && text.length > 5) {
          textChunks.push(text);
        }
      }
    }
  }

  // Deduplicate consecutive identical chunks
  const unique: string[] = [];
  for (const chunk of textChunks) {
    if (unique[unique.length - 1] !== chunk) unique.push(chunk);
  }

  return unique.join(' ').replace(/\s{2,}/g, ' ').trim();
}

// Split extracted text into meaningful paragraph-level chunks
function chunkText(text: string, maxChunkLen = 400): string[] {
  if (!text.trim()) return [];

  // Split on sentence boundaries and double spaces (paragraph breaks)
  const sentences = text
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map(s => s.trim())
    .filter(s => s.length > 20);

  const chunks: string[] = [];
  let current = '';

  for (const sent of sentences) {
    if ((current + ' ' + sent).length > maxChunkLen && current) {
      chunks.push(current.trim());
      current = sent;
    } else {
      current = current ? current + ' ' + sent : sent;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.slice(0, 30); // max 30 chunks → max ~30 cards
}

export interface PdfReadResult {
  text: string;
  chunks: string[];
  pageCount: number;
}

export async function extractTextFromPdf(fileUri: string): Promise<PdfReadResult> {
  let path = fileUri;

  console.log('[PDF] Input URI:', fileUri);

  // Handle content:// URIs (from document picker)
  if (fileUri.startsWith('content://')) {
    try {
      // Copy to cache dir
      const dest = `${RNBlobUtil.fs.dirs.CacheDir}/flowdeck_import_${Date.now()}.pdf`;
      await RNBlobUtil.fs.cp(fileUri, dest);
      path = dest;
      console.log('[PDF] Copied to:', path);
    } catch (err) {
      console.error('[PDF] Error copying file:', err);
      throw new Error(`Failed to copy PDF: ${err}`);
    }
  } else if (fileUri.startsWith('file://')) {
    path = fileUri.replace('file://', '');
  }

  try {
    // Read the PDF file as utf8
    const rawContent = await RNBlobUtil.fs.readFile(path, 'utf8');

    // Try to extract text from the raw content
    const text = extractTextFromPdfBinary(rawContent);
    let chunks = chunkText(text);

    // If no chunks from binary parsing, use raw content directly
    if (chunks.length === 0) {
      chunks = chunkText(rawContent);
    }

    // Estimate page count from /Page objects in PDF metadata
    const pageMatches = rawContent.match(/\/Type\s*\/Page[^s]/g);
    const pageCount = pageMatches ? pageMatches.length : 1;

    console.log('[PDF] Extracted chunks:', chunks.length, 'pages:', pageCount);

    if (chunks.length === 0) {
      throw new Error('No readable text found in PDF');
    }

    return { text, chunks, pageCount };
  } catch (err) {
    console.error('[PDF] Error reading PDF:', err);
    throw new Error(`Failed to read PDF: ${err}`);
  }
}