# 第三方程式、資料與服務

本專案自行撰寫的程式採 MIT。第三方依其各自授權；完整相依版本由 package-lock.json 鎖定，授權原文隨 npm 套件提供。

| 套件              | 授權         | 來源                                       |
| ----------------- | ------------ | ------------------------------------------ |
| React / React DOM | MIT          | https://github.com/facebook/react          |
| MapLibre GL JS    | BSD-3-Clause | https://github.com/maplibre/maplibre-gl-js |
| D3 Geo            | ISC          | https://github.com/d3/d3-geo               |
| Lucide React      | ISC          | https://github.com/lucide-icons/lucide     |
| Zod               | MIT          | https://github.com/colinhacks/zod          |
| Radix Primitives（Collapsible / Popover） | MIT | https://github.com/radix-ui/primitives |
| cmdk | MIT | https://github.com/dip/cmdk |

- 機場名稱、座標與代碼由 [OurAirports 公開資料](https://ourairports.com/data/) 整理，Public Domain；字典是快照，不保證每個停用、新增或改名機場即時更新。距離為大圓估算。
- [OpenFreeMap](https://openfreemap.org/) 提供地圖樣式、字型與圖磚。保留地圖右下角 OpenFreeMap、© OpenMapTiles、Data from OpenStreetMap 等署名。OpenStreetMap 資料依 [ODbL](https://www.openstreetmap.org/copyright)；服務和圖資不因本專案採 MIT 就變成 MIT。
- [Flighty](https://flighty.com/) 僅為互動與視覺研究參考，未複製商標、圖片、字型、App 原始碼。本專案與 Flighty 無關。
- Gmail、Trip.com、Cloudflare 等名稱用於說明相容流程，不表示官方合作。使用者自己的訂单、郵件和旅行紀錄不包含於範本授權。

- 地球影像使用 [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/access-basics/) 的 Blue Marble Shaded Relief and Bathymetry。這是全球地表合成影像，不是即時衛星照片；免 API key，保留 NASA GIBS 署名。適用 [NASA 圖像使用指引](https://www.nasa.gov/nasa-brand-center/images-and-media/)，不表示 NASA 認可本專案。
- 護照卡的海岸輪廓來自 [Natural Earth 110m Land](https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-land/)，[Public Domain](https://www.naturalearthdata.com/about/terms-of-use/)；`src/assets/land.json` 是只保留幾何的快照，經 D3 投影產生卡片與 PNG。
