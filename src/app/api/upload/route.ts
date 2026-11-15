import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : (null as any);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // 1. Strict Size Check (25MB limit)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size (${formatFileSize(file.size)}) exceeds the maximum allowed limit of 25MB.`,
        },
        { status: 400 }
      );
    }

    // 2. Strict Extension & MIME Whitelist Check
    const fileName = file.name || 'document';
    const ext = fileName.toLowerCase().split('.').pop() || '';

    const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'doc']);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported file extension. Only PDF (.pdf) and Word documents (.doc, .docx) are allowed.',
        },
        { status: 400 }
      );
    }

    const ALLOWED_MIME_TYPES = new Set([
      'application/pdf',
      'application/x-pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/zip',
      'application/x-zip-compressed',
      'application/octet-stream',
      '',
    ]);

    if (file.type && !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported MIME type. Only official PDF (.pdf) and Word documents (.doc, .docx) are allowed.',
        },
        { status: 400 }
      );
    }

    // 3. Inspect Binary Magic Bytes to Prevent File Spoofing & Disguised Executables
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    if (fileBuffer.length < 4) {
      return NextResponse.json(
        { success: false, error: 'File is empty or corrupted.' },
        { status: 400 }
      );
    }

    const isPdfMagic = fileBuffer.slice(0, 4).toString('ascii') === '%PDF';
    const isDocxMagic =
      fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B &&
      (fileBuffer[2] === 0x03 || fileBuffer[2] === 0x05 || fileBuffer[2] === 0x07);
    const isDocMagic =
      fileBuffer[0] === 0xD0 && fileBuffer[1] === 0xCF &&
      fileBuffer[2] === 0x11 && fileBuffer[3] === 0xE0;

    let detectedType: 'pdf' | 'docx' | 'doc' | null = null;
    if (ext === 'pdf' && isPdfMagic) {
      detectedType = 'pdf';
    } else if (ext === 'docx' && isDocxMagic) {
      detectedType = 'docx';
    } else if (ext === 'doc' && (isDocMagic || isDocxMagic)) {
      detectedType = 'doc';
    }

    if (!detectedType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file signature. The file content does not match a valid PDF or Word document format.',
        },
        { status: 400 }
      );
    }

    const isPdf = detectedType === 'pdf';
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `ta_attachments/${Date.now()}_${cleanFileName}`;

    let downloadUrl = '';

    // 4. Upload to Supabase Storage 'documents' bucket
    try {
      const canonicalMime = isPdf
        ? 'application/pdf'
        : detectedType === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/msword';

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(storagePath, fileBuffer, {
          contentType: canonicalMime,
          upsert: true,
        });

      if (!uploadErr && uploadData) {
        const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(storagePath);
        downloadUrl = publicUrlData.publicUrl;
      } else {
        console.warn('[Upload API] Supabase storage upload warning:', uploadErr);
      }
    } catch (storageErr) {
      console.warn('[Upload API] Storage exception:', storageErr);
    }

    // Safe fallback if direct storage URL is empty (e.g. data URL for preview/download)
    if (!downloadUrl) {
      const safeMime = isPdf
        ? 'application/pdf'
        : detectedType === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/msword';
      downloadUrl = `data:${safeMime};base64,${fileBuffer.toString('base64')}`;
    }

    const attachmentData = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: fileName,
      type: isPdf ? 'PDF Document' : 'Word Document',
      size: formatFileSize(file.size),
      color: isPdf ? ('rose' as const) : ('blue' as const),
      icon: 'doc' as const,
      url: downloadUrl,
    };

    return NextResponse.json({
      success: true,
      data: attachmentData,
    });
  } catch (error: any) {
    console.error('[Upload API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal upload error' },
      { status: 500 }
    );
  }
}
