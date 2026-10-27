// ===== 商品資料播種腳本 =====
// 從 products.json 讀取商品資料，寫入 SQLite 的 products 表。
// 可重複執行（同名商品不會重複新增）。
//
// 使用方式：node seed-products.js

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'database.db');
const PRODUCTS_JSON = path.join(__dirname, 'products.json');

const db = new sqlite3.Database(DB_PATH, async (err) => {
    if (err) {
        console.error('無法連接資料庫:', err.message);
        process.exit(1);
    }

    try {
        // 讀取商品資料
        const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
        if (!Array.isArray(products) || products.length === 0) {
            throw new Error('products.json 內容為空或格式錯誤');
        }

        // 確保 products 表存在（與 server.js 相同的結構）
        await new Promise((resolve, reject) => {
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                price REAL NOT NULL,
                image TEXT,
                category TEXT,
                featured INTEGER NOT NULL DEFAULT 0
            )`, (e) => e ? reject(e) : resolve());
        });

        // 寫入資料庫
        let inserted = 0;
        for (const p of products) {
            await new Promise((resolve, reject) => {
                db.run('INSERT OR IGNORE INTO products (name, price, image, category, featured) VALUES (?, ?, ?, ?, ?)',
                    [p.name, p.price, p.image, p.category, p.featured || 0], function (e) {
                        if (e) reject(e);
                        else { if (this.changes > 0) inserted++; resolve(); }
                    });
            });
        }

        // 統計結果
        const total = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) AS c FROM products', (e, row) => e ? reject(e) : resolve(row.c));
        });
        const byCategory = await new Promise((resolve, reject) => {
            db.all('SELECT category, COUNT(*) AS c FROM products GROUP BY category ORDER BY category', (e, rows) => e ? reject(e) : resolve(rows));
        });
        const featuredCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) AS c FROM products WHERE featured = 1', (e, row) => e ? reject(e) : resolve(row.c));
        });

        console.log(`播種完成：json 共 ${products.length} 筆，本次新增 ${inserted} 筆`);
        console.log(`資料庫總商品數：${total}，推薦商品：${featuredCount}`);
        console.log('各分類統計：');
        byCategory.forEach(row => console.log(`  ${row.category}: ${row.c} 項`));

        db.close();
    } catch (e) {
        console.error('播種失敗:', e.message);
        db.close();
        process.exit(1);
    }
});
