// 導入 express 模組，用於創建 Web 應用
const express = require('express');

// 導入 body-parser 模組，用於解析請求體
const bodyParser = require('body-parser');

// 導入 sqlite3 模組並啟用 verbose 模式，以獲取更多的日誌訊息
const sqlite3 = require('sqlite3').verbose();

// 導入 path 模組，用於處理和轉換文件路徑
const path = require('path');

// 導入 cors 模組，用於啟用跨域資源共享（CORS）
const cors = require('cors');

// 創建 Express 應用
const app = express();
// 設置伺服器端口，默認為 5500
const PORT = process.env.PORT || 5500;
// 設置 SQLite 資料庫文件的路徑
const DB_PATH = path.join(__dirname, 'database.db');

// 使用 cors 中間件來允許跨域請求
app.use(cors());

// 使用 bodyParser 中間件來解析請求體
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 讓 Express 提供靜態文件
app.use(express.static(__dirname));

// 初始化 SQLite 資料庫
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Failed to connect to database:', err.message);
        return;
    }
    console.log('Connected to SQLite database');
    // 創建 users 表（如果不存在）
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);
    // 創建 cart 表（如果不存在）
    db.run(`CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        item_name TEXT,
        item_price REAL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
    // 創建 products 表（如果不存在）——商品資料庫
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        price REAL NOT NULL,
        image TEXT,
        category TEXT,
        featured INTEGER NOT NULL DEFAULT 0
    )`);
    // 創建 orders 表（如果不存在）——結帳後的訂單主檔
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        total REAL NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
    // 創建 order_items 表（如果不存在）——訂單內的個別商品
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        item_name TEXT,
        item_price REAL,
        quantity INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY(order_id) REFERENCES orders(id)
    )`);
    // 舊資料表可能沒有 quantity 欄位，存在則補上（預設為 1）
    db.run(`ALTER TABLE cart ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Failed to add quantity column:', err.message);
        }
    });
});

// 包裝 db.run 為 Promise，方便使用 async/await
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

// 包裝 db.get 為 Promise
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// 包裝 db.all 為 Promise
function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// 錯誤處理輔助函數
function handleError(res, err, message = '伺服器錯誤') {
    console.error(message + ':', err.message);
    return res.status(500).json({ error: message });
}

// ===== 商品 API =====

// 取得商品列表（可依分類、推薦、關鍵字篩選）
app.get('/api/products', async (req, res) => {
    const { category, featured, q } = req.query;

    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category) {
        sql += ' AND category = ?';
        params.push(category);
    }
    if (featured) {
        sql += ' AND featured = 1';
    }
    if (q) {
        sql += ' AND (name LIKE ? OR category LIKE ?)';
        params.push('%' + q + '%', '%' + q + '%');
    }
    sql += ' ORDER BY id ASC';

    try {
        const products = await all(sql, params);
        res.status(200).json({ products });
    } catch (err) {
        handleError(res, err, '無法取得商品列表');
    }
});

// 取得單一商品
app.get('/api/products/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const product = await get('SELECT * FROM products WHERE id = ?', [id]);
        if (!product) {
            return res.status(404).json({ error: '找不到該商品' });
        }
        res.status(200).json({ product });
    } catch (err) {
        handleError(res, err, '無法取得商品資料');
    }
});

// 取得所有商品分類
app.get('/api/categories', async (req, res) => {
    try {
        const rows = await all('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category ASC');
        res.status(200).json({ categories: rows.map(row => row.category) });
    } catch (err) {
        handleError(res, err, '無法取得分類列表');
    }
});

// 註冊用戶的路由
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '所有欄位皆需填寫' });
    }

    try {
        // 檢查用戶是否已存在
        const row = await get('SELECT * FROM users WHERE username = ?', [username]);
        if (row) {
            return res.status(400).json({ error: '帳號已存在' });
        }
        // 插入新用戶
        const result = await run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
        res.status(201).json({ message: '註冊成功', userId: result.lastID, username });
    } catch (err) {
        handleError(res, err);
    }
});

// 登錄用戶的路由
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '所有欄位皆需填寫' });
    }

    try {
        // 檢查用戶名和密碼是否匹配
        const row = await get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (!row) {
            return res.status(400).json({ error: '帳號或密碼錯誤' });
        }
        // 回傳 userId 供前端使用（含 shopping 相關功能）
        res.status(200).json({ message: '登入成功', userId: row.id, username: row.username });
    } catch (err) {
        handleError(res, err);
    }
});

