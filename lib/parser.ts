// ============================================================
// parser.ts — IG JSON 解析 & mojibake 自動解碼
// ============================================================

import { IGCollection, IGPost } from './types';

// ─── Mojibake 解碼 ───────────────────────────────────────────

/**
 * 自動偵測並修復 Instagram 匯出 JSON 中的 mojibake 編碼問題。
 * Meta 的 JSON 匯出會將 UTF-8 bytes 以 Latin-1 字元寫入，
 * 導致中文、泰文、越南文等非 ASCII 文字顯示錯亂。
 *
 * 解碼方式：將字串以 Latin-1 反向解讀，還原成正確的 UTF-8。
 */
export function decodeMojibake(str: string): string {
  if (!str) return str;
  try {
    // 將 JS 字串中的每個 char code 轉為 byte，再以 UTF-8 解讀
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    const decoded = new TextDecoder('utf-8').decode(bytes);
    // 若解碼後包含合理的 Unicode（非替換字元），才採用解碼結果
    if (!decoded.includes('\uFFFD')) {
      return decoded;
    }
    return str;
  } catch {
    return str;
  }
}

// ─── JSON 結構解析工具 ─────────────────────────────────────────

type RawLabelValue = {
  label?: string;
  value?: string;
  timestamp_value?: number;
  href?: string;
  dict?: RawLabelValue[];
  title?: string;
};

/** 在 label_values 陣列中找到特定 label 的 value */
function findLabel(items: RawLabelValue[], label: string): string {
  for (const item of items) {
    if (item.label === label) {
      return item.value ?? '';
    }
  }
  return '';
}

/** 在 label_values 陣列中找到特定 title 的 dict */
function findDict(items: RawLabelValue[], title: string): RawLabelValue[] {
  for (const item of items) {
    if (item.title === title && Array.isArray(item.dict)) {
      return item.dict;
    }
  }
  return [];
}

/** 從 Owner dict 中擷取欄位 */
function extractOwnerField(ownerDict: RawLabelValue[], field: string): string {
  for (const entry of ownerDict) {
    if (Array.isArray(entry.dict)) {
      const val = findLabel(entry.dict, field);
      if (val) return val;
    }
  }
  return '';
}

/** 從 Hashtags dict 中擷取所有標籤名稱 */
function extractHashtags(hashtagDict: RawLabelValue[]): string[] {
  const tags: string[] = [];
  for (const entry of hashtagDict) {
    if (Array.isArray(entry.dict)) {
      const name = findLabel(entry.dict, 'Name');
      if (name) tags.push(name);
    }
  }
  return tags;
}

/** 從一個貼文 dict 物件中解析出 IGPost */
function parsePost(postObj: { dict?: RawLabelValue[] }): IGPost | null {
  const d = postObj.dict;
  if (!Array.isArray(d)) return null;

  // Caption 可能出現多次（取第一個非空的）
  let caption = '';
  for (const item of d) {
    if (item.label === 'Caption' && item.value) {
      caption = decodeMojibake(item.value);
      break;
    }
  }

  const url = findLabel(d, 'URL');
  if (!url) return null; // 無 URL 的貼文跳過

  const title = decodeMojibake(findLabel(d, 'Title'));
  const hashtagDict = findDict(d, 'Hashtags');
  const hashtags = extractHashtags(hashtagDict);

  const ownerDict = findDict(d, 'Owner');
  const ownerName = decodeMojibake(extractOwnerField(ownerDict, 'Name'));
  const ownerUsername = extractOwnerField(ownerDict, 'Username');
  const ownerUrl = extractOwnerField(ownerDict, 'URL');

  return { url, caption, title, hashtags, ownerName, ownerUsername, ownerUrl };
}

// ─── 主要解析函式 ──────────────────────────────────────────────

/**
 * 解析 saved_collections.json 的內容，
 * 回傳所有 Collection（含貼文）的陣列。
 */
export function parseCollections(jsonText: string): IGCollection[] {
  let data: RawLabelValue[][];
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error('JSON 格式錯誤，請確認上傳的是正確的 saved_collections.json 檔案。');
  }

  if (!Array.isArray(data)) {
    throw new Error('JSON 格式不符合預期（應為陣列）。');
  }

  const collections: IGCollection[] = [];

  for (const colObj of data) {
    const labelValues: RawLabelValue[] = (colObj as unknown as { label_values?: RawLabelValue[] }).label_values ?? [];

    // 取 Collection 名稱
    const rawName = findLabel(labelValues, 'Name');
    const name = decodeMojibake(rawName);

    // 找包含貼文的 dict（找最大的那個）
    let postsRaw: RawLabelValue[] = [];
    for (const lv of labelValues) {
      if (Array.isArray(lv.dict) && lv.dict.length > postsRaw.length) {
        postsRaw = lv.dict;
      }
    }

    // 解析每篇貼文
    const posts: IGPost[] = [];
    for (const postObj of postsRaw) {
      const post = parsePost(postObj as { dict?: RawLabelValue[] });
      if (post) posts.push(post);
    }

    collections.push({ name, rawName, posts });
  }

  return collections;
}

/**
 * 在解析後的 collections 中，依名稱找到目標 collection。
 * 支援大小寫不敏感比對，並修剪首尾空格。
 */
export function findCollectionByName(
  collections: IGCollection[],
  targetName: string
): IGCollection | undefined {
  const normalized = targetName.trim().toLowerCase();
  return collections.find(
    (c) => c.name.trim().toLowerCase() === normalized
  );
}

