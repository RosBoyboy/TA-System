import fs from 'fs';
import path from 'path';

import os from 'os';

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
 * Saves a base64 signature image to secure server storage.
 * @param userId The ID of the employee
 * @param base64Data The signature data URL or raw base64 string
 * @returns The relative storage path/filename
 */
export async function saveSignatureFile(userId: string, base64Data: string): Promise<string> {
  const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  let buffer: Buffer;

  if (matches && matches.length === 3) {
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    buffer = Buffer.from(base64Data, 'base64');
  }

  // Sanitize and generate unique filename
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `sig_${safeUserId}_${Date.now()}.png`;
  const filePath = path.join(STORAGE_DIR, filename);

  await fs.promises.writeFile(filePath, buffer);

  // Return the filename to store in the database
  return filename;
}

/**
 * Reads a signature file from secure storage.
 * @param filename The stored filename
 * @returns Buffer or null if not found
 */
export async function getSignatureBuffer(filename: string): Promise<Buffer | null> {
  try {
    const cleanFilename = path.basename(filename); // Prevent path traversal
    const filePath = path.join(STORAGE_DIR, cleanFilename);
    if (!fs.existsSync(filePath)) return null;
    return await fs.promises.readFile(filePath);
  } catch (err) {
    console.error('[Signature Storage] Read error:', err);
    return null;
  }
}