// 添加物品到購物車的路由（同商品會累加數量）
app.post('/cart', async (req, res) => {
    const { userId, itemName, itemPrice } = req.body;

    if (!userId || !itemName || itemPrice === undefined || itemPrice === null) {
        return res.status(400).json({ error: '所有欄位皆需填寫' });
    }

    try {
        // 確認用戶存在
        const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(400).json({ error: '用戶不存在，請重新登入' });
        }
        // 檢查購物車內是否已有相同商品
        const existing = await get('SELECT * FROM cart WHERE user_id = ? AND item_name = ?', [userId, itemName]);
        if (existing) {
            // 已存在則數量加一
            await run('UPDATE cart SET quantity = quantity + 1 WHERE id = ?', [existing.id]);
        } else {
            // 插入新物品到購物車
            await run('INSERT INTO cart (user_id, item_name, item_price, quantity) VALUES (?, ?, ?, 1)', [userId, itemName, itemPrice]);
        }
        res.status(201).json({ message: '物品已加入購物車' });
    } catch (err) {
        handleError(res, err);
    }
});

// 獲取用戶購物車內容的路由
app.get('/cart/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // 查詢購物車內的物品（依加入順序排列）
        const rows = await all('SELECT * FROM cart WHERE user_id = ? ORDER BY id ASC', [userId]);
        // 計算總數量與總金額，方便前端顯示
        const totalQuantity = rows.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const totalPrice = rows.reduce((sum, item) => sum + item.item_price * (item.quantity || 1), 0);
        res.status(200).json({ cart: rows, totalQuantity, totalPrice });
    } catch (err) {
        handleError(res, err, '無法取得購物車內容');
    }
});

// 更新購物車內物品數量的路由（數量為 0 時自動刪除該項）
app.patch('/cart/item/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, quantity } = req.body;

    if (!userId || quantity === undefined || quantity === null) {
        return res.status(400).json({ error: '所有欄位皆需填寫' });
    }

    try {
        const item = await get('SELECT * FROM cart WHERE id = ? AND user_id = ?', [id, userId]);
        if (!item) {
            return res.status(404).json({ error: '找不到該購物車物品' });
        }
        if (quantity <= 0) {
            // 數量歸零，從購物車移除
            await run('DELETE FROM cart WHERE id = ?', [id]);
            return res.status(200).json({ message: '物品已從購物車移除' });
        }
        await run('UPDATE cart SET quantity = ? WHERE id = ?', [quantity, id]);
        res.status(200).json({ message: '數量已更新' });
    } catch (err) {
        handleError(res, err);
    }
});

// 刪除購物車內物品的路由（需帶上 userId 以驗證擁有者）
app.delete('/cart/item/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.query.userId || req.body.userId;

    if (!userId) {
        return res.status(400).json({ error: '缺少使用者資訊' });
    }

    try {
        const item = await get('SELECT * FROM cart WHERE id = ? AND user_id = ?', [id, userId]);
        if (!item) {
            return res.status(404).json({ error: '找不到該購物車物品' });
        }
        await run('DELETE FROM cart WHERE id = ?', [id]);
        res.status(200).json({ message: '物品已從購物車移除' });
    } catch (err) {
        handleError(res, err);
    }
});

// 清空購物車的路由
app.delete('/cart/clear/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        await run('DELETE FROM cart WHERE user_id = ?', [userId]);
        res.status(200).json({ message: '購物車已清空' });
    } catch (err) {
        handleError(res, err);
    }
});

// 結帳的路由：將購物車內容轉為訂單並清空購物車
app.post('/checkout', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: '缺少使用者資訊' });
    }

    try {
        // 取得購物車內容
        const items = await all('SELECT * FROM cart WHERE user_id = ?', [userId]);
        if (items.length === 0) {
            return res.status(400).json({ error: '購物車是空的，無法結帳' });
        }
        // 計算總金額
        const total = items.reduce((sum, item) => sum + item.item_price * (item.quantity || 1), 0);

        // 建立訂單
        const order = await run('INSERT INTO orders (user_id, total) VALUES (?, ?)', [userId, total]);
        const orderId = order.lastID;

        // 將購物車物品寫入訂單明細
        for (const item of items) {
            await run('INSERT INTO order_items (order_id, item_name, item_price, quantity) VALUES (?, ?, ?, ?)',
                [orderId, item.item_name, item.item_price, item.quantity || 1]);
        }

        // 清空購物車
        await run('DELETE FROM cart WHERE user_id = ?', [userId]);

        res.status(201).json({
            message: '結帳成功，感謝您的購買！',
            orderId,
            total,
            itemCount: items.reduce((sum, item) => sum + (item.quantity || 1), 0)
        });
    } catch (err) {
        handleError(res, err, '結帳失敗');
    }
});

// 獲取用戶訂單記錄的路由
app.get('/orders/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // 查詢該用戶所有訂單
        const orders = await all('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', [userId]);
        for (const order of orders) {
            // 查詢每張訂單的明細
            order.items = await all('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC', [order.id]);
        }
        res.status(200).json({ orders });
    } catch (err) {
        handleError(res, err, '無法取得訂單記錄');
    }
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
