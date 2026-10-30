import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const STORAGE_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'signatures')
  : path.join(process.cwd(), 'storage', 'signatures');

// Ensure storage directory exists without crashing on read-only environments
try {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[Signature Storage] Note: Could not create local directory during module evaluation:', e);
}

/**
 * Saves an e-signature.
 * In local development, saves to disk cache.
 * In cloud/serverless environments (like Vercel), returns the self-contained data URI
 * so the signature permanently persists in PostgreSQL and is never lost across serverless cold starts.
 * @param userId The ID of the employee
 * @param base64Data The signature data URL or raw base64 string
 * @returns The persistent signature data URL / storage reference
 */
export async function saveSignatureFile(userId: string, base64Data: string): Promise<string> {
  const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  let buffer: Buffer;

  if (matches && matches.length === 3) {
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    buffer = Buffer.from(base64Data, 'base64');
  }

  // Attempt local disk cache write (best-effort, non-blocking)
  try {
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `sig_${safeUserId}_${Date.now()}.png`;
    const filePath = path.join(STORAGE_DIR, filename);
    await fs.promises.writeFile(filePath, buffer);
  } catch (e) {
    console.warn('[Signature Storage] Local disk write skipped or unsupported:', e);
  }

  // Normalize and return standard data URI so signature is completely resilient in PostgreSQL
  const normalizedDataUrl = base64Data.startsWith('data:')
    ? base64Data
    : `data:image/png;base64,${base64Data}`;

  return normalizedDataUrl;
}

/**
 * Reads a signature buffer from either data URI or local storage file.
 * @param filenameOrData The stored filename or data URL
 * @returns Buffer or null if not found
 */
export async function getSignatureBuffer(filenameOrData: string): Promise<Buffer | null> {
  try {
    if (!filenameOrData) return null;

    // Direct base64 Data URL decoding
    if (filenameOrData.startsWith('data:')) {
      const matches = filenameOrData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches && matches[2]) {
        return Buffer.from(matches[2], 'base64');
      }
      const rawBase64 = filenameOrData.split(',')[1] || filenameOrData;
      return Buffer.from(rawBase64, 'base64');
    }

    // Local file fallback
    const cleanFilename = path.basename(filenameOrData); // Prevent path traversal
    const filePath = path.join(STORAGE_DIR, cleanFilename);
    if (!fs.existsSync(filePath)) return null;
    return await fs.promises.readFile(filePath);
  } catch (err) {
    console.error('[Signature Storage] Read error:', err);
    return null;
  }
}
