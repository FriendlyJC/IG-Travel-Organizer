// ============================================================
// geocoder.ts — 景點地理編碼（Google Maps URL Fetch + Nominatim + AI 座標）
// 支援：
// 1. 一般模式：Google URL Fetch -> Nominatim -> AI 座標 (找到即停)
// 2. 深度搜尋模式 (Deep Search)：遍歷 2~3 組候選關鍵字，收集多方座標進行相近座標投票加權
// ============================================================

import { SpotResult, CoordSource } from './types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'IG-Travel-Organizer/1.0';

// 快取查詢結果，避免重複請求
const googleSearchCache = new Map<string, { lat: number; lng: number } | null>();
const nominatimCache = new Map<string, { lat: number; lng: number } | null>();

/** 暫停指定毫秒 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 計算兩經緯度之間的真實地表距離（公里，使用 Haversine 半正矢公式） */
function calcDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 地球半徑 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** 透過後端代理向 Google Maps 發送搜尋請求取得經緯度 (免 API Key) */
async function googleMapsSearch(query: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = query.trim().toLowerCase();
  if (googleSearchCache.has(cacheKey)) return googleSearchCache.get(cacheKey)!;

  try {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google-maps-search',
        query,
      }),
    });

    if (!res.ok) {
      googleSearchCache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    if (data.found && typeof data.lat === 'number' && typeof data.lng === 'number') {
      const result = { lat: data.lat, lng: data.lng };
      googleSearchCache.set(cacheKey, result);
      return result;
    }

    googleSearchCache.set(cacheKey, null);
    return null;
  } catch (e) {
    console.warn(`[Google Maps Search] 查詢失敗 (${query}):`, e);
    googleSearchCache.set(cacheKey, null);
    return null;
  }
}

/** 呼叫 OpenStreetMap Nominatim API */
async function nominatimSearch(query: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = query.trim().toLowerCase();
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
    console.warn(`[Nominatim] 查詢失敗 (${query}):`, e);
    nominatimCache.set(cacheKey, null);
    return null;
  }
}

/** 提取該景點的 2~3 組搜尋關鍵字清單 */
function getCandidateQueries(spot: SpotResult): string[] {
  const queries: string[] = [];
  const add = (q?: string) => {
    if (!q) return;
    const trimmed = q.trim();
    if (trimmed && !queries.includes(trimmed)) {
      queries.push(trimmed);
    }
  };

  if (Array.isArray(spot.searchKeywords) && spot.searchKeywords.length > 0) {
    for (const kw of spot.searchKeywords) {
      add(kw);
      if (spot.city && !kw.includes(spot.city)) {
        add(`${kw}, ${spot.city}`);
      }
    }
  }

  // 補足備選關鍵字
  add(spot.spotName);
  if (spot.spotNameEn && spot.spotNameEn !== spot.spotName) {
    add(spot.spotNameEn);
  }
  if (spot.spotName && spot.city) {
    add(`${spot.spotName}, ${spot.city}, ${spot.country}`);
  }

  return queries.slice(0, 4); // 最多取前 3~4 組最相關的關鍵字
}

interface GeocodeOptions {
  deepSearch?: boolean;
  onProgress?: (done: number, total: number) => void;
}

/**
 * 批次解析景點座標：
 * 支援一般模式與深度搜尋模式
 */
