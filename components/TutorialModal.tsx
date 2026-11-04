'use client';

// ============================================================
// components/TutorialModal.tsx — 羊皮紙卷軸風格教學操作彈窗
// ============================================================

import { useEffect, useState } from 'react';

export type TutorialType = 'api' | 'json' | 'earth';

interface StepItem {
  step: string;
  title: string;
  desc?: string;
  imageName: string;
  link?: { url: string; label: string };
  notes?: string[];
}

interface Props {
  type: TutorialType | null;
  onClose: () => void;
}

const TUTORIAL_DATA: Record<TutorialType, { title: string; steps: StepItem[] }> = {
  api: {
    title: '如何免費取得 Gemini API',
    steps: [
      {
        step: 'Step 1',
        title: '點擊下方連結',
        imageName: 'api_step1.png',
        link: { url: 'https://aistudio.google.com/app/apikey', label: '前往 Google AI Studio 申請頁面 ↗' },
      },
      {
        step: 'Step 2',
        title: '登入後點擊右上方 "Create API Key"',
        imageName: 'api_step2.png',
      },
      {
        step: 'Step 3',
        title: '複製 API Key 並貼上此輸入框',
        imageName: 'api_step3.png',
      },
    ],
  },
  json: {
    title: '如何匯出 Instagram 收藏 JSON 檔案',
    steps: [
      { step: 'Step 1', title: '到 Instagram 右上方選單點選「設定」', imageName: 'json_step1.png' },
      { step: 'Step 2', title: '點擊「Meta 帳號管理」', imageName: 'json_step2.png' },
      { step: 'Step 3', title: '點擊「您的資訊與權限」', imageName: 'json_step3.png' },
      { step: 'Step 4', title: '點擊「匯出您的資訊」', imageName: 'json_step4.png' },
      { step: 'Step 5', title: '點擊「建立匯出」並選擇自己帳號', imageName: 'json_step5.png' },
      { step: 'Step 6', title: '點擊「匯出到此裝置」', imageName: 'json_step6.png' },
      { step: 'Step 7', title: '自訂訊息只需勾選「Saved」（已儲存 收藏的貼文）並保存', imageName: 'json_step7.png' },
      { step: 'Step 8', title: '匯出格式選擇「JSON 檔案」', imageName: 'json_step8.png' },
      { step: 'Step 9', title: '開始匯出！會在 Email 收到一份壓縮檔', imageName: 'json_step9.png' },
      { step: 'Step 10', title: '解壓縮後找到 saved_collections.json', imageName: 'json_step10.png' },
      { step: 'Step 11', title: '上傳後 勾選要整理的類別', imageName: 'json_step11.png' },
      { step: 'Step 12', title: '建議勾選「深度搜尋提高座標精度」，即可開始整理！', imageName: 'json_step12.png' },
    ],
  },
  earth: {
    title: '如何將 KML 檔案匯入 Google Earth',
    steps: [
      {
        step: 'Step 1',
        title: '點擊下方開啟 Google Earth',
        imageName: 'earth_step1.png',
        link: { url: 'https://earth.google.com/web/', label: '開啟 Google Earth 網頁版 ↗' },
      },
      {
        step: 'Step 2',
        title: '建立專案匯入 KML 即可完成！',
        imageName: 'earth_step2.png',
        notes: [
          '* 若有錯誤地標手動編輯修正即可！',
          '* AI 分析座標正確率高到低依序為：綠色 > 黃色 > 紅色',
        ],
      },
    ],
  },
};

