import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { generatePopulatedTravelOrderDocx } from '@/lib/travelOrderDocx';
import { TARequestDTO } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Request ID is required' }, { status: 400 });
    }

    const url = new URL(req.url);
    const format = url.searchParams.get('format');

    let requestData: any = null;

    try {
      requestData = await prisma.tARequest.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, section: true, position: true },
          },
          teamMembers: true,
          approvalSteps: {
            orderBy: { order: 'asc' },
            include: {
              approver: {
                select: { id: true, name: true, email: true, position: true, role: true },
              },
            },
          },
        },
      });
    } catch (err) {
      console.warn('[GET Travel Order] Prisma query fallback to Supabase...', err);
      const { data } = await supabase
        .from('TARequest')
        .select('*, createdBy:User!createdById(id, name, email, section, position), teamMembers:TARequestMember(*), approvalSteps:ApprovalStep(*)')
        .eq('id', id)
        .single();
      requestData = data;
    }

    if (!requestData) {
      return NextResponse.json({ success: false, error: 'Travel Authority record not found' }, { status: 404 });
    }

    // Strictly ensure only APPROVED Travel Authorities can generate finalized Travel Orders
    const isApproved =
      requestData.status === 'APPROVED' ||
      (Array.isArray(requestData.approvalSteps) &&
        requestData.approvalSteps.length >= 3 &&
        requestData.approvalSteps.every((s: any) => s.action === 'APPROVED'));

    if (!isApproved) {
      return NextResponse.json(
        {
          success: false,
          error: 'Travel Order is not yet available. The request must be fully approved by all 3 verifiers (Section Chief, Division Chief, and Head of PENRO).',
        },
        { status: 403 }
      );
    }

    // If docx download requested
    if (format === 'docx') {
      const docxBuffer = await generatePopulatedTravelOrderDocx(requestData as TARequestDTO);
      const filename = `${(requestData.trackingNumber || 'Travel_Order').replace('TA-', 'TO-')}_Approved.docx`;

      return new Response(new Uint8Array(docxBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: requestData,
    });
  } catch (error: any) {
    console.error('[GET Travel Order Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
