# 公開示範站維護

線上示範：[flight-log.vibeencode.dev](https://flight-log.vibeencode.dev/)

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
      "pattern": "flight-log.vibeencode.dev",
      "custom_domain": true
    }
  ]
}
```

上方只列出與預設設定不同的欄位，仍需保留原有的 Worker 入口、靜態檔案及 `DB` 綁定。一般下載者應依 [自行部署](SELF-HOST.md) 使用自己的資源，無須使用維護者的設定檔。

Cloudflare 會為 Custom Domain 建立 DNS 及憑證，設定方式見 [Cloudflare 官方文件](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)。

## 更新步驟

```sh
npm run check
npm test
npm run build
npx wrangler deploy --config wrangler.demo.jsonc --dry-run
npx wrangler deploy --config wrangler.demo.jsonc
```

首次建立新的示範資料庫時，先以 `npx wrangler d1 migrations apply flight-log-demo --remote --config wrangler.demo.jsonc` 建立空白來源。後續更新程式不必重新匯入資料，也不應將個人備份放進示範資料庫。

部署後用乾淨瀏覽器檢查首頁與 `/journey/`：應顯示虛構標記和 120 段航班。`/api/state` 應回傳空白紀錄，非 GET 請求應回傳 405。再檢查清空後重新整理仍保持空白，另一個乾淨瀏覽器則仍看得到示範。
