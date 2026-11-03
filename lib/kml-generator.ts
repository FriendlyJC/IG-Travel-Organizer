// ============================================================
// kml-generator.ts — 將景點資料轉為 KML 格式（含色彩標記）
// 綠色：Google Maps Geocoding 確定精確
// 黃色：OpenStreetMap Nominatim 查得
// 紅色：AI 預估座標
// ============================================================

import { SpotResult, MergedSpot } from './types';

// ─── 去重合併 ──────────────────────────────────────────────────

/**
 * 將多篇貼文對應到相同景點的 SpotResult，合併成一個 MergedSpot。
 * 判斷相同景點的條件：country + city + spotName（不分大小寫）
 */
export function mergeSpots(spots: SpotResult[]): MergedSpot[] {
  const map = new Map<string, MergedSpot>();

  for (const spot of spots) {
    // 略過沒有座標的景點（無法在地圖上標記）
    if (spot.lat === undefined || spot.lng === undefined) continue;

    const key = `${spot.country}|${spot.city}|${spot.spotName}`.toLowerCase();

    if (map.has(key)) {
      // 同景點：加入貼文連結
      map.get(key)!.posts.push(spot.post);
    } else {
      map.set(key, {
        country: spot.country,
        city: spot.city,
        spotName: spot.spotName,
        spotNameEn: spot.spotNameEn,
        description: spot.description,
        lat: spot.lat,
        lng: spot.lng,
        coordSource: spot.coordSource || 'ai',
        posts: [spot.post],
      });
    }
  }

  return Array.from(map.values());
}

// ─── 輔助工具 ──────────────────────────────────────────────────

/** 轉義 XML 特殊字元 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 取得國家對應的 emoji flag */
const COUNTRY_FLAGS: Record<string, string> = {
  vietnam: '🇻🇳', thailand: '🇹🇭', japan: '🇯🇵', taiwan: '🇹🇼',
  china: '🇨🇳', cambodia: '🇰🇭', netherlands: '🇳🇱', usa: '🇺🇸',
  'united states': '🇺🇸', 'south korea': '🇰🇷', korea: '🇰🇷',
  singapore: '🇸🇬', malaysia: '🇲🇾', indonesia: '🇮🇩', philippines: '🇵🇭',
  france: '🇫🇷', italy: '🇮🇹', germany: '🇩🇪', spain: '🇪🇸',
  uk: '🇬🇧', 'united kingdom': '🇬🇧', australia: '🇦🇺',
  'new zealand': '🇳🇿', canada: '🇨🇦', mexico: '🇲🇽',
  greece: '🇬🇷', turkey: '🇹🇷', switzerland: '🇨🇭', austria: '🇦🇹',
  iceland: '🇮🇸', norway: '🇳🇴', sweden: '🇸🇪', denmark: '🇩🇰',
  portugal: '🇵🇹', 'czech republic': '🇨🇿', hungary: '🇭🇺',
  myanmar: '🇲🇲', laos: '🇱🇦', nepal: '🇳🇵', india: '🇮🇳',
  'sri lanka': '🇱🇰', maldives: '🇲🇻', morocco: '🇲🇦',
  egypt: '🇪🇬', jordan: '🇯🇴', 'united arab emirates': '🇦🇪', uae: '🇦🇪',
  peru: '🇵🇪', brazil: '🇧🇷', argentina: '🇦🇷', colombia: '🇨🇴',
};

function getFlag(country: string): string {
  return COUNTRY_FLAGS[country.toLowerCase()] ?? '🌍';
}

// ─── KML 生成 ──────────────────────────────────────────────────

/** 生成單個 Placemark 的 KML */
function placemarkKml(spot: MergedSpot): string {
  const name = spot.spotName || spot.spotNameEn || `${spot.city} Spot`;
  const nameEn = spot.spotNameEn ? ` / ${spot.spotNameEn}` : '';

  const sourceBadge =
    spot.coordSource === 'google'
      ? '🟢 座標來源：Google Geocoding (精確定位)'
      : spot.coordSource === 'nominatim'
      ? '🟡 座標來源：OpenStreetMap Nominatim'
      : '🔴 座標來源：AI 預估位置 (可能存在偏移)';

  const styleId = `${spot.coordSource || 'ai'}-pin`;

  // 建立 HTML description（Google Earth 支援 CDATA 內的 HTML）
  const postLinks = spot.posts
    .map((p, i) => `<a href="${escapeXml(p.url)}">📸 相關貼文 ${i + 1}</a>`)
    .join('<br/>');

  const description = `
<b>${escapeXml(name)}${escapeXml(nameEn)}</b><br/>
📍 ${escapeXml(spot.city)}, ${escapeXml(spot.country)}<br/>
🎯 ${sourceBadge}<br/>
📝 ${escapeXml(spot.description)}<br/>
<hr/>
<b>相關 IG 貼文：</b><br/>
${postLinks}
  `.trim();

  return `
      <Placemark>
        <name>${escapeXml(name)}</name>
        <styleUrl>#${styleId}</styleUrl>
        <description><![CDATA[${description}]]></description>
        <Point>
          <coordinates>${spot.lng},${spot.lat},0</coordinates>
        </Point>
      </Placemark>`;
}

/** 依國家將景點分組 */
function groupByCountry(spots: MergedSpot[]): Map<string, MergedSpot[]> {
  const map = new Map<string, MergedSpot[]>();
  for (const spot of spots) {
    const c = spot.country || 'Unknown';
    if (!map.has(c)) map.set(c, []);
    map.get(c)!.push(spot);
  }
  // 依國家名排序
  return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * 將合併後的景點列表轉為 KML 字串。
 * 結構：Document → Styles (綠/黃/紅) → Folder（國家）→ Placemark（景點）
 */
export function generateKml(mergedSpots: MergedSpot[], collectionName: string): string {
  const grouped = groupByCountry(mergedSpots);
  const now = new Date().toLocaleDateString('zh-TW');

  const folders = [...grouped.entries()]
    .map(([country, spots]) => {
      const flag = getFlag(country);
      const placemarks = spots.map(placemarkKml).join('');
      return `
    <Folder>
      <name>${flag} ${escapeXml(country)} (${spots.length})</name>
      ${placemarks}
    </Folder>`;
    })
    .join('');

  const totalCountries = grouped.size;
  const totalSpots = mergedSpots.length;

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>IG ${escapeXml(collectionName)} Travel Spots</name>
    <description>由 IG Travel Organizer 自動生成於 ${now}｜共 ${totalSpots} 個景點，涵蓋 ${totalCountries} 個國家</description>

    <!-- 🟢 綠色樣式：Google Maps Geocoding 確定精確 -->
    <Style id="google-pin">
      <IconStyle>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/grn-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>

    <!-- 🟡 黃色樣式：OpenStreetMap Nominatim 找到 -->
    <Style id="nominatim-pin">
      <IconStyle>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>

    <!-- 🔴 紅色樣式：AI 預估輸出 -->
    <Style id="ai-pin">
      <IconStyle>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>

    ${folders}
  </Document>
</kml>`;
}

// ─── 下載觸發 ──────────────────────────────────────────────────

/** 在瀏覽器中觸發 KML 檔案下載 */
export function downloadKml(kmlContent: string, filename = 'travel_spots.kml') {
  const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
