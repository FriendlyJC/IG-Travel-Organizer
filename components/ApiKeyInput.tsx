'use client';

// ============================================================
// components/ApiKeyInput.tsx — API Key 輸入 + LLM 選擇 + Geocoding API
// ============================================================

import { useState, useEffect } from 'react';
import { LLMProvider } from '@/lib/types';

interface Props {
  provider: LLMProvider;
  apiKey: string;
  googleApiKey: string;
  onChange: (provider: LLMProvider, apiKey: string, googleApiKey: string) => void;
}

export default function ApiKeyInput({ provider, apiKey, googleApiKey, onChange }: Props) {
  const [showKey, setShowKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [testState, setTestState] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  // 從 localStorage 還原上次使用的設定
  useEffect(() => {
    const saved = localStorage.getItem('ig_travel_settings');
    if (saved) {
      try {
        const { provider: p, apiKey: k, googleApiKey: gk } = JSON.parse(saved);
        if (p || k || gk) {
          onChange(p || provider, k || '', gk || '');
        }
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLlmChange(newProvider: LLMProvider, newKey: string) {
    onChange(newProvider, newKey, googleApiKey);
    saveSettings(newProvider, newKey, googleApiKey);
  }

  function handleGoogleKeyChange(newGoogleKey: string) {
    onChange(provider, apiKey, newGoogleKey);
    saveSettings(provider, apiKey, newGoogleKey);
    setTestState({ status: 'idle' });
  }

  async function testGoogleKey() {
    if (!googleApiKey.trim()) {
      setTestState({ status: 'error', message: '請先輸入 Google Geocoding API Key' });
      return;
    }

    setTestState({ status: 'testing', message: '正在向 Google 查詢測試地標...' });

    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google-geocode',
          apiKey: googleApiKey.trim(),
          address: 'Taipei 101, Taiwan',
        }),
      });

      const data = await res.json();

      if (data.found) {
        setTestState({
          status: 'success',
          message: `連線成功！成功解析「${data.formattedAddress || 'Taipei 101'}」(${data.lat.toFixed(4)}, ${data.lng.toFixed(4)})`,
        });
      } else {
        const errDetail = data.errorMessage || data.status || '未知錯誤';
        let tip = '';
        if (data.status === 'REQUEST_DENIED') {
          tip = '（常見原因：Google Cloud 未啟用「Geocoding API」、或 API Key 設有限制、或尚未綁定帳單）';
        }
        setTestState({
          status: 'error',
          message: `Google 拒絕連線 [${data.status || '錯誤'}]: ${errDetail} ${tip}`,
        });
      }
    } catch (e) {
      setTestState({
        status: 'error',
        message: `請求失敗: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  function saveSettings(p: LLMProvider, k: string, gk: string) {
    localStorage.setItem(
      'ig_travel_settings',
      JSON.stringify({ provider: p, apiKey: k, googleApiKey: gk })
    );
  }

  return (
    <div className="space-y-4">
      {/* ── 區塊 1：LLM 設定 ── */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
          1. AI 語言模型 (必填，用於分析貼文與景點名稱)
        </label>

        {/* LLM 選擇 */}
        <div className="flex gap-3">
          {(['gemini', 'openai'] as LLMProvider[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleLlmChange(p, apiKey)}
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

        {/* LLM API Key 輸入 */}
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            placeholder={
              provider === 'gemini'
                ? 'AIzaSy... (Gemini API Key)'
                : 'sk-... (OpenAI API Key)'
            }
            value={apiKey}
            onChange={(e) => handleLlmChange(provider, e.target.value)}
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

        <p className="text-xs text-gray-400 flex items-center gap-1">
          🔒 API Key 僅儲存於瀏覽器本地，不儲存於伺服器
          {provider === 'gemini' && (
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline hover:text-blue-600 ml-1"
            >
              取得免費 Gemini Key →
            </a>
          )}
        </p>
      </div>

      {/* ── 區塊 2：Google Maps Geocoding API 設定 (選填) ── */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-600 block">
            2. Google Maps Geocoding API Key (選填)
          </label>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showGoogleKey ? 'text' : 'password'}
              placeholder="AIzaSy... (Google Cloud Geocoding API Key)"
              value={googleApiKey}
              onChange={(e) => handleGoogleKeyChange(e.target.value)}
              className="w-full px-4 py-2.5 pr-20 rounded-lg border border-gray-200 focus:outline-none focus:border-amber-400 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setShowGoogleKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              {showGoogleKey ? '隱藏' : '顯示'}
            </button>
          </div>

          <button
            type="button"
            onClick={testGoogleKey}
            disabled={testState.status === 'testing' || !googleApiKey.trim()}
            className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 disabled:bg-gray-100 text-amber-800 disabled:text-gray-400 border border-amber-200 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
          >
            {testState.status === 'testing' ? '連線中...' : '🔍 測試此 Key'}
          </button>
        </div>

        {/* 測試結果反饋 */}
        {testState.status === 'success' && (
          <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 flex items-start gap-1.5">
            <span className="font-bold">✅</span>
            <span>{testState.message}</span>
          </div>
        )}
        {testState.status === 'error' && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-1.5 leading-relaxed">
            <span className="font-bold">❌</span>
            <span>{testState.message}</span>
          </div>
        )}

        {/* 橘色提示字 */}
        <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
          *建議使用Geocoding 座標更精確
          <span className="text-gray-400 font-normal">
            (若未填寫，系統將自動使用 OpenStreetMap 與 AI 備援座標)
          </span>
        </p>
      </div>
    </div>
  );
}
