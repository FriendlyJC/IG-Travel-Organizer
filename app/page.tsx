'use client';

// ============================================================
// app/page.tsx — 主頁面（三大步驟、問號卷軸教學彈窗、可愛旅遊風）
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import ApiKeyInput from '@/components/ApiKeyInput';
import FileUploader from '@/components/FileUploader';
import CollectionPicker from '@/components/CollectionPicker';
import ProgressPanel from '@/components/ProgressPanel';
import ResultPanel from '@/components/ResultPanel';
import NotFoundTable from '@/components/NotFoundTable';
import WeatherControls, { WeatherType } from '@/components/WeatherControls';
import CampfireAnimation from '@/components/CampfireAnimation';
import WeatherParticles from '@/components/WeatherParticles';
import NeonSparksEffect from '@/components/NeonSparksEffect';
import TutorialModal, { TutorialType } from '@/components/TutorialModal';

import { parseCollections, findCollectionByName } from '@/lib/parser';
import { classifyPosts } from '@/lib/classifier';
import { geocodeSpots } from '@/lib/geocoder';
import { mergeSpots, generateKml, downloadKml } from '@/lib/kml-generator';
import { generateNotFoundCsv, downloadCsv, extractNoCoordSpots } from '@/lib/not-found-generator';
import { soundManager } from '@/lib/sound';

import {
  LLMProvider,
  IGCollection,
  AnalysisProgress,
  NotFoundResult,
  MergedSpot,
} from '@/lib/types';

// ─── 初始狀態 ─────────────────────────────────────────────────

const initialProgress: AnalysisProgress = {
  stage: 'idle',
  totalPosts: 0,
  classifiedCount: 0,
  foundCount: 0,
  notFoundCount: 0,
  geocodedCount: 0,
};

// ─── 主元件 ───────────────────────────────────────────────────

