// ============================================================
// geocoder.ts — 景點地理編碼（多層階梯式座標查詢）
// 優先級：
// 1. Google Maps Geocoding API (綠色，最精確)
// 2. OpenStreetMap Nominatim (黃色)
// 3. AI 預估座標 (紅色，備援)
// 4. 若皆無，移至找不到清單
// ============================================================

import { SpotResult, CoordSource } from './types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'IG-Travel-Organizer/1.0';

// 快取查詢結果，避免重複呼叫
const googleCache = new Map<string, { lat: number; lng: number } | null>();
const nominatimCache = new Map<string, { lat: number; lng: number } | null>();

/** 暫停指定毫秒 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 呼叫 Google Maps Geocoding API (透過後端 API Proxy 轉發避免 CORS) */
async function googleGeocodeSearch(
  query: string,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = `${apiKey}_${query}`.toLowerCase();
  if (googleCache.has(cacheKey)) return googleCache.get(cacheKey)!;

  try {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google-geocode',
        apiKey,
        address: query,
      }),
    });

    if (!res.ok) {
      googleCache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    if (data.found && typeof data.lat === 'number' && typeof data.lng === 'number') {
      const result = { lat: data.lat, lng: data.lng };
      googleCache.set(cacheKey, result);
      return result;
    }

    googleCache.set(cacheKey, null);
    return null;
  } catch (e) {
    console.warn(`Google Geocoding 查詢失敗 (${query}):`, e);
    googleCache.set(cacheKey, null);
    return null;
  }
}

/** 呼叫 OpenStreetMap Nominatim API */
async function nominatimSearch(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = query.toLowerCase();
  if (nominatimCache.has(cacheKey)) return nominatimCache.get(cacheKey)!;

  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) {
      nominatimCache.set(cacheKey, null);
      return null;
    }
    const data = await res.json();

    if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      nominatimCache.set(cacheKey, result);
      return result;
    }

    nominatimCache.set(cacheKey, null);
    return null;
  } catch (e) {
    console.warn(`Nominatim 查詢失敗 (${query}):`, e);
    nominatimCache.set(cacheKey, null);
    return null;
  }
}

interface GeocodeOptions {
  googleApiKey?: string;
  onProgress?: (done: number, total: number) => void;
}

/**
 * 批次解析景點座標：
 * 依照 Google Maps (綠) -> Nominatim (黃) -> AI 座標 (紅) 優先級執行
 */
export async function geocodeSpots(
  spots: SpotResult[],
  options: GeocodeOptions = {}
): Promise<SpotResult[]> {
  const { googleApiKey, onProgress } = options;
  const result: SpotResult[] = [];

  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];
    let resolvedCoords: { lat: number; lng: number } | null = null;
    let source: CoordSource | undefined = undefined;

    const queries: string[] = [];
    if (spot.spotName && spot.city) {
      queries.push(`${spot.spotName}, ${spot.city}, ${spot.country}`);
    }
    if (spot.spotNameEn && spot.spotNameEn !== spot.spotName && spot.city) {
      queries.push(`${spot.spotNameEn}, ${spot.city}, ${spot.country}`);
    }
    if (queries.length === 0 && spot.city) {
      queries.push(`${spot.city}, ${spot.country}`);
    }

    // ── 優先級 1：Google Maps Geocoding API ─────────────────────────
    if (googleApiKey && googleApiKey.trim().length > 0) {
      for (const q of queries) {
        resolvedCoords = await googleGeocodeSearch(q, googleApiKey.trim());
        if (resolvedCoords) {
          source = 'google';
          break;
        }
      }
    }

    // ── 優先級 2：OpenStreetMap Nominatim ────────────────────────────
    if (!resolvedCoords) {
      for (const q of queries) {
        resolvedCoords = await nominatimSearch(q);
        // Nominatim 遵守 1 req/sec 速率限制
        await sleep(1000);
        if (resolvedCoords) {
          source = 'nominatim';
          break;
        }
      }
    }

    // ── 優先級 3：AI 預估座標備援 ───────────────────────────────────
    if (!resolvedCoords) {
      if (
        typeof spot.aiLat === 'number' &&
        typeof spot.aiLng === 'number' &&
        !isNaN(spot.aiLat) &&
        !isNaN(spot.aiLng) &&
        spot.aiLat >= -90 &&
        spot.aiLat <= 90 &&
        spot.aiLng >= -180 &&
        spot.aiLng <= 180
      ) {
        resolvedCoords = { lat: spot.aiLat, lng: spot.aiLng };
        source = 'ai';
      }
    }

    // ── 記錄結果 ────────────────────────────────────────────────────
    result.push({
      ...spot,
      lat: resolvedCoords?.lat,
      lng: resolvedCoords?.lng,
      geocoded: resolvedCoords !== null,
      coordSource: source,
    });

    onProgress?.(i + 1, spots.length);
  }

  return result;
}
