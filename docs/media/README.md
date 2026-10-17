# 示範素材

2026 年 10 月 18 日從公開示範站 flights.vibeencode.dev 實際擷取，介面為 9 月 18 日之後的玻璃控制列版本

使用 `data/example/demo.json` 的 120 段虛構航班，涵蓋五年、20 個國家／地區與六洲。沒有使用個人旅行紀錄

| 素材 | 實際來源 |
| --- | --- |
| world-map.png | 1440 × 1000 桌面旅行地圖，地球模式，顯示完整示範統計 |
| mobile-map.png | iPhone 14 尺寸的手機旅行地圖，由 3 倍解析度縮到 780px 寬 |
| journey.png | 1280 × 800 旅程放映，EK302 杜拜至上海，8 倍速，日期虛構 |
| journey.gif | 同一航段連續 8 秒的實際錄影，8 倍速回放，6 fps、640px 寬輸出 |
| passport.png | 從網頁「儲存護照圖片」實際下載的 PNG，縮到 1080px 寬，保留虛構示範標記 |

擷取方式：Playwright 加軟體 WebGL（SwiftShader），等地圖載入完成才截圖；GIF 由 Playwright 錄影經 ffmpeg 取最後 8 秒。截圖沒有額外繪製 UI，GIF 沒有以靜態畫面模擬飛行。網站實際動畫不受 GIF 幀率限制

README 的桌面地圖與放映素材展開右下角圖資署名。NASA GIBS、OpenFreeMap、OpenMapTiles、OpenStreetMap 與護照使用的 Natural Earth 說明見根目錄 THIRD_PARTY_NOTICES.md
