import { NextResponse } from 'next/server';
import { generateStaticMapPng } from '@/lib/email-map';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const latStr = url.searchParams.get('lat');
    const lngStr = url.searchParams.get('lng');
    const label = url.searchParams.get('label') || 'Destination Location';

    const lat = latStr ? parseFloat(latStr) : 8.976;
    const lng = lngStr ? parseFloat(lngStr) : 125.408;

    const buffer = await generateStaticMapPng({ lat, lng, label, width: 600, height: 240 });

    if (!buffer) {
      return new NextResponse('Failed to generate map image', { status: 500 });
    }

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error: any) {
    console.error('[API map-image error]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
