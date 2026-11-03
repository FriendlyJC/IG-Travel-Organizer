'use client';

// ============================================================
// components/ApiKeyInput.tsx — API Key 輸入 + LLM 選擇
// ============================================================

import { useState, useEffect } from 'react';
import { LLMProvider } from '@/lib/types';

interface Props {
  provider: LLMProvider;
  apiKey: string;
  onChange: (provider: LLMProvider, apiKey: string) => void;
}

export default function ApiKeyInput({ provider, apiKey, onChange }: Props) {
  const [showKey, setShowKey] = useState(false);

  // 從 localStorage 還原上次使用的設定
  useEffect(() => {
    const saved = localStorage.getItem('ig_travel_settings');
    if (saved) {
      try {
        const { provider: p, apiKey: k } = JSON.parse(saved);
        if (p && k) onChange(p, k);
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(newProvider: LLMProvider, newKey: string) {
    onChange(newProvider, newKey);
    localStorage.setItem('ig_travel_settings', JSON.stringify({ provider: newProvider, apiKey: newKey }));
  }

  return (
    <div className="space-y-3">
      {/* LLM 選擇 */}
      <div className="flex gap-3">
        {(['gemini', 'openai'] as LLMProvider[]).map((p) => (
          <button
            key={p}
            onClick={() => handleChange(p, apiKey)}
            className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
              provider === p
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {p === 'gemini' ? '✨ Gemini (推薦)' : '🤖 OpenAI'}
          </button>
        ))}
      </div>

      {/* API Key 輸入 */}
      <div className="relative">
        <input
          type={showKey ? 'text' : 'password'}
          placeholder={
            provider === 'gemini'
              ? 'AIzaSy... (Gemini API Key)'
              : 'sk-... (OpenAI API Key)'
          }
          value={apiKey}
          onChange={(e) => handleChange(provider, e.target.value)}
          className="w-full px-4 py-2.5 pr-20 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-400 text-sm font-mono"
        />
        <button
          type="button"
          onClick={() => setShowKey((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
        >
          {showKey ? '隱藏' : '顯示'}
        </button>
      </div>

      {/* 說明 */}
      <p className="text-xs text-gray-400 flex items-center gap-1">
        🔒 API Key 僅儲存於瀏覽器本地，不會上傳至任何伺服器
        {provider === 'gemini' && (
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline hover:text-blue-600 ml-1"
          >
            取得 Gemini Key →
          </a>
        )}
      </p>
    </div>
  );
}

