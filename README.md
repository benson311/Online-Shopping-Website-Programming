# 阿奇滑板店 — 全端電商購物網站

以 **Node.js (Express) + SQLite** 開發的電商購物網站，涵蓋會員系統、購物車、結帳與訂單記錄的完整後端流程，並將商品目錄全面資料庫化。前端以原生 JavaScript 透過 RESTful API 與後端介接，動態渲染所有頁面內容。

## 功能特色

- **會員系統**：註冊、登入，登入後才能使用購物車功能
- **購物車**：加入商品（同商品自動累加數量）、數量增減（歸零自動移除）、單項移除、清空
- **結帳與訂單**：結帳時建立訂單主檔與商品明細、計算總金額並清空購物車；可查詢歷史訂單
- **商品資料庫化**：商品存於資料庫，10 個商品頁共用一份渲染模組，依 `data-category` 載入對應內容
- **商品查詢 API**：支援分類篩選、推薦商品標記、關鍵字搜尋

## 技術棧

| 分類 | 技術 |
|---|---|
| 後端 | Node.js、Express |
| 資料庫 | SQLite（sqlite3） |
| 前端 | HTML、CSS、原生 JavaScript（fetch / DOM 操作） |
| 其他 | RESTful API 設計、參數化查詢（防 SQL Injection）、資料遷移腳本 |

## 快速開始

```bash
# 1. 安裝相依套件
npm install

# 2. 建立商品資料（寫入 SQLite）
node seed-products.js

# 3. 啟動伺服器
npm start
```

開啟瀏覽器連到 <http://localhost:5500> 即可。首次請先註冊會員，即可開始購物。

## API 文件

| 方法 | 端點 | 說明 |
|---|---|---|
| POST | `/register` | 會員註冊 |
| POST | `/login` | 會員登入（回傳 userId） |
| GET | `/api/products` | 商品列表，支援 `?category=`、`?featured=1`、`?q=` |
| GET | `/api/products/:id` | 單一商品 |
| GET | `/api/categories` | 所有商品分類 |
| POST | `/cart` | 加入購物車（同商品累加數量） |
| GET | `/cart/:userId` | 查詢購物車（含總數量與總金額） |
| PATCH | `/cart/item/:id` | 更新商品數量（設為 0 自動移除） |
| DELETE | `/cart/item/:id` | 移除單一商品（驗證擁有者） |
| DELETE | `/cart/clear/:userId` | 清空購物車 |
| POST | `/checkout` | 結帳：建立訂單＋明細、清空購物車 |
| GET | `/orders/:userId` | 歷史訂單（含每張訂單的商品明細） |

範例：

```bash
curl "http://localhost:5500/api/products?category=deck"   # 板身分類商品
curl "http://localhost:5500/api/products?q=BRONSON"       # 關鍵字搜尋
```

## 資料庫架構

```
users（會員）
  └─ cart（購物車）        user_id → users.id
  └─ orders（訂單主檔）    user_id → users.id
        └─ order_items（訂單明細）   order_id → orders.id
products（商品目錄）
```

- 訂單與明細為**一對多關聯**：一張訂單對應多項商品，金額與數量在結帳時快照保存
- 所有查詢皆使用 `?` 佔位符的**參數化查詢**，防範 SQL Injection
- `database.db` 不納入版本控制（含會員資料）；clone 後執行 `node seed-products.js` 即可重建商品資料，資料表結構由伺服器啟動時自動建立

## 專案結構

```
├── server.js              # Express 伺服器與所有 API 路由
├── seed-products.js       # 商品資料播種腳本（json → SQLite）
├── products.json          # 商品資料（39 筆、8 個分類）
├── package.json
├── js/
│   ├── shared.js          # 全站共用：登入狀態、加入購物車、通知
│   ├── products.js        # 商品列表渲染（資料庫驅動）
│   └── cart.js            # 購物車頁面：數量調整、結帳、訂單記錄
├── css/
│   └── styles.css
├── images/                # 商品與頁面圖片
├── index.html             # 首頁
├── product.html           # 所有商品（動態載入）
├── reconmand.html         # 推薦商品（featured）
├── deck/truck/wheel/...   # 各分類頁（同一渲染模組）
├── cart.html              # 購物車頁
├── login.html / register.html
└── about.html / skate_info.html
```

## 開發過程中的重點決策

- **修復關鍵 bug**：原始版本登入 API 未回傳 `userId`，導致購物車完全無法運作；重構登入流程並以 `localStorage` 保存登入狀態
- **頁面重構**：原始 10 個商品頁各自硬寫數十個商品區塊，重構為「單一渲染模組 + 資料庫查詢」，新增商品只需改資料庫
- **資料遷移**：撰寫解析腳本將散落在 HTML 的商品資料自動匯入資料庫（一次性遷移）
- **測試驗證**：以 curl 驗證 API 全流程（註冊→登入→加車→結帳→訂單），並以 jsdom 模擬瀏覽器驗證前端渲染

## 未來規劃

- 資料庫交易（Transaction）確保結帳原子性、庫存管理防超賣
- bcrypt 密碼雜湊與伺服器端 Session 認證
- Supertest 自動化 API 測試與 Swagger API 文件
