# 參與開發

先照 README 在本機跑起來，再使用 `data/example/demo.json`。提 issue 請包含瀏覽器、螢幕尺寸、最少重現步驟、預期結果與實際結果；截圖與 JSON 只使用合成資料

## 修改與驗證

```sh
npm ci
npm run check
npm test
npm run build
```

地圖與播放變更需檢查跨日期線、暫停、背景分頁、減少動態，以及手機寬度。資料變更需確認不覆蓋使用者更正或刪除紀錄。提交前移除 `data/local`、郵件、訂單與憑證

UI 基礎元件集中在 `src/components/ui`，旅程放映在 `src/journey`。沿用現有 tokens、44px 控制與鍵盤語義；避免為單一元件加入另一套全域樣式

先提交範圍小、可驗證的修正。大型功能請先建立 issue 說明使用者問題與限制。主頁展示的功能必須能從全新下載的版本跑起來
