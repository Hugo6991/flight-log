# 五年虛構飛行紀錄

這套資料的旅客、搭乘日期與搭乘狀態全部虛構，沒有引用作者或任何人的個人旅行紀錄。它是開源展示與測試用資料，可以全部替換成自己的紀錄。

120 段航班涵蓋 2021 年 9 月 17 日至 2026 年 9 月 16 日，以桃園 TPE 與上海浦東 PVG 為主要基地。每個滾動年度 24 段，每季 6 段，季度從 9 月 17 日、12 月 17 日、3 月 17 日、6 月 17 日起算。網站年度篩選仍使用曆年，因此會顯示 2021 至 2026 六個年份。

| 洲別 | 國家／地區 | 數量 |
| --- | --- | --- |
| 亞洲 | 台灣、中國、日本、韓國、新加坡、馬來西亞、泰國、越南、印尼、阿聯酋 | 10 |
| 歐洲 | 英國、法國、德國、土耳其 | 4 |
| 大洋洲 | 澳洲、紐西蘭 | 2 |
| 北美洲 | 美國、加拿大 | 2 |
| 南美洲 | 巴西 | 1 |
| 非洲 | 南非 | 1 |

土耳其在本示範分類中只計入歐洲一次。南極洲沒有國家，本版也不加入觀光包機。國家／地區統計依抵達機場，包含轉機停留。

## 班號來源的範圍

查證日期：2026 年 9 月 17 日。以下逐項核對航空公司的公開網頁、班表或可檢索的班表摘要，只確認班號與有方向的機場組合。部分來源是停飛公告，這只能證明班號曾用於該航線，不能證明實際執飛。

所有示範日期都另外編排，不保證符合當年班期、開航時間或當日營運。疫情期間也沒有模擬入境限制。出發與抵達時間刻意留空，避免以今日班表倒推歷史。轉機與停留分成獨立航段，前後機場連續，日期至少相隔兩天；這是保守的示範停留安排，不是可訂購行程。

`flown` 僅供示範回放與護照統計，不構成任何搭乘證據。`sources.type = "demo"` 與每筆備註保留虛構標示，另以 `route_reference` 附上班號來源。

## 完整旅程

每列包含六段獨立航班，具體出發日期見 [itinerary.json](itinerary.json)，可直接匯入的紀錄見 [demo.json](demo.json)

| 區間 | 旅程 | 機場順序 |
| --- | --- | --- |
| 2021-09-17 至 2021-11-26 | 上海與日韓往返 | TPE → PVG → TPE → NRT → TPE → ICN → TPE |
| 2021-12-25 至 2022-02-25 | 新馬停留與曼谷往返 | TPE → SIN → KUL → SIN → TPE → BKK → TPE |
| 2022-03-29 至 2022-05-04 | 上海出發經杜拜赴倫敦 | TPE → PVG → DXB → LHR → DXB → PVG → TPE |
| 2022-06-25 至 2022-08-26 | 越南與峇里島假期 | TPE → SGN → TPE → DPS → TPE → SIN → TPE |
| 2022-09-29 至 2022-11-04 | 上海出發經新加坡赴雪梨 | TPE → PVG → SIN → SYD → SIN → PVG → TPE |
| 2022-12-29 至 2023-02-03 | 奧克蘭與雪梨串聯 | TPE → AKL → SIN → SYD → SIN → PVG → TPE |
| 2023-03-29 至 2023-05-04 | 巴黎與法蘭克福串聯 | TPE → DXB → CDG → DXB → FRA → DXB → TPE |
| 2023-06-25 至 2023-08-26 | 溫哥華與紐約往返 | TPE → YVR → TPE → JFK → TPE → PVG → TPE |
| 2023-09-29 至 2023-11-04 | 上海出發經杜拜赴南非 | TPE → PVG → DXB → JNB → DXB → PVG → TPE |
| 2023-12-29 至 2024-02-03 | 聖保羅長程與東京往返 | TPE → DXB → GRU → DXB → TPE → NRT → TPE |
| 2024-03-29 至 2024-05-04 | 伊斯坦堡與倫敦串聯 | TPE → DXB → IST → DXB → LHR → DXB → TPE |
| 2024-06-29 至 2024-08-04 | 吉隆坡與曼谷多城市旅行 | TPE → KUL → SIN → BKK → SIN → PVG → TPE |
| 2024-09-29 至 2024-11-04 | 上海出發重訪法蘭克福 | TPE → PVG → DXB → FRA → DXB → PVG → TPE |
| 2024-12-29 至 2025-02-03 | 澳紐旅行後返回上海 | TPE → SIN → SYD → SIN → AKL → TPE → PVG |
| 2025-03-25 至 2025-05-26 | 上海基地與北美往返 | PVG → TPE → YVR → TPE → JFK → TPE → PVG |
| 2025-06-29 至 2025-08-04 | 上海出發的新馬泰環線 | PVG → SIN → BKK → SIN → KUL → TPE → PVG |
| 2025-09-29 至 2025-11-04 | 上海出發重訪聖保羅 | PVG → DXB → GRU → DXB → TPE → PVG → TPE |
| 2025-12-29 至 2026-02-03 | 南非與巴黎串聯 | TPE → DXB → JNB → DXB → CDG → DXB → TPE |
| 2026-03-29 至 2026-05-04 | 上海出發重訪伊斯坦堡 | TPE → PVG → DXB → IST → DXB → PVG → TPE |
| 2026-06-25 至 2026-09-16 | 東京與奧克蘭後返回台灣 | TPE → NRT → TPE → AKL → SIN → PVG → TPE |

