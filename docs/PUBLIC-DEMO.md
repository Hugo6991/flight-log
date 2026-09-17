# 公開示範站維護

線上示範：[flights.vibeencode.dev](https://flights.vibeencode.dev/)

這個站台只使用開源專案的虛構資料，Worker 與 D1 都使用獨立的 `flight-log-demo` 名稱。公開來源維持空白，由前端載入內建 120 段示範；訪客的匯入、清空及編輯只保存在各自瀏覽器。

## 部署設定

維護者在專案根目錄使用 `wrangler.demo.jsonc`，此檔已排除於 Git。從預設 `wrangler.jsonc` 複製後，設定自己的帳號及示範資料庫 ID，並修改以下欄位：

```json
{
  "name": "flight-log-demo",
  "workers_dev": false,
  "preview_urls": false,
  "routes": [
    {
      "pattern": "flights.vibeencode.dev",
      "custom_domain": true
    }
  ]
}
```

上方只列出與預設設定不同的欄位，仍需保留原有的 Worker 入口、靜態檔案及 `DB` 綁定。一般下載者應依 [自行部署](SELF-HOST.md) 使用自己的資源，無須使用維護者的設定檔。

Cloudflare 會為 Custom Domain 建立 DNS 及憑證，設定方式見 [Cloudflare 官方文件](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)。

## 更新步驟

```sh
npm run deploy:demo
```

首次建立新的示範資料庫時，先以 `npx wrangler d1 migrations apply flight-log-demo --remote --config wrangler.demo.jsonc` 建立空白來源。後續更新程式不必重新匯入資料，也不應將個人備份放進示範資料庫。

部署後用乾淨瀏覽器檢查首頁與 `/journey/`：首次載入應有 120 段航班，首頁的更多功能及放映的航班選單應有虛構標記。示範資訊不常駐在地圖上。`/api/state` 應回傳空白紀錄，非 GET 請求應回傳 405。再檢查清空後重新整理仍保持空白，另一個乾淨瀏覽器則仍看得到示範。

## 網址分流與瀏覽器資料

`flights.vibeencode.dev` 是公開展示網址，原 `flight-log.vibeencode.dev` 保留為相同服務的別名。兩者只連接示範 D1，不連接維護者的個人資料庫

維護者的 `.env.demo` 設定 `VITE_STORAGE_SCOPE_ORIGIN=https://flights.vibeencode.dev`，讓曾作為個人站的網址使用新的瀏覽器儲存空間。舊紀錄保留原位，不會被載入展示畫面或刪除；其他原有網址仍沿用原儲存空間

網域移轉可在 `wrangler.demo.jsonc` 的 `vars` 指定 `BROWSER_MIGRATION_SOURCE_ORIGIN` 與 `BROWSER_MIGRATION_TARGET_ORIGIN`。來源站的 `/browser-migration/` 僅接受指定目標 origin 的父視窗，透過 `postMessage` 將同一瀏覽器的舊紀錄交給新站。Worker 不接收航班內容，未設定或 origin 不符時此端點回傳 404。此功能不提供跨装置同步
