'use client';

// ============================================================
// components/CollectionPicker.tsx — 可愛標籤風格收藏夾選取器
// ============================================================

import { IGCollection } from '@/lib/types';

interface Props {
  collections: IGCollection[];
  selectedName: string;
  onChange: (name: string) => void;
}

export default function CollectionPicker({ collections, selectedName, onChange }: Props) {
  const selected = collections.find(
    (c) => c.name.trim().toLowerCase() === selectedName.trim().toLowerCase()
  );

  return (
    <div className="space-y-2.5">
      {/* 偵測到的 Collections — 點選可愛膠囊按鈕 */}
      {collections.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-stone-700 flex items-center gap-1">
            <span>🏷️</span>
            <span>選擇要整理的收藏夾：</span>
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto board-scrollbar p-1">
            {collections.map((col) => {
              const isSelected =
                col.name.trim().toLowerCase() === selectedName.trim().toLowerCase();
              return (
                <button
                  key={col.name}
                  type="button"
                  onClick={() => onChange(col.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all select-none ${
                    isSelected
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm scale-105'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-amber-300 hover:bg-amber-50/60'
                  }`}
                >
                  {col.name}
                  <span className={`ml-1 text-[11px] ${isSelected ? 'text-amber-100' : 'text-stone-400'}`}>
                    ({col.posts.length})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 已選取確認 */}
      {selected ? (
        <p className="text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
          <span>✅</span>
          <span>已選取「{selected.name}」</span>
          <span className="text-emerald-600 font-normal">（共 {selected.posts.length} 篇貼文）</span>
        </p>
      ) : (
        /* 手動輸入備用 */
        <input
          type="text"
          placeholder="或手動輸入收藏夾名稱，例如：旅遊"
          value={selectedName}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-medium focus:outline-none focus:border-amber-400"
        />
      )}
    </div>
  );
}
