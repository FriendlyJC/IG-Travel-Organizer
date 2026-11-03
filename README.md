# 🗺️ IG Travel Organizer

> 將 Instagram 旅遊收藏自動整理成 Google Earth KML 地圖

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/ig-travel-organizer)

## 📖 功能介紹

將 Meta（Instagram）匯出的 Saved Collection JSON 檔案，透過 AI 自動辨識每篇貼文的旅遊景點，輸出 KML 檔案匯入 Google Earth，即可在地圖上看到所有收藏過的旅遊景點。

## 🚀 使用流程

1. **下載 IG 資料**  
   Instagram → 個人檔案 → 設定 → 帳號 → 下載個人資訊 → 下載完整副本

2. **開啟 Web App**  
   前往 [Vercel 部署連結]

3. **輸入 AI API Key**（Gemini 推薦，費用極低）

4. **上傳 JSON 檔案**  
   上傳 `saved_collections.json`（必填）+ `saved_posts.json`（選填）

5. **選擇收藏夾**  
   點選偵測到的收藏夾（例如「旅遊」）或手動輸入名稱

6. **等待 AI 分析**  
   AI 批次分析每篇貼文，查詢景點座標

7. **下載結果**  
   - 📥 `KML 檔案` → 匯入 Google Earth
   - 📋 `找不到清單 CSV` → 手動確認無法辨識的貼文

8. **匯入 Google Earth**  
   Google Earth Web → 專案 → 從電腦匯入 KML 檔案

## 🗂️ KML 結構

```
IG Travel Spots
├── 🇻🇳 Vietnam (42)
│   ├── Tiệm Cà Phê Nhà Bên Rừng
│   └── Da Lat Night Market
├── 🇹🇭 Thailand (38)
├── 🇯🇵 Japan (35)
└── ...
```

## 🔒 隱私說明

- 所有 JSON 檔案僅在**瀏覽器本地**處理，不上傳至伺服器
- API Key 僅存於瀏覽器 localStorage，不會記錄於後端
- 伺服器端（Vercel）僅作為 LLM API 的 CORS 代理轉發

## 💰 API 費用估算

| 模型 | 275 篇貼文費用 |
|------|--------------|
| Gemini 2.0 Flash | ~$0.02 (約台幣 1 元) ⭐ |
| GPT-4o-mini | ~$0.03 |

## 🛠️ 本地開發

```bash
git clone https://github.com/YOUR_USERNAME/ig-travel-organizer
cd ig-travel-organizer
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

## 📦 部署至 Vercel

```bash
npm install -g vercel
vercel --prod
```

或直接按上方「Deploy with Vercel」按鈕一鍵部署。

## 🗺️ 技術架構

- **前端**：Next.js 15 + Tailwind CSS
- **AI**：Gemini 2.0 Flash / OpenAI GPT-4o-mini
- **Geocoding**：OpenStreetMap Nominatim（免費）
- **部署**：Vercel

## 📄 License

MIT License

