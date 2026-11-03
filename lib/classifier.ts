// ============================================================
// classifier.ts — LLM 批次分類引擎
// ============================================================

import { IGPost, LLMPostResult, LLMProvider, SpotResult, NotFoundResult } from './types';

// ─── Prompt ───────────────────────────────────────────────────

function buildPrompt(posts: IGPost[], startIndex: number): string {
  const postsText = posts.map((p, i) => {
    const idx = startIndex + i;
    const hashtags = p.hashtags.length > 0 ? p.hashtags.map(h => `#${h}`).join(' ') : '(無)';
    const caption = p.caption ? p.caption.substring(0, 500) : '(無)';
    const title = p.title || '(無)';
    const owner = p.ownerName
      ? `${p.ownerName} (@${p.ownerUsername})`
      : `@${p.ownerUsername}`;
    const ownerUrl = p.ownerUrl || '(無)';

    return `[貼文 ${idx}]
URL: ${p.url}
標題: ${title}
內文: ${caption}
Hashtags: ${hashtags}
發布者: ${owner}
發布者連結: ${ownerUrl}`;
  }).join('\n\n');

  return `你是一個旅遊景點分析助手。請根據 Instagram 貼文中提供的線索（可能是標題、Hashtag、內文、內文使用的語言等），幫我整理出這些線索的景點位置。

請對以下每一篇貼文進行分析，以 JSON 陣列格式回覆，每個元素對應一篇貼文。

若能判斷景點位置，請使用以下格式：
{
  "post_index": <貼文編號>,
  "found": true,
  "country": "<國家英文名，例如 Vietnam>",
  "city": "<城市英文名，例如 Da Lat>",
  "spot_name": "<當地語言的景點/店家名稱>",
  "spot_name_en": "<景點英文名稱>",
  "description": "<50字以內的景點簡述>",
  "confidence": "<high|medium|low>",
  "reason": "<判斷依據，一句話>"
}

若無法判斷地點，請使用以下格式：
{
  "post_index": <貼文編號>,
  "found": false,
  "reason": "<無法判斷的原因>"
}

重要規則：
- 回覆必須是純 JSON 陣列，不得包含任何 markdown 格式或額外說明文字
- 每篇貼文都必須有對應的結果
- 語言判斷：越南文 → Vietnam、泰文 → Thailand、日文 → Japan、繁體中文且提及台灣地名 → Taiwan
- 若發布者連結包含 Google Maps 連結，這是非常可靠的地點線索
- confidence 評估：景點名稱明確 = high，有城市資訊 = medium，只有國家或語言推測 = low

===== 貼文列表 =====

${postsText}`;
}

// ─── Gemini API 呼叫 ───────────────────────────────────────────

async function callGemini(prompt: string, apiKey: string): Promise<LLMPostResult[]> {
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'gemini', apiKey, prompt }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Gemini API 錯誤: ${err.error || response.statusText}`);
  }

  const data = await response.json();
  return parseResults(data.text);
}

// ─── OpenAI API 呼叫 ───────────────────────────────────────────

async function callOpenAI(prompt: string, apiKey: string): Promise<LLMPostResult[]> {
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'openai', apiKey, prompt }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`OpenAI API 錯誤: ${err.error || response.statusText}`);
  }

  const data = await response.json();
  return parseResults(data.text);
}

// ─── LLM 回應解析 ─────────────────────────────────────────────

function parseResults(text: string): LLMPostResult[] {
  // 嘗試從回應文字中提取 JSON 陣列
  const cleaned = text.trim();

  // 找到 [ ... ] 的部分
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) {
    throw new Error(`LLM 回傳格式異常，無法找到 JSON 陣列：${cleaned.substring(0, 200)}`);
  }

  const jsonStr = cleaned.substring(start, end + 1);
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) throw new Error('回傳非陣列格式');
    return parsed as LLMPostResult[];
  } catch (e) {
    throw new Error(`JSON 解析失敗：${e}`);
  }
}

// ─── 主要批次分類函式 ──────────────────────────────────────────

interface ClassifyOptions {
  provider: LLMProvider;
  apiKey: string;
  batchSize?: number;
  onBatchComplete?: (batchIndex: number, totalBatches: number, results: LLMPostResult[]) => void;
  onError?: (batchIndex: number, error: Error) => void;
}

interface ClassifyResult {
  spots: SpotResult[];
  notFound: NotFoundResult[];
}

/**
 * 將 IGPost 陣列批次送至 LLM 分類，回傳景點列表與找不到列表。
 */
export async function classifyPosts(
  posts: IGPost[],
  options: ClassifyOptions
): Promise<ClassifyResult> {
  const { provider, apiKey, batchSize = 10, onBatchComplete, onError } = options;
  const spots: SpotResult[] = [];
  const notFound: NotFoundResult[] = [];

  const totalBatches = Math.ceil(posts.length / batchSize);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * batchSize;
    const end = Math.min(start + batchSize, posts.length);
    const batch = posts.slice(start, end);

    const prompt = buildPrompt(batch, start);

    let results: LLMPostResult[] = [];
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        if (provider === 'gemini') {
          results = await callGemini(prompt, apiKey);
        } else {
          results = await callOpenAI(prompt, apiKey);
        }
        break;
      } catch (error) {
        retries++;
        if (retries > maxRetries) {
          onError?.(batchIdx, error as Error);
          // 將這批全部標記為找不到
          for (let i = start; i < end; i++) {
            notFound.push({
              postIndex: i,
              post: posts[i],
              reason: `API 錯誤：${(error as Error).message}`,
            });
          }
          break;
        }
        // 等待後重試
        await sleep(2000 * retries);
      }
    }

    // 處理 LLM 結果
    for (const result of results) {
      const postIndex = result.post_index;
      if (postIndex < 0 || postIndex >= posts.length) continue;
      const post = posts[postIndex];

      if (result.found) {
        spots.push({
          postIndex,
          post,
          country: result.country ?? '',
          city: result.city ?? '',
          spotName: result.spot_name ?? '',
          spotNameEn: result.spot_name_en ?? '',
          description: result.description ?? '',
          confidence: result.confidence ?? 'low',
          reason: result.reason,
        });
      } else {
        notFound.push({
          postIndex,
          post,
          reason: result.reason,
        });
      }
    }

    onBatchComplete?.(batchIdx, totalBatches, results);

    // 批次間間隔 1 秒，避免 rate limit
    if (batchIdx < totalBatches - 1) {
      await sleep(1000);
    }
  }

  return { spots, notFound };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

