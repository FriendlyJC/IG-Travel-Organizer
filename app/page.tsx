'use client';

// ============================================================
// app/page.tsx — 主頁面（單頁式工作流）
// ============================================================

import { useState, useCallback } from 'react';
import ApiKeyInput from '@/components/ApiKeyInput';
import FileUploader from '@/components/FileUploader';
import CollectionPicker from '@/components/CollectionPicker';
import ProgressPanel from '@/components/ProgressPanel';
import ResultPanel from '@/components/ResultPanel';
import NotFoundTable from '@/components/NotFoundTable';

import { parseCollections, findCollectionByName } from '@/lib/parser';
import { classifyPosts } from '@/lib/classifier';
import { geocodeSpots } from '@/lib/geocoder';
import { mergeSpots, generateKml, downloadKml } from '@/lib/kml-generator';
import { generateNotFoundCsv, downloadCsv, extractNoCoordSpots } from '@/lib/not-found-generator';

import {
  LLMProvider,
  IGCollection,
  AnalysisProgress,
  SpotResult,
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
  // 設定
  const [provider, setProvider] = useState<LLMProvider>('gemini');
  const [apiKey, setApiKey] = useState('');

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

  // ── 檔案上傳 ────────────────────────────────────────────────
  const handleFilesLoaded = useCallback(
    (files: { collectionsJson: string | null; postsJson: string | null }) => {
      if (!files.collectionsJson) return;
      setCollectionsJson(files.collectionsJson);

      // 解析 collections
      try {
        const parsed = parseCollections(files.collectionsJson);
        setCollections(parsed);
        // 重置狀態
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
      alert('請先輸入 API Key');
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

    // 初始化進度
    setProgress({
      stage: 'classifying',
      totalPosts: posts.length,
      classifiedCount: 0,
      foundCount: 0,
      notFoundCount: 0,
      geocodedCount: 0,
    });

    try {
      // ── Phase 1: LLM 分類 ─────────────────────────────────
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

      // ── Phase 2: Geocoding ────────────────────────────────
      setProgress((prev) => ({
        ...prev,
        stage: 'geocoding',
        classifiedCount: posts.length,
      }));

      let geocoded = 0;
      const geocodedSpots = await geocodeSpots(rawSpots, {
        onProgress: (done, total) => {
          geocoded = done;
          setProgress((prev) => ({ ...prev, geocodedCount: done }));
        },
      });

      // ── Phase 3: 生成 KML ─────────────────────────────────
      setProgress((prev) => ({ ...prev, stage: 'generating' }));

      // 合併：找不到座標的景點也加入 notFound
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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-800">🗺️ IG Travel Organizer</h1>
          <p className="text-sm text-slate-500">
            將 Instagram 旅遊收藏自動整理成 Google Earth KML 地圖
          </p>
        </div>

        {/* Step 1: API Key */}
        <Section step="1" title="設定 AI 模型">
          <ApiKeyInput
            provider={provider}
            apiKey={apiKey}
            onChange={handleApiKeyChange}
          />
        </Section>

        {/* Step 2: 上傳 JSON */}
        <Section step="2" title="上傳 IG 匯出資料">
          <FileUploader onFilesLoaded={handleFilesLoaded} />
          <p className="text-xs text-gray-400 mt-2">
            📂 請上傳 Meta 資料下載中 <code className="bg-gray-100 px-1 rounded">saved/</code> 資料夾內的 JSON 檔案
          </p>
        </Section>

        {/* Step 3: 選擇 Collection */}
        {collections.length > 0 && (
          <Section step="3" title="選擇收藏夾">
            <CollectionPicker
              collections={collections}
              selectedName={selectedCollection}
              onChange={setSelectedCollection}
            />
          </Section>
        )}

        {/* 開始按鈕 */}
        {collections.length > 0 && (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all ${
              canStart
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isRunning ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                分析中...
              </span>
            ) : '🚀 開始分析'}
          </button>
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

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 pt-4 space-y-1">
          <p>🔒 所有資料僅在瀏覽器處理，不儲存於伺服器</p>
          <p>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-600 underline"
            >
              GitHub
            </a>
            {' · '}
            MIT License
          </p>
        </footer>
      </div>
    </main>
  );
}

// ─── Section 包裝元件 ──────────────────────────────────────────
function Section({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {step}
        </span>
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

