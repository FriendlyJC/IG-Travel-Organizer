'use client';

// ============================================================
// components/FileUploader.tsx — 可愛友善風格 JSON 上傳元件 (精簡單檔 saved_collections)
// ============================================================

import { useState, useCallback } from 'react';

interface UploadedFiles {
  collectionsJson: string | null;
  postsJson: string | null;
}

interface Props {
  onFilesLoaded: (files: UploadedFiles) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('讀取檔案失敗'));
    reader.readAsText(file, 'utf-8');
  });
}

export default function FileUploader({ onFilesLoaded }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setErrorMsg(null);
    if (!file.name.endsWith('.json')) {
      setErrorMsg('請上傳 .json 格式的檔案（例如 saved_collections.json）');
      return;
    }

    try {
      const text = await readFileAsText(file);
      setFileName(file.name);
      setFileSize(formatSize(file.size));
      setIsSuccess(true);
      onFilesLoaded({ collectionsJson: text, postsJson: null });
    } catch {
      setErrorMsg('檔案讀取失敗，請確認檔案格式是否正確');
    }
  }, [onFilesLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div className="space-y-2.5">
      {/* 拖放上傳按鈕區域 */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => document.getElementById('single-file-input')?.click()}
        className={`group relative border-2 border-dashed rounded-2xl py-3.5 px-4 text-center transition-all cursor-pointer select-none ${
          isDragging
            ? 'border-amber-500 bg-amber-50 scale-[1.01]'
            : isSuccess
            ? 'border-emerald-400 bg-emerald-50/70'
            : 'border-amber-200/90 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50/80 shadow-xs'
        }`}
      >
        <input
          id="single-file-input"
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleInputChange}
        />

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center space-y-1">
            <span className="text-2xl animate-bounce">🎉</span>
            <p className="text-xs sm:text-sm font-bold text-emerald-800">
              已成功載入 {fileName}
            </p>
            <p className="text-[11px] text-emerald-600 font-mono">
              檔案大小：{fileSize}（點擊可重新更換檔案）
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-1">
            <span className="text-2xl group-hover:scale-110 transition-transform">📂</span>
            <p className="text-xs sm:text-sm font-bold text-stone-800">
              點擊或拖放上傳 <span className="text-amber-700 underline font-mono">saved_collections.json</span>
            </p>
            <p className="text-[11px] text-stone-500">
              僅需這一個檔案即可自動分析整理！
            </p>
          </div>
        )}
      </div>

      {/* 錯誤提示 */}
      {errorMsg && (
        <p className="text-xs text-rose-600 font-bold bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <span>⚠️</span> {errorMsg}
        </p>
      )}
    </div>
  );
}