export default function Home() {
  // 天氣切換 (預設晴天白天)
  const [weather, setWeather] = useState<WeatherType>('day');

  // 教學卷軸彈窗狀態
  const [activeTutorial, setActiveTutorial] = useState<TutorialType | null>(null);

  // 設定 (預設 Gemini)
  const [provider, setProvider] = useState<LLMProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [deepSearch, setDeepSearch] = useState(false);

  // 檔案 & 解析
  const [collectionsJson, setCollectionsJson] = useState<string | null>(null);
  const [collections, setCollections] = useState<IGCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState('');

  // 分析狀態
  const [progress, setProgress] = useState<AnalysisProgress>(initialProgress);
  const [isRunning, setIsRunning] = useState(false);

  // 結果
  const [mergedSpots, setMergedSpots] = useState<MergedSpot[]>([]);
  const [notFound, setNotFound] = useState<NotFoundResult[]>([]);

  // ── 天氣切換時播放對應背景音樂 ──────────────────────────────
  useEffect(() => {
    soundManager.setWeatherBgm(weather);
  }, [weather]);

  // ── 檔案上傳 ────────────────────────────────────────────────
  const handleFilesLoaded = useCallback(
    (files: { collectionsJson: string | null; postsJson: string | null }) => {
      if (!files.collectionsJson) return;
      setCollectionsJson(files.collectionsJson);

      try {
        const parsed = parseCollections(files.collectionsJson);
        setCollections(parsed);
        if (parsed.length > 0) {
          setSelectedCollection(parsed[0].name);
        }
        setProgress(initialProgress);
        setMergedSpots([]);
        setNotFound([]);
      } catch (e) {
        alert(`JSON 解析失敗：${e instanceof Error ? e.message : String(e)}`);
      }
    },
    []
  );

  // ── API Key 變更 ─────────────────────────────────────────────
  const handleApiKeyChange = (p: LLMProvider, k: string) => {
    setProvider(p);
    setApiKey(k);
  };

  // ── 驗證是否可以開始 ─────────────────────────────────────────
  const canStart =
    !isRunning &&
    apiKey.trim().length > 10 &&
    collectionsJson !== null &&
    collections.length > 0 &&
    selectedCollection.trim().length > 0 &&
    !!findCollectionByName(collections, selectedCollection);

  // ── 開始分析 ─────────────────────────────────────────────────
  const handleStart = async () => {
    const collection = findCollectionByName(collections, selectedCollection);
    if (!collection) {
      alert(`找不到名為「${selectedCollection}」的收藏夾`);
      return;
    }
    if (!apiKey.trim()) {
      alert('請先輸入 Gemini API Key');
      return;
    }

    const posts = collection.posts;
    if (posts.length === 0) {
      alert('此收藏夾沒有貼文');
      return;
    }

    setIsRunning(true);
    setMergedSpots([]);
    setNotFound([]);

    setProgress({
      stage: 'classifying',
      totalPosts: posts.length,
      classifiedCount: 0,
      foundCount: 0,
      notFoundCount: 0,
      geocodedCount: 0,
    });

    try {
      let classified = 0;
      let found = 0;
      let nf = 0;

      const { spots: rawSpots, notFound: rawNotFound } = await classifyPosts(posts, {
        provider,
        apiKey,
        batchSize: 10,
        onBatchComplete: (batchIdx, totalBatches, results) => {
          const batchFound = results.filter((r) => r.found).length;
          const batchNf = results.filter((r) => !r.found).length;
          classified += results.length;
          found += batchFound;
          nf += batchNf;
          setProgress((prev) => ({
            ...prev,
            classifiedCount: classified,
            foundCount: found,
            notFoundCount: nf,
          }));
        },
        onError: (batchIdx, error) => {
          console.error(`Batch ${batchIdx} error:`, error);
        },
      });

      setProgress((prev) => ({
        ...prev,
        stage: 'geocoding',
        classifiedCount: posts.length,
      }));

      let geocoded = 0;
      const geocodedSpots = await geocodeSpots(rawSpots, {
        deepSearch,
        onProgress: (done, total) => {
          geocoded = done;
          setProgress((prev) => ({ ...prev, geocodedCount: done }));
        },
      });

      setProgress((prev) => ({ ...prev, stage: 'generating' }));

      const noCoordItems = extractNoCoordSpots(geocodedSpots);
      const allNotFound = [...rawNotFound, ...noCoordItems];

      const merged = mergeSpots(geocodedSpots);
      setMergedSpots(merged);
      setNotFound(allNotFound);

      setProgress((prev) => ({
        ...prev,
        stage: 'done',
        geocodedCount: geocodedSpots.filter((s) => s.geocoded).length,
        notFoundCount: allNotFound.length,
      }));
    } catch (e) {
      setProgress((prev) => ({
        ...prev,
        stage: 'error',
        errorMessage: e instanceof Error ? e.message : String(e),
      }));
    } finally {
      setIsRunning(false);
    }
  };

  // ── 下載 KML ─────────────────────────────────────────────────
  const handleDownloadKml = () => {
    const kml = generateKml(mergedSpots, selectedCollection);
    downloadKml(kml, `${selectedCollection}_spots.kml`);
  };

  // ── 下載找不到清單 ────────────────────────────────────────────
  const handleDownloadCsv = () => {
    const csv = generateNotFoundCsv(notFound);
    downloadCsv(csv, 'not_found.csv');
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <main className="relative min-h-screen w-full overflow-hidden flex items-center justify-center select-none bg-stone-900">
      
      {/* 1. 底層全螢幕背景圖：Edge-to-Edge 鋪滿螢幕 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/ui_asset/${weather}/bg_${weather}.png`}
        alt="Weather Background"
        className="fixed inset-0 w-full h-full object-cover transition-opacity duration-700 pointer-events-none select-none z-0"
      />

      {/* 2. 天氣微調色氛圍 */}
      <div
        className={`fixed inset-0 pointer-events-none transition-colors duration-700 z-1 ${
          weather === 'night'
            ? 'bg-indigo-950/20'
            : weather === 'autumn'
            ? 'bg-amber-950/10'
            : weather === 'winter'
            ? 'bg-sky-950/10'
            : 'bg-transparent'
        }`}
      />

      {/* 3. 環境氛圍粒子 */}
      <WeatherParticles weather={weather} />

      {/* 4. 核心舞台：以原圖 1536x858 比例為基準，全螢幕自適應垂直居中 */}
      <div className="relative w-full h-screen max-w-[1920px] aspect-[1536/858] flex items-center justify-center z-10">

        {/* (A) 動態景物：湖畔營火 Lottie 動畫 */}
        <CampfireAnimation weather={weather} />

        {/* 布告欄整體群組 (放大 30%，以頂部霓虹燈為錨點 origin-[50%_4%] scale-[1.30]，確保霓虹燈絕不超出畫面頂部) */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-20 origin-[50%_4%] scale-[1.30]">
          {/* (B) 原版去背布告欄 PNG */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ui_asset/billboard_frame.png"
            alt="IG Travel Organizer 原版插畫布告欄"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-20"
          />

          {/* (C) 霓虹燈桃紅色微閃遮罩與火花特效 */}
          <div
            className="absolute z-40 pointer-events-none"
            style={{
              left: '32.55%',
              top: '4.08%',
              width: '34.77%',
              height: '16.78%',
            }}
          >
            <NeonSparksEffect />
          </div>

          {/* (D) 霓虹燈下方文字覆蓋修正標籤 (解決 AI 去背字體瑕疵，角度微傾 -1.15deg) */}
          <div
            className="absolute z-35 flex items-center justify-center pointer-events-none select-none"
            style={{
              left: '35.0%',
              top: '13.5%',
              width: '29.8%',
              height: '3.0%',
              transform: 'rotate(-1.15deg)',
            }}
          >
            <div className="w-full h-full bg-[#3d4f58] rounded-md flex items-center justify-center px-2 py-0.5 shadow-sm">
              <span className="text-[10px] sm:text-[11.5px] font-semibold text-[#f1f5f9] tracking-wide whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                將 Instagram 旅遊收藏自動整理成 Google Earth KML 檔案
              </span>
            </div>
          </div>

          {/* (E) 布告欄白板功能區 (嚴格鎖定於白板內部，啟用指針事件) */}
          <div
            className="absolute z-30 flex flex-col pointer-events-auto"
            style={{
              left: '36.8%',
              width: '26.4%',
              top: '26.2%',
              height: '50.8%',
            }}
          >
            {/* 白板卡片滾動區：大字體、可愛旅遊風、圖文友善 */}
            <div className="w-full h-full overflow-y-auto board-scrollbar p-1.5 sm:p-2 space-y-2.5">
              
              {/* Step 1: 設定 AI 金鑰 */}
              <div className="bg-white/95 rounded-2xl border-2 border-stone-200 shadow-sm p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                    1
                  </span>
                  <h2 className="font-bold text-stone-800 text-xs sm:text-sm flex items-center gap-1.5">
                    <span>🔑</span>
                    <span>設定 AI 金鑰</span>
                  </h2>
                  {/* 圓形藍底黑框白色問號教學按鈕 */}
                  <button
                    type="button"
                    onClick={() => setActiveTutorial('api')}
                    title="查看取得 API 金鑰教學"
                    className="w-5 h-5 rounded-full bg-blue-500 border-2 border-black text-white text-[11px] font-black flex items-center justify-center hover:scale-115 active:scale-95 shadow-xs cursor-pointer ml-auto transition-transform"
                  >
                    ?
                  </button>
                </div>
                <ApiKeyInput
                  provider={provider}
                  apiKey={apiKey}
                  onChange={handleApiKeyChange}
                />
              </div>

              {/* Step 2: 上傳 IG 旅遊收藏清單 */}
              <div className="bg-white/95 rounded-2xl border-2 border-stone-200 shadow-sm p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                    2
                  </span>
                  <h2 className="font-bold text-stone-800 text-xs sm:text-sm flex items-center gap-1.5">
                    <span>📂</span>
                    <span>上傳 IG 旅遊收藏清單</span>
                  </h2>
                  {/* 圓形藍底黑框白色問號教學按鈕 */}
                  <button
                    type="button"
                    onClick={() => setActiveTutorial('json')}
                    title="查看匯出 Instagram JSON 檔案步驟教學"
                    className="w-5 h-5 rounded-full bg-blue-500 border-2 border-black text-white text-[11px] font-black flex items-center justify-center hover:scale-115 active:scale-95 shadow-xs cursor-pointer ml-auto transition-transform"
                  >
                    ?
                  </button>
                </div>
                <FileUploader onFilesLoaded={handleFilesLoaded} />
              </div>

              {/* Step 2 載入收藏夾後的分析工作流 (移動至第二步與第三步之間) */}
              {collections.length > 0 && (
                <div className="bg-white/95 rounded-2xl border-2 border-stone-200 shadow-sm p-3 space-y-2.5 animate-fadeIn">
                  <h3 className="font-bold text-stone-800 text-xs sm:text-sm flex items-center gap-1.5">
                    <span>🗺️</span>
                    <span>選擇要整理的收藏夾</span>
                  </h3>
                  <CollectionPicker
                    collections={collections}
                    selectedName={selectedCollection}
                    onChange={setSelectedCollection}
                  />

                  {/* 開始按鈕 & 深度搜尋選項 */}
                  <div className="space-y-2.5 pt-1">
                    <button
                      onClick={handleStart}
                      disabled={!canStart}
                      className={`w-full py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm transition-all select-none flex items-center justify-center gap-2 ${
                        canStart
                          ? 'bg-amber-500 hover:bg-amber-600 active:translate-y-0.5 text-white shadow-[0_4px_0_#b45309,0_8px_16px_rgba(180,83,9,0.3)] active:shadow-[0_1px_0_#b45309]'
                          : 'bg-stone-200 text-stone-400 border border-stone-300 cursor-not-allowed'
                      }`}
                    >
                      {isRunning ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          AI 正在分析景點經緯度...
                        </span>
                      ) : (
                        '🚀 開始整理旅遊地圖'
                      )}
                    </button>

                    {/* 深度搜尋選項 (清晰放大排版) */}
                    <label className="flex items-start gap-2.5 cursor-pointer select-none bg-amber-50/95 border-2 border-amber-300 rounded-xl p-2.5 hover:bg-amber-100/80 transition-colors shadow-xs">
                      <input
                        type="checkbox"
                        checked={deepSearch}
                        onChange={(e) => setDeepSearch(e.target.checked)}
                        disabled={isRunning}
                        className="w-4 h-4 mt-0.5 text-amber-600 rounded border-stone-400 focus:ring-amber-500 cursor-pointer accent-amber-600"
                      />
                      <div className="leading-snug">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-stone-900 text-xs sm:text-sm">開啟深度搜尋模式</span>
                          <span className="text-amber-900 font-bold bg-amber-200 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] border border-amber-300">
                            ★ 大幅提高座標精準度
                          </span>
                        </div>
                        <p className="text-stone-600 text-[11px] sm:text-xs mt-1 leading-normal">
                          針對同景點多關鍵字交叉驗證 Google Maps 與 Nominatim，有效降低偏差！
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* 進度面板 */}
              {progress.stage !== 'idle' && (
                <ProgressPanel progress={progress} />
              )}

              {/* 結果面板 */}
              {progress.stage === 'done' && mergedSpots.length > 0 && (
                <ResultPanel
                  mergedSpots={mergedSpots}
                  notFound={notFound}
                  collectionName={selectedCollection}
                  onDownloadKml={handleDownloadKml}
                  onDownloadCsv={handleDownloadCsv}
                />
              )}

              {/* 找不到清單預覽 */}
              {progress.stage === 'done' && notFound.length > 0 && (
                <NotFoundTable items={notFound} />
              )}

              {/* Step 3: 匯入 Google Earth 即可完成 */}
              <div className="bg-white/95 rounded-2xl border-2 border-stone-200 shadow-sm p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                    3
                  </span>
                  <h2 className="font-bold text-stone-800 text-xs sm:text-sm flex items-center gap-1.5 leading-tight">
                    <span>🌍</span>
                    <span>將 KML 檔案匯入 Google Earth 即可完成</span>
                  </h2>
                  {/* 圓形藍底黑框白色問號教學按鈕 */}
                  <button
                    type="button"
                    onClick={() => setActiveTutorial('earth')}
                    title="查看匯入 Google Earth 教學"
                    className="w-5 h-5 rounded-full bg-blue-500 border-2 border-black text-white text-[11px] font-black flex items-center justify-center hover:scale-115 active:scale-95 shadow-xs cursor-pointer ml-auto transition-transform flex-shrink-0"
                  >
                    ?
                  </button>
                </div>

                {/* 地球 Icon + 開啟超連結 */}
                <div className="pt-0.5 space-y-1.5">
                  <a
                    href="https://earth.google.com/web/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:translate-y-0.5 text-white font-bold text-xs sm:text-sm shadow-md transition-all select-none"
                  >
                    <span className="text-base">🌍</span>
                    <span>點擊開啟 Google Earth 網頁版 ↗</span>
                  </a>
                  <p className="text-[11px] text-stone-500 text-center">
                    整理出的 KML 可直接匯入專案，在 3D 地球上看見所有旅遊景點！
                  </p>
                </div>
              </div>

              {/* 隱私說明小卡 */}
              <div className="text-center text-[10px] sm:text-xs text-stone-500 pt-1 pb-1 space-y-0.5 bg-white/70 rounded-xl p-2.5 border border-stone-200/60 shadow-xs">
                <p className="font-bold text-stone-700 flex items-center justify-center gap-1">
                  <span>🛡️</span>
                  <span>隱私安全保證</span>
                </p>
                <p className="text-[10px] sm:text-[11px] leading-relaxed">
                  所有貼文與 API Key 僅於你的瀏覽器端本機運作，絕不儲存或傳輸至第三方伺服器，請放心使用。
                </p>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* 5. 右上角：可愛天氣切換控制器與音樂開關 */}
      <WeatherControls currentWeather={weather} onChange={setWeather} />

      {/* 6. 羊皮紙卷軸風格操作教學彈窗 */}
      <TutorialModal
        type={activeTutorial}
        onClose={() => setActiveTutorial(null)}
      />

    </main>
  );
}
