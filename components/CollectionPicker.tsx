'use client';

// ============================================================
// components/CollectionPicker.tsx
// 解析 JSON 後，顯示所有 Collection 讓用戶點選或輸入
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
    <div className="space-y-3">
      {/* 手動輸入框 */}
      <input
        type="text"
        placeholder='輸入收藏夾名稱，例如：旅遊'
        value={selectedName}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-400 text-sm"
      />

      {/* 偵測到的 Collections — 點擊即填入 */}
      {collections.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">偵測到的收藏夾（點擊選取）：</p>
          <div className="flex flex-wrap gap-2">
            {collections.map((col) => {
              const isSelected =
                col.name.trim().toLowerCase() === selectedName.trim().toLowerCase();
              return (
                <button
                  key={col.name}
                  onClick={() => onChange(col.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {col.name}
                  <span className={`ml-1 ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                    ({col.posts.length})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 已選取確認 */}
      {selected && (
        <p className="text-sm text-green-600 flex items-center gap-1.5">
          ✅ 已選取：
          <span className="font-semibold">{selected.name}</span>
          <span className="text-gray-400">({selected.posts.length} 篇貼文)</span>
        </p>
      )}
      {selectedName && !selected && collections.length > 0 && (
        <p className="text-sm text-amber-500">⚠️ 找不到名為「{selectedName}」的收藏夾，請確認名稱</p>
      )}
    </div>
  );
}

