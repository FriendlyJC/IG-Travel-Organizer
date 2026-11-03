// app/api/proxy/route.ts
// LLM API 代理 Route — 解決 CORS 問題，讓前端可以安全呼叫 LLM
// 注意：此 Route 不記錄任何 API Key 或用戶資料

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: '無效的請求內容' }, { status: 400 });
  }

  const { provider, apiKey, prompt } = body as {
    provider: 'gemini' | 'openai';
    apiKey: string;
    prompt: string;
  };

  if (!provider || !apiKey || !prompt) {
    return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
  }

  try {
    if (provider === 'gemini') {
      return await callGemini(apiKey, prompt);
    } else if (provider === 'openai') {
      return await callOpenAI(apiKey, prompt);
    } else {
      return NextResponse.json({ error: '不支援的 LLM provider' }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function callGemini(apiKey: string, prompt: string) {
  // 優先使用最新的 gemini-3.8-flash，並提供自動備援
  const models = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError = '';

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
        const data = await res.json();
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return NextResponse.json({ text });
      }

      const err = await res.json().catch(() => ({}));
      lastError = err?.error?.message ?? res.statusText;

      // 若是 API Key 無效或配額問題，直接中斷回報錯誤
      if (res.status === 400 && !lastError.includes('no longer available') && !lastError.includes('not found')) {
        break;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({ error: `Gemini API 錯誤: ${lastError}` }, { status: 400 });
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