export async function geocodeSpots(
  spots: SpotResult[],
  options: GeocodeOptions = {}
): Promise<SpotResult[]> {
  const { deepSearch = false, onProgress } = options;
  const result: SpotResult[] = [];

  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];
    const queries = getCandidateQueries(spot);

    let finalLat: number | undefined = undefined;
    let finalLng: number | undefined = undefined;
    let finalSource: CoordSource | undefined = undefined;

    if (!deepSearch) {
      // ══════════════════════════════════════════════════════════
      // 一般模式：Google Maps URL Fetch -> Nominatim -> AI (找到即停)
      // ══════════════════════════════════════════════════════════

      // 1. 先用所有關鍵字依序嘗試 Google Maps URL Fetch
      for (const q of queries) {
        const coords = await googleMapsSearch(q);
        if (coords) {
          finalLat = coords.lat;
          finalLng = coords.lng;
          finalSource = 'google';
          break;
        }
      }

      // 2. 若 Google 未找到，依序嘗試 Nominatim
      if (!finalLat) {
        for (const q of queries) {
          const coords = await nominatimSearch(q);
          await sleep(1000); // 遵守 Nominatim 速率限制
          if (coords) {
            finalLat = coords.lat;
            finalLng = coords.lng;
            finalSource = 'nominatim';
            break;
          }
        }
      }

      // 3. 若皆未找到，使用 AI 預估座標
      if (!finalLat && typeof spot.aiLat === 'number' && typeof spot.aiLng === 'number') {
        finalLat = spot.aiLat;
        finalLng = spot.aiLng;
        finalSource = 'ai';
      }
    } else {
      // ══════════════════════════════════════════════════════════
      // 深度搜尋模式：遍歷關鍵字，收集多方座標進行相近座標投票加權
      // ══════════════════════════════════════════════════════════

      interface CandidatePoint {
        lat: number;
        lng: number;
        source: 'google' | 'nominatim';
        weight: number;
      }

      const candidates: CandidatePoint[] = [];

      // A. 所有候選詞嘗試 Google Maps Search (權重 2.0)
      for (const q of queries) {
        const coords = await googleMapsSearch(q);
        if (coords) {
          candidates.push({ lat: coords.lat, lng: coords.lng, source: 'google', weight: 2.0 });
        }
      }

      // B. 所有候選詞嘗試 Nominatim (權重 1.5)
      for (const q of queries) {
        const coords = await nominatimSearch(q);
        await sleep(1000); // 遵守 Nominatim 速率限制
        if (coords) {
          candidates.push({ lat: coords.lat, lng: coords.lng, source: 'nominatim', weight: 1.5 });
        }
      }

      if (candidates.length === 1) {
        finalLat = candidates[0].lat;
        finalLng = candidates[0].lng;
        finalSource = candidates[0].source;
      } else if (candidates.length > 1) {
        // ── 投票與相近聚類算法 ──
        // 凡相距 2.5 公里以內視為同景點聚類，計算總得票權重
        let bestClusterScore = -1;
        let bestClusterPoints: CandidatePoint[] = [];

        for (let j = 0; j < candidates.length; j++) {
          const p = candidates[j];
          const cluster: CandidatePoint[] = [];
          let score = 0;

          for (let k = 0; k < candidates.length; k++) {
            const other = candidates[k];
            const dist = calcDistanceKm(p.lat, p.lng, other.lat, other.lng);
            if (dist <= 2.5) {
              cluster.push(other);
              score += other.weight;
            }
          }

          if (score > bestClusterScore) {
            bestClusterScore = score;
            bestClusterPoints = cluster;
          }
        }

        // 從最高得票的聚類中，計算加權中心點
        if (bestClusterPoints.length > 0) {
          let totalWeight = 0;
          let weightedLat = 0;
          let weightedLng = 0;
          let hasGoogle = false;

          for (const pt of bestClusterPoints) {
            weightedLat += pt.lat * pt.weight;
            weightedLng += pt.lng * pt.weight;
            totalWeight += pt.weight;
            if (pt.source === 'google') hasGoogle = true;
          }

          finalLat = weightedLat / totalWeight;
          finalLng = weightedLng / totalWeight;
          finalSource = hasGoogle ? 'google' : 'nominatim';
        } else {
          // 若無法聚類，使用權重最高的候選點 (Google Maps 優先)
          finalLat = candidates[0].lat;
          finalLng = candidates[0].lng;
          finalSource = candidates[0].source;
        }
      } else {
        // C. 若 Google 和 Nominatim 都找不到，退回由 AI 預估座標備援
        if (typeof spot.aiLat === 'number' && typeof spot.aiLng === 'number') {
          finalLat = spot.aiLat;
          finalLng = spot.aiLng;
          finalSource = 'ai';
        }
      }
    }

    const isValid =
      typeof finalLat === 'number' &&
      typeof finalLng === 'number' &&
      !isNaN(finalLat) &&
      !isNaN(finalLng);

    result.push({
      ...spot,
      lat: isValid ? finalLat : undefined,
      lng: isValid ? finalLng : undefined,
      geocoded: isValid,
      coordSource: isValid ? finalSource : undefined,
    });

    onProgress?.(i + 1, spots.length);
  }

  return result;
}
