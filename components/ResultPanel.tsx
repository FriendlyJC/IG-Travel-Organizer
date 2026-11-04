'use client';

// ============================================================
// components/ResultPanel.tsx — 分析完成後的結果面板（含座標顏色說明）
// ============================================================

import { MergedSpot, NotFoundResult } from '@/lib/types';

interface Props {
  mergedSpots: MergedSpot[];
  notFound: NotFoundResult[];
  collectionName: string;
  onDownloadKml: () => void;
  onDownloadCsv: () => void;
}

export default function ResultPanel({
  mergedSpots,
  notFound,
  collectionName,
  onDownloadKml,
  onDownloadCsv,
}: Props) {
  // 依國家統計
  const countryStats = mergedSpots.reduce<Record<string, number>>((acc, spot) => {
    acc[spot.country] = (acc[spot.country] ?? 0) + 1;
    return acc;
  }, {});

  // 依座標來源統計
  const sourceStats = mergedSpots.reduce<Record<string, number>>((acc, spot) => {
    const src = spot.coordSource || 'ai';
    acc[src] = (acc[src] ?? 0) + 1;
    return acc;
  }, {});

  const sortedCountries = Object.entries(countryStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8); // 最多顯示 8 個

  const COUNTRY_FLAGS: Record<string, string> = {
    vietnam: '🇻🇳', thailand: '🇹🇭', japan: '🇯🇵', taiwan: '🇹🇼',
    china: '🇨🇳', cambodia: '🇰🇭', netherlands: '🇳🇱', usa: '🇺🇸',
    'united states': '🇺🇸', 'south korea': '🇰🇷', korea: '🇰🇷',
    singapore: '🇸🇬', malaysia: '🇲🇾', indonesia: '🇮🇩', philippines: '🇵🇭',
    france: '🇫🇷', italy: '🇮🇹', germany: '🇩🇪', spain: '🇪🇸',
    uk: '🇬🇧', 'united kingdom': '🇬🇧', australia: '🇦🇺',
    'new zealand': '🇳🇿', canada: '🇨🇦', mexico: '🇲🇽',
    greece: '🇬🇷', turkey: '🇹🇷', switzerland: '🇨🇭', iceland: '🇮🇸',
    norway: '🇳🇴', sweden: '🇸🇪', portugal: '🇵🇹', myanmar: '🇲🇲',
    laos: '🇱🇦', nepal: '🇳🇵', india: '🇮🇳', maldives: '🇲🇻',
    morocco: '🇲🇦', egypt: '🇪🇬', jordan: '🇯🇴', uae: '🇦🇪',
    peru: '🇵🇪', brazil: '🇧🇷', argentina: '🇦🇷',
  };
  const getFlag = (c: string) => COUNTRY_FLAGS[c.toLowerCase()] ?? '🌍';

  return (
    <div className="space-y-4">
      {/* 成功橫幅 */}
      <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">🎉</span>
        <div>
          <p className="font-semibold text-green-800">分析完成！</p>
          <p className="text-sm text-green-600">
            已整理 {mergedSpots.length} 個景點，涵蓋 {Object.keys(countryStats).length} 個國家
          </p>
        </div>
      </div>

      {/* 座標精度統計與顏色標籤說明 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2.5">
        <p className="text-sm font-semibold text-gray-700">📍 Google Earth 座標顏色標籤說明</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
            <div className="font-bold text-green-700 flex items-center gap-1">
              <span>🟢 綠色圖釘</span>
            </div>
            <p className="text-green-800 text-[11px] mt-1 font-medium">Google Maps 搜尋</p>
            <p className="text-green-600 text-[11px] mt-0.5">導向定位：{sourceStats['google'] || 0} 個</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            <div className="font-bold text-amber-700 flex items-center gap-1">
              <span>🟡 黃色圖釘</span>
            </div>
            <p className="text-amber-800 text-[11px] mt-1 font-medium">OpenStreetMap</p>
            <p className="text-amber-600 text-[11px] mt-0.5">地圖查得：{sourceStats['nominatim'] || 0} 個</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
            <div className="font-bold text-red-700 flex items-center gap-1">
              <span>🔴 紅色圖釘</span>
            </div>
            <p className="text-red-800 text-[11px] mt-1 font-medium">AI 預估位置</p>
            <p className="text-red-600 text-[11px] mt-0.5">推測座標：{sourceStats['ai'] || 0} 個</p>
          </div>
        </div>
      </div>

      {/* 國家統計 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-medium text-gray-600 mb-3">📊 景點分布</p>
        <div className="grid grid-cols-2 gap-2">
          {sortedCountries.map(([country, count]) => (
            <div key={country} className="flex items-center gap-2 text-sm">
              <span>{getFlag(country)}</span>
              <span className="text-gray-700 truncate">{country}</span>
              <span className="ml-auto text-gray-400 font-mono text-xs">{count}</span>
            </div>
          ))}
        </div>
        {Object.keys(countryStats).length > 8 && (
          <p className="text-xs text-gray-400 mt-2">
            ...以及其他 {Object.keys(countryStats).length - 8} 個國家
          </p>
        )}
      </div>

      {/* 下載按鈕 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onDownloadKml}
          className="flex flex-col items-center gap-1.5 py-4 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm hover:shadow"
        >
          <span className="text-xl">📥</span>
          <span className="font-semibold text-sm">下載 KML 檔案</span>
          <span className="text-xs text-blue-200">{collectionName}_spots.kml</span>
        </button>
        <button
          onClick={onDownloadCsv}
          disabled={notFound.length === 0}
          className="flex flex-col items-center gap-1.5 py-4 px-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition-colors shadow-sm hover:shadow"
        >
          <span className="text-xl">📋</span>
          <span className="font-semibold text-sm">下載找不到清單</span>
          <span className="text-xs text-amber-100 disabled:text-gray-400">
            {notFound.length} 篇 • not_found.csv
          </span>
        </button>
      </div>

      {/* KML 使用說明 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-1">
        <p className="font-medium">📌 如何匯入 Google Earth：</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700 text-xs">
          <li>開啟 <a href="https://earth.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Earth Web</a> 或 Google Earth Pro</li>
          <li>點選左側「專案」→「從電腦匯入 KML 檔案」</li>
          <li>選取下載的 <code className="bg-blue-100 px-1 rounded">{collectionName}_spots.kml</code></li>
          <li>地圖上即可看到所有景點，標籤會依照精確度顯示綠、黃、紅圖釘！</li>
        </ol>
      </div>
    </div>
  );
}