## 航線來源清單

每一列對應一個班號與一個方向，機器可讀版本為 [routes.json](routes.json)

| 航段 | 班號 | 航空公司公開來源 |
| --- | --- | --- |
| TPE → PVG | BR712 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=TPE%2FTSA%2FKHH&cmstitle=erc-note1&date=20260710-20260713&lang=&reqtime=) |
| PVG → TPE | BR711 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=TPE%2FTSA%2FKHH&cmstitle=erc-note1&date=20260710-20260713&lang=&reqtime=) |
| TPE → NRT | BR196 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=TPE%2FTSA%2FKHH&cmstitle=erc-note1&date=20260710-20260713&lang=&reqtime=) |
| NRT → TPE | BR195 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&airport=FUK%2FMYJ%2FKIX%2FNGO%2FKMQ%2FHND%2FNRT%2FSDJ%2FAOJ&cmstitle=erc-note1&date=20191011-20191013&lang=zh-tw&reqtime=) |
| TPE → ICN | BR160 | [EVA Air · 班表或航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=TPE%2FTSA%2FKHH&cmstitle=erc-note1&date=20260710-20260713&lang=&reqtime=) |
| ICN → TPE | BR159 | [EVA Air · 班表或航班異動公告](https://www.evaair.com/images/zhtw/evaair-timetable_tcm27-51481.pdf) |
| TPE → SIN | BR225 | [EVA Air · 班表或航線說明](https://flights.evaair.com/zh-tw/premium-economy-class-flights-from-taipei-to-singapore) |
| SIN → TPE | BR226 | [EVA Air · 班表或航線說明](https://flights.evaair.com/zh-tw/premium-economy-class-flights-from-taipei-to-singapore) |
| TPE → KUL | BR227 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=TPE%2FTSA%2FKHH&cmstitle=erc-note2&date=20260710-20260713&lang=sc-cn&reqtime=) |
| KUL → TPE | BR228 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=TPE%2FTSA%2FKHH&cmstitle=erc-note2&date=20260710-20260713&lang=sc-cn&reqtime=) |
| TPE → BKK | BR211 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=TPE%2FTSA%2FKHH&cmstitle=erc-note2&date=20260710-20260713&lang=sc-cn&reqtime=) |
| BKK → TPE | BR212 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=TPE%2FTSA%2FKHH&cmstitle=erc-note2&date=20260710-20260713&lang=sc-cn&reqtime=) |
| TPE → SGN | BR391 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=TPE%2FTSA%2FKHH&cmstitle=erc-note2&date=20260710-20260713&lang=sc-cn&reqtime=) |
| SGN → TPE | BR392 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=TPE%2FTSA%2FKHH&cmstitle=erc-note1&date=20260710-20260713&lang=&reqtime=) |
| TPE → DPS | BR255 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=TPE%2FTSA%2FKHH&cmstitle=erc-note1&date=20260710-20260713&lang=&reqtime=) |
| DPS → TPE | BR256 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=TPE%2FTSA%2FKHH&cmstitle=erc-note2&date=20260710-20260713&lang=sc-cn&reqtime=) |
| TPE → YVR | BR10 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=YVR&cmstitle=erc-note1&date=20221221-20221226&lang=en-US&reqtime=) |
| YVR → TPE | BR9 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=YVR&cmstitle=erc-note1&date=20221221-20221226&lang=en-US&reqtime=) |
| TPE → JFK | BR32 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=JFK%2FDFW&cmstitle=erc-note1&date=20260123-20260126&lang=en-US&reqtime=) |
| JFK → TPE | BR31 | [EVA Air · 航班異動公告](https://booking.evaair.com/flyeva/eva/b2c/flight-status-erc.aspx?ACTCODE=&Orderby=&REASON=&airport=JFK%2FDFW&cmstitle=erc-note1&date=20260123-20260126&lang=en-US&reqtime=) |
| TPE → AKL | NZ78 | [Air New Zealand · 班表或航線說明](https://www.airnewzealand.tw/flight-deals-to-new-zealand) |
| AKL → TPE | NZ77 | [Air New Zealand · 班表或航線說明](https://www.airnewzealand.tw/flight-deals-to-new-zealand) |
| PVG → SIN | SQ833 | [Singapore Airlines · 班表或航線說明](https://www.singaporeair.com/zh_CN/cn/plan-travel/local-promotions/cn-exCN/) |
| SIN → PVG | SQ830 | [Singapore Airlines · 班表或航線說明](https://www.singaporeair.com/zh_CN/cn/plan-travel/local-promotions/cn-exCN/) |
| SIN → KUL | SQ106 | [Singapore Airlines · 航班異動公告](https://www.singaporeair.com/saar5/pdf/media-centre/200322SoutheastAsiaFlightCanxTable.pdf) |
| KUL → SIN | SQ107 | [Singapore Airlines · 航班異動公告](https://www.singaporeair.com/saar5/pdf/media-centre/200322SoutheastAsiaFlightCanxTable.pdf) |
| SIN → SYD | SQ231 | [Singapore Airlines · 班表或航線說明](https://www.singaporeair.com/en_UK/tw/corporate/newsroom/press-release/2026/january---march-2026/Singapore_Airlines_WSI/) |
| SYD → SIN | SQ222 | [Singapore Airlines · 班表或航線說明](https://www.singaporeair.com/en_UK/tw/corporate/newsroom/press-release/2026/january---march-2026/Singapore_Airlines_WSI/) |
| SIN → AKL | SQ285 | [Singapore Airlines · 班表或航線說明](https://agent360.singaporeair.com/content/dam/agent360/web-assets/pdf/local/nz/SQxNZ_Trade_Brochure_SQ_small.pdf) |
| AKL → SIN | SQ286 | [Singapore Airlines · 班表或航線說明](https://agent360.singaporeair.com/content/dam/agent360/web-assets/pdf/local/nz/SQxNZ_Trade_Brochure_SQ_small.pdf) |
| SIN → BKK | SQ706 | [Singapore Airlines · 班表或航線說明](https://www.singaporeair.com/saar5/pdf/media-centre/NE-0822_AnnexeB.pdf) |
| BKK → SIN | SQ705 | [Singapore Airlines · 班表或航線說明](https://www.singaporeair.com/saar5/pdf/media-centre/NE-0822_AnnexeB.pdf) |
| DXB → PVG | EK302 | [Emirates · 班表或航線說明](https://www.emirates.com/cn/chinese/destinations/dxb/pvg/flights-from-dubai-to-shanghai/) |
| PVG → DXB | EK303 | [Emirates · 班表或航線說明](https://www.emirates.com/cn/chinese/destinations/dxb/pvg/flights-from-dubai-to-shanghai/) |
| DXB → TPE | EK366 | [Emirates · 班表或航線說明](https://www.emirates.com/tw/chinese/destinations/dxb/tpe/flights-from-dubai-to-taipei/) |
| TPE → DXB | EK367 | [Emirates · 班表或航線說明](https://www.emirates.com/tw/chinese/destinations/dxb/tpe/flights-from-dubai-to-taipei/) |
| DXB → LHR | EK1 | [Emirates · 班表或航線說明](https://www.emirates.com/english/destinations/dxb/lhr/flights-from-dubai-to-london-heathrow/) |
| LHR → DXB | EK2 | [Emirates · 班表或航線說明](https://www.emirates.com/english/destinations/dxb/lhr/flights-from-dubai-to-london-heathrow/) |
| DXB → CDG | EK73 | [Emirates · 班表或航線說明](https://www.emirates.com/english/destinations/dxb/cdg/flights-from-dubai-to-paris/) |
| CDG → DXB | EK74 | [Emirates · 班表或航線說明](https://www.emirates.com/english/destinations/dxb/cdg/flights-from-dubai-to-paris/) |
| DXB → FRA | EK45 | [Emirates · 班表或航線說明](https://www.emirates.com/english/destinations/dxb/fra/flights-from-dubai-to-frankfurt/) |
| FRA → DXB | EK46 | [Emirates · 班表或航線說明](https://www.emirates.com/english/destinations/dxb/fra/flights-from-dubai-to-frankfurt/) |
| DXB → JNB | EK761 | [Emirates · 班表或航線說明](https://www.emirates.com/english/destinations/dxb/jnb/flights-from-dubai-to-johannesburg/) |
| JNB → DXB | EK762 | [Emirates · 班表或航線說明](https://www.emirates.com/english/destinations/dxb/jnb/flights-from-dubai-to-johannesburg/) |
| DXB → GRU | EK261 | [Emirates · 班表或航線說明](https://www.emirates.com/br/portuguese/destinations/gru/dxb/flights-from-sao-paulo-to-dubai/) |
| GRU → DXB | EK262 | [Emirates · 班表或航線說明](https://www.emirates.com/br/portuguese/destinations/gru/dxb/flights-from-sao-paulo-to-dubai/) |
| DXB → IST | EK123 | [Emirates · 航線新聞稿](https://www.emirates.com/media-centre/emirates-announces-start-of-scheduled-daily-a380-service-to-istanbul/) |
| IST → DXB | EK124 | [Emirates · 航線新聞稿](https://www.emirates.com/media-centre/emirates-announces-start-of-scheduled-daily-a380-service-to-istanbul/) |

## 替換、清空與重新產生

1. 首次開啟即可看見示範，在上方選「匯入自己的紀錄」選擇個人 JSON，即可整份取代
2. 選「清空示範」只移除帶有 demo 標記的紀錄，保留自行補登的航班，重新整理不會補回假資料
3. 「更多功能 → 復原上次還原」可取回最近一次匯入或清空前的快照，下一次操作會取代該快照
4. 如需重新載入範例，在「更多功能 → 還原備份到此瀏覽器」選 demo.json

修改 itinerary.json 與 routes.json 後，可用 Node 24 執行 `npm run demo:generate`，接著執行 `npm test` 檢查地理涵蓋、航段連續及來源完整性。產生器只寫入公開 demo.json，不讀取 data/local 或私人版本。

## 授權與私人版本

本專案原創的虛構旅程與資料編排採根目錄 MIT License，可下載、修改與再散布。航空公司的公開來源頁面、品牌與商標各自保留其權利；本專案沒有重製完整班表。

公開專案只放這套假資料。個人的真實紀錄應放在自己的瀏覽器、已忽略的 data/local，或獨立私人安裝。將真實資料匯入公開 D1 會讓訪客讀取，私人 Git 儲存庫不會自動替網站提供登入保護。

## English

All travel dates and flown statuses are fictional. No personal flight history was used. This fixture contains 120 segments across 20 countries and regions, covering six continents. Each rolling year contains 24 segments, with six per quarter. Calendar year filters span 2021 through 2026.

The ledger verifies flight numbers against directed airport pairs from airline sources, including cancellation notices. It does not verify operations on the synthetic dates or reproduce historical travel restrictions. Local departure and arrival times remain blank. Each connection is a separate segment, with at least two days between departures.

On first use, the app shows this sample only when no browser history exists and the remote source is empty. Importing your backup replaces it entirely. Clearing removes only demo records and persists the resulting state. The menu can undo the latest import or clear. Original synthetic data is distributed under the repository MIT License; airline source pages retain their own rights.
