'use client';

// ============================================================
// components/ProgressPanel.tsx — 分析進度面板
// ============================================================

import { AnalysisProgress } from '@/lib/types';

interface Props {
  progress: AnalysisProgress;
}

function ProgressBar({ value, max, color = 'blue' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const colorClass = color === 'green' ? 'bg-green-500' : 'bg-blue-500';
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`${colorClass} h-2 rounded-full transition-all duration-300`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function ProgressPanel({ progress }: Props) {
  const {
    stage,
    totalPosts,
    classifiedCount,
    foundCount,
    notFoundCount,
    geocodedCount,
    errorMessage,
  } = progress;

  if (stage === 'idle') return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      {/* AI 分類進度 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 flex items-center gap-1.5">
            {stage === 'classifying' ? (
              <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-blue-500">✓</span>
            )}
            AI 分析貼文
          </span>
          <span className="font-mono text-xs text-gray-400">
            {classifiedCount} / {totalPosts}
          </span>
        </div>
        <ProgressBar value={classifiedCount} max={totalPosts} />
        <div className="flex gap-4 text-xs text-gray-400">
          <span className="text-green-600">✅ 找到景點 {foundCount}</span>
          <span className="text-red-400">❌ 找不到 {notFoundCount}</span>
        </div>
      </div>

      {/* Geocoding 進度 */}
      {(stage === 'geocoding' || stage === 'generating' || stage === 'done') && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-1.5">
              {stage === 'geocoding' ? (
                <span className="inline-block w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-green-500">✓</span>
              )}
              查詢景點座標
            </span>
            <span className="font-mono text-xs text-gray-400">
              {geocodedCount} / {foundCount}
            </span>
          </div>
          <ProgressBar value={geocodedCount} max={foundCount} color="green" />
          <p className="text-xs text-gray-400">
            ⏱️ Nominatim 地圖服務每秒限 1 次查詢，請耐心等候
          </p>
        </div>
      )}

      {/* 生成中 */}
      {stage === 'generating' && (
        <p className="text-sm text-blue-600 flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          正在生成 KML 檔案...
        </p>
      )}

      {/* 錯誤訊息 */}
      {stage === 'error' && errorMessage && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">
          ❌ {errorMessage}
        </div>
      )}
    </div>
  );
}

