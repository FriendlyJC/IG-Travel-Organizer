// ============================================================
// not-found-generator.ts — 找不到景點的貼文清單生成
// ============================================================

import { NotFoundResult, SpotResult } from './types';

/**
 * 將找不到景點的貼文轉為 CSV 字串
 */
export function generateNotFoundCsv(items: NotFoundResult[]): string {
  const header = ['#', 'IG 貼文連結', '找不到原因', 'Caption 摘要（前100字）', 'Hashtags'];
  const rows = items.map((item, i) => {
    const captionPreview = item.post.caption?.substring(0, 100).replace(/\n/g, ' ') ?? '';
    const hashtags = item.post.hashtags.join(' #');
    return [
      String(i + 1),
      item.post.url,
      item.reason,
      `"${captionPreview.replace(/"/g, '""')}"`,
      hashtags ? `#${hashtags}` : '',
    ].join(',');
  });

  return [header.join(','), ...rows].join('\n');
}

/**
 * 在瀏覽器中觸發 CSV 下載
 */
export function downloadCsv(csvContent: string, filename = 'not_found.csv') {
  // 加 BOM 讓 Excel 能正確顯示中文
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 將沒有 geocoding 座標的景點也加入找不到清單（附帶說明）
 */
export function extractNoCoordSpots(spots: SpotResult[]): NotFoundResult[] {
  return spots
    .filter((s) => !s.geocoded || s.lat === undefined)
    .map((s) => ({
      postIndex: s.postIndex,
      post: s.post,
      reason: `AI 判斷為「${s.country} ${s.city} - ${s.spotName}」，但無法查詢到精確座標`,
    }));
}

