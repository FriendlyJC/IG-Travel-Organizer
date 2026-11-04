// app/api/proxy/route.ts
// LLM API 代理 Route — 解決 CORS 問題，讓前端可以安全呼叫 LLM
// 注意：此 Route 不記錄任何 API Key 或用戶資料

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: '無效的請求內容' }, { status: 400 });
  }

  const { provider, apiKey, prompt, model, query } = body as {
    provider: 'gemini' | 'openai' | 'google-maps-search';
    apiKey?: string;
    prompt?: string;
    model?: string;
    query?: string;
  };

  if (!provider) {
    return NextResponse.json({ error: '缺少 provider 參數' }, { status: 400 });
  }

  try {
    if (provider === 'google-maps-search') {
      if (!query) return NextResponse.json({ error: '缺少 query 參數' }, { status: 400 });
      return await callGoogleMapsSearch(query);
    }

    if (!apiKey) {
      return NextResponse.json({ error: '缺少 apiKey 參數' }, { status: 400 });
    }

    if (provider === 'gemini') {
      if (!prompt) return NextResponse.json({ error: '缺少 prompt 參數' }, { status: 400 });
      return await callGemini(apiKey, prompt, model);
    } else if (provider === 'openai') {
      if (!prompt) return NextResponse.json({ error: '缺少 prompt 參數' }, { status: 400 });
      return await callOpenAI(apiKey, prompt);
    } else {
      return NextResponse.json({ error: '不支援的 provider' }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** 透過 Google Maps 搜尋 URL Fetch 取得景點真實座標 (免 API Key) */
async function callGoogleMapsSearch(query: string) {
  const url = `https://www.google.com/search?tbm=map&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ found: false, error: `HTTP ${res.status}` });
    }

    const text = await res.text();
    // Google Maps tbm=map 回傳結構：)]}' 後接巢狀陣列，其中包含 [距離/縮放, 經度, 緯度]
    const raw = text.replace(/^\)\]\}'/, '').trim();
    const match = raw.match(/\[\s*\d+(\.\d+)?\s*,\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\]/);

    if (match) {
      const lng = parseFloat(match[2]);
      const lat = parseFloat(match[3]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return NextResponse.json({ found: true, lat, lng });
      }
    }

    return NextResponse.json({ found: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ found: false, error: msg });
  }
}

let cachedGeminiModel: string | null = null;

async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message ?? res.statusText;
      throw new Error(`無法獲取可用模型列表: ${msg}`);
    }
    const data = await res.json();
    const models: Array<{ name: string; supportedGenerationMethods?: string[] }> = data.models || [];

    // 篩選支援 generateContent 的模型
    const supported = models
      .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => m.name);

    // 優先順序：含 flash 的模型優先排序，其次其他 gemini 模型
    const flashModels = supported.filter((name) => name.toLowerCase().includes('flash'));
    const otherModels = supported.filter((name) => !name.toLowerCase().includes('flash'));

    return [...flashModels, ...otherModels];
  } catch (e) {
    console.warn('動態獲取 Gemini 模型列表失敗:', e);
    return [];
  }
}

async function callGemini(apiKey: string, prompt: string, requestedModel?: string) {
  // 若有指定 model，優先使用
  let candidateModels: string[] = [];
  if (requestedModel) {
    candidateModels.push(requestedModel);
  }

  // 若快取中已有驗證過可用的 model，排在最前
  if (cachedGeminiModel && !candidateModels.includes(cachedGeminiModel)) {
    candidateModels.push(cachedGeminiModel);
  }

  // 動態獲取該 API Key 目前帳戶支援的所有模型
  const available = await getAvailableGeminiModels(apiKey);
  for (const m of available) {
    if (!candidateModels.includes(m)) {
      candidateModels.push(m);
    }
  }

  // 萬一 ListModels 失敗的保底靜態列表
  const fallbackDefaults = [
    'models/gemini-2.5-flash',
    'models/gemini-2.0-flash',
    'models/gemini-1.5-flash',
    'models/gemini-pro',
  ];
  for (const fb of fallbackDefaults) {
    if (!candidateModels.includes(fb)) {
      candidateModels.push(fb);
    }
  }

  let lastError = '';

  for (const rawModel of candidateModels) {
    const modelPath = rawModel.startsWith('models/') ? rawModel : `models/${rawModel}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,     // 低溫度，讓輸出穩定
            maxOutputTokens: 4096,
          },
        }),
      });

      if (res.ok) {
        // 成功！記住這個能正常運作的模型
        cachedGeminiModel = modelPath;
        const data = await res.json();
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return NextResponse.json({ text, model: modelPath });
      }

      const err = await res.json().catch(() => ({}));
      lastError = err?.error?.message ?? res.statusText;

      // 若是 API Key 本身無效，就不用繼續換模型試了，直接中斷
      if (lastError.toLowerCase().includes('api key not valid') || lastError.toLowerCase().includes('api_key_invalid')) {
        return NextResponse.json({ error: `API Key 無效，請檢查輸入的 Gemini API Key。` }, { status: 400 });
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({ error: `Gemini API 呼叫失敗: ${lastError}` }, { status: 400 });
}

async function callOpenAI(apiKey: string, prompt: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: 'text' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message ?? res.statusText;
    return NextResponse.json({ error: `OpenAI API 錯誤: ${msg}` }, { status: res.status });
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? '';
  return NextResponse.json({ text });
}

