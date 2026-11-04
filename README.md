# 🗺️ IG Travel Organizer

> 將 Instagram 旅遊收藏自動整理至 Google Earth 地圖

無須登入即可使用：https://ig-travel-organizer.vercel.app/

## 📖 功能介紹

將 Meta（Instagram）匯出的 Saved Collection JSON 檔案，透過 AI 自動辨識每篇貼文的旅遊景點，輸出 KML 檔案後，手動匯入 Google Earth，即可在地圖上看到所有收藏過的旅遊景點。

## 🚀 使用流程

1. **下載 IG 資料**  
   Instagram → 個人檔案 → 設定 → Meta 帳號管理 → 您的資訊與權限 → 匯出個人資訊 → 匯出資訊指勾選(Saved 收藏)格式為 JSON → 下載

2. **輸入 AI API Key**
   https://aistudio.google.com/app/api-keys → 登入 Google 帳號免費申請 Gemini API Key

3. **上傳 JSON 檔案**  
   上傳 `saved_collections.json`

4. **選擇收藏夾**  
   點選偵測到的收藏夾（例如「旅遊」）

5. **等待 AI 分析**  
   AI 批次分析每篇貼文，查詢景點座標

6. **下載結果**  
   - 📥 `KML 檔案` → 匯入 Google Earth
   - 📋 `找不到清單 CSV` → 手動確認無法辨識的貼文

7. **匯入 Google Earth**  
   Google Earth Web → 專案 → 從電腦匯入 KML 檔案


## 🔒 隱私說明

- 所有 JSON 檔案僅在**瀏覽器本地**處理，不上傳至伺服器
- API Key 僅存於瀏覽器 localStorage，不會記錄於後端
- 伺服器端（Vercel）僅作為 LLM API 的 CORS 代理轉發

## 分析時間估算

實測結果 20 post
使用一般分析：~30秒
勾選深度搜尋：~2分30秒

## 🛠️ 本地開發

```bash
git clone https://github.com/YOUR_USERNAME/ig-travel-organizer
cd ig-travel-organizer
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

## 🗺️ 技術架構

- **前端**：Next.js 15 + Tailwind CSS
- **AI**：Gemini 2.0 Flash / OpenAI GPT-4o-mini
- **Geocoding**：OpenStreetMap Nominatim（免費）
- **部署**：Vercel

## 📄 License

MIT License

