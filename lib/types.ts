// ============================================================
// types.ts — 共用 TypeScript 型別定義
// ============================================================

/** 一篇 IG 貼文（解析後的結構化資料） */
export interface IGPost {
  url: string;
  caption: string;
  title: string;
  hashtags: string[];
  ownerName: string;
  ownerUsername: string;
  ownerUrl: string;
}

/** 一個 IG Collection（收藏夾） */
export interface IGCollection {
  name: string;       // 解碼後的名稱（例如「旅遊」）
  rawName: string;    // 原始 JSON 中的名稱字串
  posts: IGPost[];
}

/** LLM 成功辨識到景點的結果 */
export interface SpotResult {
  postIndex: number;
  post: IGPost;
  country: string;
  city: string;
  spotName: string;
  spotNameEn: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  // Geocoding 結果（後填）
  lat?: number;
  lng?: number;
  geocoded?: boolean;
}

/** LLM 找不到景點的結果 */
export interface NotFoundResult {
  postIndex: number;
  post: IGPost;
  reason: string;
}

/** LLM 對單篇貼文的回傳（JSON 格式） */
export interface LLMPostResult {
  post_index: number;
  found: boolean;
  country?: string;
  city?: string;
  spot_name?: string;
  spot_name_en?: string;
  description?: string;
  confidence?: 'high' | 'medium' | 'low';
  reason: string;
}

/** 整體分析進度狀態 */
export interface AnalysisProgress {
  stage: 'idle' | 'classifying' | 'geocoding' | 'generating' | 'done' | 'error';
  totalPosts: number;
  classifiedCount: number;
  foundCount: number;
  notFoundCount: number;
  geocodedCount: number;
  errorMessage?: string;
}

/** KML 生成所需的景點資料（去重後） */
export interface MergedSpot {
  country: string;
  city: string;
  spotName: string;
  spotNameEn: string;
  description: string;
  lat: number;
  lng: number;
  posts: IGPost[];  // 所有相關貼文
}

/** App 支援的 LLM 類型 */
export type LLMProvider = 'gemini' | 'openai';

/** 使用者設定 */
export interface AppSettings {
  provider: LLMProvider;
  apiKey: string;
  collectionName: string;
}

