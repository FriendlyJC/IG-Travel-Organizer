'use client';

// ============================================================
// components/NotFoundTable.tsx — 找不到景點的貼文清單
// ============================================================

import { NotFoundResult } from '@/lib/types';

interface Props {
  items: NotFoundResult[];
}

export default function NotFoundTable({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          ❌ 找不到景點的貼文（{items.length} 篇）
        </p>
        <p className="text-xs text-gray-400">
          可手動查閱後補充至 KML
        </p>
      </div>

      <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
        {items.map((item, i) => (
          <div key={i} className="px-4 py-3 flex gap-3 items-start">
            <span className="text-xs text-gray-300 font-mono mt-0.5 w-5 flex-shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <a
                href={item.post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-700 hover:underline truncate block font-mono"
              >
                {item.post.url}
              </a>
              <p className="text-xs text-gray-400 mt-0.5">{item.reason}</p>
              {item.post.caption && (
                <p className="text-xs text-gray-300 mt-0.5 truncate">
                  {item.post.caption.substring(0, 80)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

