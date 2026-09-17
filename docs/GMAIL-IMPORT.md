# 從 Gmail 整理 Trip.com 歷史訂單

## 最簡單的方式

在已有 Gmail 連接器的 AI 助手中連結自己的帳號，再讓助手讀取本文件和專案資料格式。OAuth 登入、授權由本人完成；不把 Gmail 密碼或 token 放進專案。是否有 Gmail 連接器取決於你使用的助手與帳號；本網站沒有內建 OAuth、背景同步或萬用郵件解析器。

連接器不可用時，可由本人從 Gmail 下載相關 `.eml`／Google Takeout 的郵件，放入 `data/local/` 後交由助手整理。不要把整個信箱上傳公開儲存庫。也可直接手動補登；Trip.com Excel 只能當補充，常缺班號。

## 給助手的完整提示詞

```text
請在這個 Flight Log 專案，透過我已授權的 Gmail 連接器整理歷史航班。我主要使用 Trip.com。只讀取和航班相關的郵件，不寄信、不刪信、不修改信箱設定。

1. 確認目前連結的信箱與使用者要整理的年份。沒有年份限制就搜尋信箱內全部可存取歷史，不只最近三年。
2. 搜尋多組條件並合併郵件 ID：from:(trip.com)、from:(ctrip.com)，再加上 Trip.com／攜程品牌字樣、航班／機票／電子機票／itinerary／e-ticket／flight 等內容搜尋，以捕捉轉寄信與航空公司信件。寄件者網域只是線索，不保證涵蓋全部來源。
3. 翻完每組搜尋的全部分頁；若連接器有上限，按年份／月份切開直到每段都能完整列出，記錄查詢範圍與未完成區段。不要把搜尋結果估計數當成已讀取數。必要時由我補充其他信箱。
4. 讀取每封相關信的完整本文、所有航段與可讀附件。不能讀到的 PDF／圖片附件列為缺口，不猜內容。將確認信、改票、取消、退票、行前提醒、登機證依訂單事件關聯；訂單 ID 僅留本機核對表。
5. 一次旅行可有多航段和來回程。逐段取得出發當地日期、機場 IATA、班號、當地出發／抵達時間、狀態。不要從郵件發送日期推航班日期；不要以目前班表猜歷史班號。只看到酒店／接機紀錄不建立已搭乘航段。
6. 同一天同航段的重複確認信去重；改票鏈保留最終有效航段，舊取消段標 cancelled。不同班號／機場／日期的衝突列為待核對，不強行合併。過期訂單預設 unverified，除非我確認或有足夠搭乘證據。
7. 將資料寫到 data/local/flights.reviewed.json，符合 docs/IMPORT-FORMAT.md。價格另存 data/local/prices.private.json，保留幣別、訂單／航段金額範圍與退費事件，不能重複把整單金額分配到每段。
8. data/local/import-audit.md 記錄逐年郵件數、航段數、取消／改票數、缺少班號數、不可讀附件、搜尋未完成區段、相鄰旅行的地點斷裂；提供每個候選航段的私有證據索引。不要宣稱找齊信箱之外或已刪除的航班。
9. 執行 npm run import:prepare -- data/local/flights.reviewed.json，核對 report.json。將可匯入結果和具體缺口交給我。未經我選擇不要公開行程；不要提交 data/local、郵件、票價或憑證。
```

## 搜尋依據與限制

Gmail 的 `messages.list` 支援 `q`、`pageToken`，列表只回 ID；需再讀 `messages.get` 才有完整內容。單頁最多 500 筆，不代表只能搜尋 500 筆。`gmail.metadata` scope 不支援 `q`，若自行實作 API 讀取應用只读 `gmail.readonly`；本版不另建立 OAuth 應用。[Google 列表 API](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list)

日期查詢、別名展開、thread 搜尋在 Gmail UI 與 API 可能不同；跨年邊界留足範圍並由航班本文判定日期。[Google 搜尋指南](https://developers.google.com/workspace/gmail/api/guides/filtering)

「完整」只表示已讀完指定帳號與查詢範圍內可存取的結果；別的帳號、同行者代訂、已刪除郵件、未寄出或不可讀附件仍可能有缺漏。
