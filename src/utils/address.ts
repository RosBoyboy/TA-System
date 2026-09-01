/**
 * Utility to format OpenStreetMap Nominatim reverse geocode response into a clean,
 * complete Philippine address with exact Barangay, Municipality/City, Province, and Region.
 */
export function formatNominatimAddress(data: any): string {
  if (!data) return '';

  if (data.address) {
    const a = data.address;
    
    // Extract location components from specific to broad
    const specificParts = [
      a.road || a.street,
      a.quarter,
      a.suburb || a.village || a.neighbourhood,
    ].filter(Boolean);

    const municipality = a.city || a.town || a.municipality || '';
    const province = a.state || a.county || a.province || '';
    const region = a.region || '';
    const country = a.country || 'Philippines';

    const parts = [
      ...specificParts,
      municipality,
      province,
      region,
      country,
    ]
      .map((p) => typeof p === 'string' ? p.trim() : '')
      .filter(Boolean);

    // Filter duplicates while preserving order
    const uniqueParts = parts.filter((part, idx) => parts.indexOf(part) === idx);

    if (uniqueParts.length >= 2) {
      return uniqueParts.join(', ');
    }
  }

  if (data.display_name && typeof data.display_name === 'string') {
    return data.display_name;
  }

  return '';
}

/**
 * Resolves a full address given an existing destination string and optional coordinates.
 * If the destination is already complete (>= 3 segments), it returns it immediately.
 * Otherwise, if coordinates exist, it performs a quick reverse-lookup.
 */
export async function resolveFullAddress(
  currentDestination?: string | null,
  lat?: number | null,
  lng?: number | null
): Promise<string> {
  if (currentDestination && currentDestination.split(',').length >= 3) {
    return currentDestination;
  }

  if (lat && lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: { 'User-Agent': 'TAPS-App/1.0' },
          signal: AbortSignal.timeout(3500),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const formatted = formatNominatimAddress(data);
        if (formatted) return formatted;
      }
    } catch {
      // Return original on error or timeout
    }
  }

  return currentDestination || '';
}
