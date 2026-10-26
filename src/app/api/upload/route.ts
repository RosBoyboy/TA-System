import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0h-ghZuNv6gwbWXAAcUdqg_NXpuvBQ9';
const supabase = createClient(supabaseUrl, supabaseKey);

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

    // 2. Strict Extension / Type Check (Only PDF and DOC/DOCX)
    const fileName = file.name || 'document';
    const ext = fileName.toLowerCase().split('.').pop() || '';
    const isPdf = ext === 'pdf' || file.type === 'application/pdf';
    const isDoc =
      ext === 'doc' ||
      ext === 'docx' ||
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isPdf && !isDoc) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported file format. Only PDF (.pdf) and Word documents (.doc, .docx) are allowed.',
        },
        { status: 400 }
      );
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `ta_attachments/${Date.now()}_${cleanFileName}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    let downloadUrl = '';

    // 3. Upload to Supabase Storage 'documents' bucket
    try {
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(storagePath, fileBuffer, {
          contentType: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream'),
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

    // Fallback if direct storage URL is empty (e.g. data URL for preview/download)
    if (!downloadUrl) {
      const mime = file.type || (isPdf ? 'application/pdf' : 'application/octet-stream');
      downloadUrl = `data:${mime};base64,${fileBuffer.toString('base64')}`;
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
