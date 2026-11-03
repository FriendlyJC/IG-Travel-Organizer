// ============================================================
// geocoder.ts — 景點地理編碼（座標查詢）
// ============================================================

import { SpotResult } from './types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'IG-Travel-Organizer/1.0';

// 簡單快取，避免重複查詢同一景點
const cache = new Map<string, { lat: number; lng: number } | null>();

/** 暫停指定毫秒 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 使用 Nominatim API 搜尋景點座標。
 * 依序嘗試：景點名 → 城市名 → 國家名，取第一個有效結果。
 */
async function nominatimSearch(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  if (cache.has(query)) return cache.get(query)!;

  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      cache.set(query, result);
      return result;
    }
    cache.set(query, null);
    return null;
  } catch {
    cache.set(query, null);
    return null;
  }
}

/**
 * 對一個景點嘗試三層查詢策略：
 * 1. 「景點名, 城市, 國家」
 * 2. 「城市, 國家」
 * 3. 「國家」
 */
async function geocodeSpot(
  spotName: string,
  city: string,
  country: string
): Promise<{ lat: number; lng: number } | null> {
  // 策略 1：精確搜尋景點
  if (spotName && city) {
    const q1 = `${spotName}, ${city}, ${country}`;
    const r1 = await nominatimSearch(q1);
    if (r1) return r1;
    await sleep(1100); // Nominatim rate limit
  }

  // 策略 2：搜尋城市
  if (city && country) {
    const q2 = `${city}, ${country}`;
    const r2 = await nominatimSearch(q2);
    if (r2) return r2;
    await sleep(1100);
  }

  // 策略 3：只搜尋國家（fallback）
  if (country) {
    const q3 = country;
    const r3 = await nominatimSearch(q3);
    if (r3) return r3;
    await sleep(1100);
  }

  return null;
}

interface GeocodeOptions {
  onProgress?: (done: number, total: number) => void;
}

/**
 * 批次對所有景點進行 geocoding，填入 lat/lng 欄位。
 * 已處理過的相同景點（country+city+spotName）會直接用快取，不重複查詢。
 */
export async function geocodeSpots(
  spots: SpotResult[],
  options: GeocodeOptions = {}
): Promise<SpotResult[]> {
  const { onProgress } = options;
  const spotCache = new Map<string, { lat: number; lng: number } | null>();

  const result: SpotResult[] = [];

  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];
    const key = `${spot.country}|${spot.city}|${spot.spotName}`.toLowerCase();

    let coords: { lat: number; lng: number } | null = null;

    if (spotCache.has(key)) {
      coords = spotCache.get(key)!;
    } else {
      // 使用英文名稱做 geocoding（更準確）
      const nameForSearch = spot.spotNameEn || spot.spotName;
      coords = await geocodeSpot(nameForSearch, spot.city, spot.country);
      spotCache.set(key, coords);
      // Nominatim rate limit: 至少 1 秒間隔
      await sleep(1100);
    }

    result.push({
      ...spot,
      lat: coords?.lat,
      lng: coords?.lng,
      geocoded: coords !== null,
    });

    onProgress?.(i + 1, spots.length);
  }

  return result;
}