export default function TutorialModal({ type, onClose }: Props) {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // ── 點選放大圖片燈箱狀態 ──────────────────────────────────────────
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    title: string;
    step: string;
  } | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedImage) {
          setSelectedImage(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectedImage]);

  if (!type) return null;
  const current = TUTORIAL_DATA[type];

  const handleImageError = (name: string) => {
    setImageErrors((prev) => ({ ...prev, [name]: true }));
  };

  const openImageZoom = (item: StepItem) => {
    setSelectedImage({
      src: `/ui_asset/tutorial/${item.imageName}`,
      title: item.title,
      step: item.step,
    });
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoom = (delta: number) => {
    setScale((prev) => {
      const next = Number((prev + delta).toFixed(2));
      return Math.min(Math.max(next, 0.5), 4);
    });
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    handleZoom(delta);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <>
      {/* 1. 教學步驟清單彈窗 (點擊放大圖片時隱藏，避免層級遮擋) */}
      <div
        className={`fixed inset-0 z-50 items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-sm animate-fadeIn select-none ${
          selectedImage ? 'hidden' : 'flex'
        }`}
        onClick={onClose}
      >
        {/* 教學彈窗主卡片 (乾淨純白背景) */}
        <div
          className="relative w-full max-w-4xl h-[82vh] max-h-[580px] bg-white rounded-3xl border-4 border-stone-800 shadow-[0_25px_60px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 左上角關閉按鈕 (可愛紅色圓形叉叉按鈕) */}
          <button
            type="button"
            onClick={onClose}
            title="關閉教學"
            className="absolute top-4 left-4 z-30 w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 active:scale-95 text-red-600 font-black text-lg flex items-center justify-center border-2 border-red-300 shadow-sm transition-transform select-none"
          >
            ✕
          </button>

          {/* 頂部中央：黑粗體大標題 */}
          <div className="pt-4 pb-2 text-center px-14 z-20 border-b border-stone-100">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-wide">
              📖 {current.title}
            </h2>
          </div>

          {/* 中間步驟區域：橫向滾動容器 (含滾動拉條) */}
          <div className="flex-1 w-full overflow-x-auto board-scrollbar px-6 sm:px-10 py-4 flex items-stretch gap-4 z-20 bg-stone-50/60">
            {current.steps.map((item, idx) => {
              const hasError = imageErrors[item.imageName];
              return (
                <div key={item.step} className="flex items-center gap-3 flex-shrink-0">
                  {/* 步驟卡片 */}
                  <div className="w-[280px] sm:w-[320px] bg-white border-2 border-stone-800 rounded-2xl p-3.5 flex flex-col shadow-sm h-full">
                    {/* 上方：黑粗體字說明 */}
                    <div className="mb-2 min-h-[46px]">
                      <div className="flex items-center gap-1.5 text-xs font-black text-blue-700">
                        <span className="bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-md">
                          {item.step}
                        </span>
                      </div>
                      <p className="font-black text-stone-900 text-xs sm:text-sm mt-1 leading-snug">
                        {item.title}
                      </p>
                    </div>

                    {/* 下方：截圖區域 (支援點選放大檢視) */}
                    <div
                      onClick={() => {
                        if (!hasError) openImageZoom(item);
                      }}
                      title={!hasError ? '點擊放大圖片檢視' : undefined}
                      className={`flex-1 w-full min-h-[170px] bg-[#eef3f8] border-2 rounded-xl overflow-hidden relative flex flex-col items-center justify-center p-2 text-center group transition-all ${
                        !hasError
                          ? 'border-stone-400 hover:border-blue-500 cursor-zoom-in hover:shadow-md'
                          : 'border-dashed border-stone-300'
                      }`}
                    >
                      {!hasError ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/ui_asset/tutorial/${item.imageName}`}
                            alt={item.title}
                            onError={() => handleImageError(item.imageName)}
                            className="w-full h-full object-contain rounded-lg group-hover:scale-102 transition-transform"
                          />
                          {/* 懸浮放大提示徽章 */}
                          <div className="absolute bottom-2 right-2 bg-stone-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none shadow-md backdrop-blur-xs">
                            <span>🔍</span>
                            <span>點擊放大檢視</span>
                          </div>
                        </>
                      ) : (
                        // 尚未放入圖片時的貼心預留框
                        <div className="space-y-1 text-stone-600 p-2">
                          <span className="text-2xl">📸</span>
                          <p className="text-xs font-bold text-stone-800">
                            步驟截圖展示區
                          </p>
                          <p className="text-[11px] text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block font-semibold">
                            {item.imageName}
                          </p>
                          <p className="text-[10px] text-stone-400 mt-1">
                            放至 public/ui_asset/tutorial/ 自動載入
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 超連結按鈕 (若該步驟有) */}
                    {item.link && (
                      <div className="mt-2.5">
                        <a
                          href={item.link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 active:translate-y-0.5 text-white text-xs font-black py-2 px-3 rounded-xl shadow-[0_3px_0_#1d4ed8] transition-all"
                        >
                          <span>{item.link.label}</span>
                        </a>
                      </div>
                    )}

                    {/* 補充說明 (若該步驟有) */}
                    {item.notes && item.notes.length > 0 && (
                      <div className="mt-2 space-y-0.5 text-[11px] text-stone-800 font-bold bg-amber-50 border border-amber-200 p-2 rounded-xl">
                        {item.notes.map((note, nIdx) => (
                          <p key={nIdx}>{note}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 步驟箭頭分隔 (非最後一步) */}
                  {idx < current.steps.length - 1 && (
                    <span className="text-stone-400 font-black text-xl sm:text-2xl select-none">
                      ➜
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 底部拉條提示小標 */}
          <div className="py-2 text-center text-xs font-bold text-stone-500 bg-white border-t border-stone-100 z-20">
            👉 左右滑動可查看完整步驟說明
          </div>
        </div>
      </div>

      {/* 2. 最頂層獨立截圖放大檢視燈箱 (z-[99999]，徹底覆蓋全螢幕，排在最前方！) */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[99999] flex flex-col bg-stone-950/95 backdrop-blur-md animate-fadeIn select-none overflow-hidden"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedImage(null);
          }}
        >
          {/* 燈箱頂部工具列 */}
          <div
            className="w-full px-4 sm:px-8 py-3 bg-stone-900/95 border-b border-stone-800 flex items-center justify-between text-white z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 步驟名稱與標題 */}
            <div className="flex items-center gap-2.5 min-w-0 pr-4">
              <span className="bg-blue-600 text-white font-black text-xs px-2.5 py-1 rounded-md shadow-xs flex-shrink-0">
                {selectedImage.step}
              </span>
              <h3 className="font-bold text-sm sm:text-base text-stone-100 truncate">
                {selectedImage.title}
              </h3>
            </div>

            {/* 控制器按鈕群組：縮小、比例、放大、重設、關閉 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center bg-stone-800 border border-stone-700 rounded-xl p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleZoom(-0.25)}
                  title="縮小 (快捷鍵 -)"
                  className="w-7 h-7 rounded-lg hover:bg-stone-700 active:scale-95 text-stone-200 font-black text-sm flex items-center justify-center transition-all"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  title="點擊重設為 100%"
                  className="px-2 text-xs font-mono font-bold text-stone-300 hover:text-white"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => handleZoom(0.25)}
                  title="放大 (快捷鍵 +)"
                  className="w-7 h-7 rounded-lg hover:bg-stone-700 active:scale-95 text-stone-200 font-black text-sm flex items-center justify-center transition-all"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={resetZoom}
                title="重設大小與位置"
                className="hidden sm:inline-flex items-center gap-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-bold border border-stone-700 transition-all active:scale-95"
              >
                ↺ 重設
              </button>

              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                title="關閉放大預覽 (Esc)"
                className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-base flex items-center justify-center shadow-md transition-all ml-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 畫布檢視區：支援滾輪縮放與按住拖曳 */}
          <div
            className="flex-1 w-full relative overflow-hidden flex items-center justify-center"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={(e) => e.stopPropagation()}
            style={{
              cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage.src}
              alt={selectedImage.title}
              draggable={false}
              className="max-w-[90vw] max-h-[75vh] object-contain rounded-xl select-none shadow-2xl pointer-events-auto"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.08s ease-out',
                willChange: 'transform',
              }}
            />
          </div>

          {/* 底部操作提示條 */}
          <div
            className="w-full py-2 bg-stone-900/95 border-t border-stone-800 text-center text-xs text-stone-400 select-none z-20 flex items-center justify-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <span>🖱️ 滑鼠滾輪可自由縮放 (50% ~ 400%)</span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">✋ 按住滑鼠左鍵可任意拖曳檢視細節</span>
            <span className="hidden sm:inline">|</span>
            <span>按 Esc 或點擊背景關閉</span>
          </div>
        </div>
      )}
    </>
  );
}

