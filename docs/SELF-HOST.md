# 部署自己的新網址

## 1. 先在本機完成核對

使用 Node 24，`npm ci && npm run setup:local && npm start`。在 4173 網頁還原資料，核對後匯出備份。詳細流程見 README。

## 2. 建立自己的 Cloudflare 資源

```sh
npx wrangler login
npx wrangler d1 create my-flight-log
```

`login` 在瀏覽器完成你自己的登入。把 create 回傳的 database_id、database_name 填進 `wrangler.jsonc`，binding 必須維持 `DB`。將 Worker 的 `name` 改成你想要的名稱，例如 `my-flight-log`。範本沒有作者帳號、網域或 database ID。

```sh
npx wrangler d1 migrations apply my-flight-log --remote
npm run deploy
```

預設 `workers_dev: true`，Wrangler 會印出你自己的 `<worker>.<account-subdomain>.workers.dev` URL。首次使用 workers.dev 若要求設定子網域，依 Cloudflare 指示完成。這時公開來源為空，首次開啟會顯示內建的五年虛構旅程。你可只在自己的瀏覽器還原備份；其他訪客看到的仍是示範，不會看見你本機匯入的行程。選「清空示範」後，此瀏覽器會保持空白，直到自行補登或還原備份。

## 3. 選擇是否公開初始行程

如果你希望其他人開新網址也能看到這份旅行圖，先查看生成的 `flights.json`，確定允許公開日期、機場與班號後再執行：

```sh
npm run import:prepare -- data/local/flights.reviewed.json data/local/public-release
npx wrangler d1 execute my-flight-log --remote --file data/local/public-release/seed.sql
```

只允許初始化空資料庫；非空來源不會被此 SQL 覆蓋。檢查 `/api/state` 和新瀏覽器視窗。既有裝置曾經儲存的 localStorage 不會自動被新 seed 蓋掉。來源為公開只讀，網頁的編輯仍只影響該瀏覽器。

## 4. 自訂網域（選用）

將你 Cloudflare 帳號已管理的網域之新子網域加入：

```json
"routes": [{"pattern":"flights.your-domain.example","custom_domain":true}]
```

換成真實網址，確認這個子網域沒有別的服務，再部署。需要時把 `workers_dev` 關閉。若要私有登入，另外設定 Cloudflare Access；不要假設 noindex 或一個難猜的 URL 等於私有。

## 5. 更新、備份與限制

程式更新：`git pull`、`npm ci`、`npm run deploy`。不必重新 seed。資料更新前先保存網頁 JSON 備份，遠端來源可用 `npx wrangler d1 export my-flight-log --remote --output data/local/db-backup.sql` 保存。

離開裝置前先匯出備份；清除瀏覽器資料會刪除本機修改。本版沒有伺服器寫入 API、多使用者帳號、跨裝置同步、排程 Gmail 匯入。地圖需網路與 WebGL，圖資故障不影響獨立清單的資料編輯。

免費額度、服務限制和費用以你帳號及 [Cloudflare 官方文件](https://developers.cloudflare.com/workers/) 為準，不承諾永久零成本。
