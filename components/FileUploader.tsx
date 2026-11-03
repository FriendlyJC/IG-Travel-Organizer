'use client';

// ============================================================
// components/FileUploader.tsx — 雙 JSON 上傳元件
// ============================================================

import { useState, useCallback } from 'react';

interface UploadedFiles {
  collectionsJson: string | null;
  postsJson: string | null;
}

interface Props {
  onFilesLoaded: (files: UploadedFiles) => void;
}

interface FileStatus {
  collections: 'idle' | 'loading' | 'ok' | 'error';
  posts: 'idle' | 'loading' | 'ok' | 'error';
  collectionsName?: string;
  postsName?: string;
  collectionsSize?: string;
  postsSize?: string;
  error?: string;
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
  const [status, setStatus] = useState<FileStatus>({
    collections: 'idle',
    posts: 'idle',
  });
  const [files, setFiles] = useState<UploadedFiles>({
    collectionsJson: null,
    postsJson: null,
  });
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = useCallback(async (fileList: File[]) => {
    const jsonFiles = fileList.filter((f) => f.name.endsWith('.json'));
    if (jsonFiles.length === 0) {
      setStatus((s) => ({ ...s, error: '請上傳 .json 格式的檔案' }));
      return;
    }

    const newFiles = { ...files };
    const newStatus = { ...status, error: undefined };

    for (const file of jsonFiles) {
      if (file.name.includes('saved_collections')) {
        newStatus.collections = 'loading';
        setStatus({ ...newStatus });
        try {
          newFiles.collectionsJson = await readFileAsText(file);
          newStatus.collections = 'ok';
          newStatus.collectionsName = file.name;
          newStatus.collectionsSize = formatSize(file.size);
        } catch {
          newStatus.collections = 'error';
        }
      } else if (file.name.includes('saved_posts')) {
        newStatus.posts = 'loading';
        setStatus({ ...newStatus });
        try {
          newFiles.postsJson = await readFileAsText(file);
          newStatus.posts = 'ok';
          newStatus.postsName = file.name;
          newStatus.postsSize = formatSize(file.size);
        } catch {
          newStatus.posts = 'error';
        }
      }
    }

    setStatus(newStatus);
    setFiles(newFiles);

    // 兩個檔案都上傳完成後通知父元件
    if (newFiles.collectionsJson && newFiles.postsJson) {
      onFilesLoaded(newFiles);
    } else if (newFiles.collectionsJson && !newFiles.postsJson) {
      // 只有 collections 也可以繼續（posts 為輔助）
      onFilesLoaded(newFiles);
    }
  }, [files, status, onFilesLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const fileList = Array.from(e.dataTransfer.files);
    processFiles(fileList);
  }, [processFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files ?? []);
    processFiles(fileList);
  }, [processFiles]);

  const statusIcon = (s: 'idle' | 'loading' | 'ok' | 'error') => {
    if (s === 'ok') return <span className="text-green-500">✅</span>;
    if (s === 'error') return <span className="text-red-500">❌</span>;
    if (s === 'loading') return <span className="animate-spin">⏳</span>;
    return <span className="text-gray-300">⭕</span>;
  };

  return (
    <div className="space-y-3">
      {/* 拖放區域 */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept=".json"
          className="hidden"
          onChange={handleInputChange}
        />
        <p className="text-3xl mb-2">📁</p>
        <p className="text-sm text-gray-600 font-medium">拖放或點擊上傳 JSON 檔案</p>
        <p className="text-xs text-gray-400 mt-1">支援同時選取多個檔案</p>
      </div>

      {/* 檔案狀態 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm px-1">
          {statusIcon(status.collections)}
          <span className="font-mono text-gray-600">saved_collections.json</span>
          {status.collectionsSize && (
            <span className="text-gray-400 ml-auto text-xs">{status.collectionsSize}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm px-1">
          {statusIcon(status.posts)}
          <span className="font-mono text-gray-600">saved_posts.json</span>
          {status.postsSize && (
            <span className="text-gray-400 ml-auto text-xs">{status.postsSize}</span>
          )}
          <span className="text-xs text-gray-400">(選填)</span>
        </div>
      </div>

      {status.error && (
        <p className="text-sm text-red-500 px-1">{status.error}</p>
      )}
    </div>
  );
}

