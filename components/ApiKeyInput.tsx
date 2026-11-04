'use client';

// ============================================================
// components/ApiKeyInput.tsx — 可愛友善風格 AI 金鑰輸入元件
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

  useEffect(() => {
    const saved = localStorage.getItem('ig_travel_settings');
    if (saved) {
      try {
        const { provider: p, apiKey: k } = JSON.parse(saved);
        if (p || k) {
          onChange(p || provider, k || '');
        }
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLlmChange(newProvider: LLMProvider, newKey: string) {
    onChange(newProvider, newKey);
    localStorage.setItem(
      'ig_travel_settings',
      JSON.stringify({ provider: newProvider, apiKey: newKey })
    );
  }

  return (
    <div className="space-y-2">
      {/* 標題與模型切換 */}
      <div className="flex items-center justify-between">
        <label className="text-xs sm:text-sm font-bold text-stone-800 flex items-center gap-1.5">
          <span>✨</span>
          <span>Gemini API 金鑰</span>
        </label>
        
        {/* 模型快速切換 (預設 Gemini) */}
        <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200">
          <button
            type="button"
            onClick={() => handleLlmChange('gemini', apiKey)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
              provider === 'gemini'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Gemini (推薦)
          </button>
          <button
            type="button"
            onClick={() => handleLlmChange('openai', apiKey)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
              provider === 'openai'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            OpenAI
          </button>
        </div>
      </div>

      {/* 輸入框 */}
      <div className="relative">
        <input
          type={showKey ? 'text' : 'password'}
          placeholder={
            provider === 'gemini'
              ? '在此貼上金鑰 (以 AIzaSy 開頭...)'
              : '在此貼上 OpenAI Key (sk-...)'
          }
          value={apiKey}
          onChange={(e) => handleLlmChange(provider, e.target.value)}
          className="w-full px-3.5 py-2.5 pr-14 rounded-xl border-2 border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white text-xs sm:text-sm font-mono text-stone-800 transition-all outline-none"
        />
        <button
          type="button"
          onClick={() => setShowKey((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-400 hover:text-stone-700 select-none"
        >
          {showKey ? '隱藏' : '顯示'}
        </button>
      </div>

      {/* 友善申請超連結 */}
      <div className="pt-0.5">
        {provider === 'gemini' ? (
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50/80 hover:bg-amber-100/90 px-2.5 py-1 rounded-lg border border-amber-200/90 transition-colors shadow-xs"
          >
            <span>👉</span>
            <span className="underline underline-offset-2">免費申請 Google Gemini API Key（官方連結）</span>
            <span className="text-[10px]">↗</span>
          </a>
        ) : (
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg border border-stone-200 transition-colors"
          >
            <span>👉</span>
            <span className="underline underline-offset-2">前往取得 OpenAI API Key</span>
            <span className="text-[10px]">↗</span>
          </a>
        )}
      </div>
    </div>
  );
}
