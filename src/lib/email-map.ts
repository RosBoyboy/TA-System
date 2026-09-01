import sharp from 'sharp';

interface GenerateMapParams {
  lat: number;
  lng: number;
  label?: string;
  width?: number;
  height?: number;
}

/**
 * Returns a fallback public ArcGIS World Topographic Map URL
 */
export function getStaticMapUrl(lat: number, lng: number, width = 600, height = 240): string {
  const dLng = 0.045;
  const dLat = 0.025;
  const minLng = (lng - dLng).toFixed(5);
  const maxLng = (lng + dLng).toFixed(5);
  const minLat = (lat - dLat).toFixed(5);
  const maxLat = (lat + dLat).toFixed(5);
  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  return `https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=png&f=image`;
}

/**
 * Generates an institutional-grade static map image buffer with an official DENR green pin
 * and location label centered on the exact coordinates, matching the ETAPS specification.
 */
export async function generateStaticMapPng({
  lat,
  lng,
  label = 'Destination Location',
  width = 600,
  height = 240,
}: GenerateMapParams): Promise<Buffer | null> {
  try {
    const mapUrl = getStaticMapUrl(lat, lng, width, height);

    const res = await fetch(mapUrl, {
      headers: { 'User-Agent': 'TAPS-App/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    let baseBuffer: Buffer;
    if (res.ok) {
      baseBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      // Graceful fallback base image (subtle topographic contour background)
      baseBuffer = await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 235, g: 245, b: 238, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
    }

    // Format clean 2-line label to avoid clipping
    const cleanLabel = (label || 'Destination Location')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const commaParts = cleanLabel.split(',').map((p) => p.trim()).filter(Boolean);
    let line1 = commaParts[0] || 'Destination';
    let line2 = commaParts.slice(1, 3).join(', ') || (commaParts[1] || '');

    if (line1.length > 28) {
      line2 = line1.slice(24) + (line2 ? ', ' + line2 : '');
      line1 = line1.slice(0, 24);
    }
    if (line2.length > 34) {
      line2 = line2.slice(0, 32) + '...';
    }

    const centerX = Math.round(width / 2);
    const pinTipY = 130;
    const pinCenterY = pinTipY - 34;

    const overlaySvg = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="pinShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.35"/>
          </filter>
        </defs>

        <!-- Center Green Pin -->
        <g filter="url(#pinShadow)">
          <path d="M${centerX} ${pinTipY - 60} C${centerX - 13} ${pinTipY - 60} ${centerX - 24} ${pinTipY - 49} ${centerX - 24} ${pinCenterY} C${centerX - 24} ${pinTipY - 18} ${centerX} ${pinTipY} ${centerX} ${pinTipY} C${centerX} ${pinTipY} ${centerX + 24} ${pinTipY - 18} ${centerX + 24} ${pinCenterY} C${centerX + 24} ${pinTipY - 49} ${centerX + 13} ${pinTipY - 60} ${centerX} ${pinTipY - 60} Z" fill="#0F4C2E" stroke="#FFFFFF" stroke-width="2"/>
          <circle cx="${centerX}" cy="${pinCenterY}" r="7" fill="#FFFFFF"/>
        </g>

        <!-- Location Label Pill / Text below pin -->
        <text x="${centerX}" y="${pinTipY + 22}" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="12" font-weight="800" fill="#0F172A" text-anchor="middle" stroke="#FFFFFF" stroke-width="3.5" paint-order="stroke fill">
          ${line1}
        </text>
        ${
          line2
            ? `<text x="${centerX}" y="${pinTipY + 38}" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="11" font-weight="700" fill="#334155" text-anchor="middle" stroke="#FFFFFF" stroke-width="3" paint-order="stroke fill">${line2}</text>`
            : ''
        }
      </svg>
    `);

    const finalImage = await sharp(baseBuffer)
      .composite([{ input: overlaySvg, top: 0, left: 0 }])
      .png({ quality: 85 })
      .toBuffer();

    return finalImage;
  } catch (error) {
    console.error('[generateStaticMapPng Error]', error);
    return null;
  }
}
