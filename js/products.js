// ===== 商品列表渲染：從後端載入商品 =====

document.addEventListener('DOMContentLoaded', async function () {
    const container = document.querySelector('.product-list');
    if (!container) return;

    // 由容器上的 data-category 決定要載入哪些商品
    const category = container.dataset.category;
    let url = '/api/products';
    if (category && category !== 'all') {
        url += category === 'featured' ? '?featured=1' : '?category=' + encodeURIComponent(category);
    }

    try {
        const response = await fetch(url);
        const data = await response.json();
        renderProducts(data.products || []);
    } catch (err) {
        console.error('Error:', err);
        container.innerHTML = '<p style="color:#c0392b;grid-column:1/-1;">商品載入失敗，請確認後端伺服器已啟動（node server.js）</p>';
    }
});

// 渲染商品卡片
function renderProducts(products) {
    const container = document.querySelector('.product-list');
    // 清空原本的內容
    container.innerHTML = '';

    if (products.length === 0) {
        container.innerHTML = '<p>目前沒有商品</p>';
        return;
    }

    products.forEach(function (product) {
        const card = document.createElement('div');
        card.className = 'product';

        // 商品圖片
        const img = document.createElement('img');
        img.src = product.image;
        img.alt = product.name;

        // 商品名稱
        const name = document.createElement('h3');
        name.textContent = product.name;

        // 商品價格
        const price = document.createElement('p');
        price.textContent = '$' + product.price.toFixed(2);

        // 加入購物車按鈕（用事件監聽，避免商品名含單引號的跳脫問題）
        const button = document.createElement('button');
        button.textContent = '加入購物車';
        button.addEventListener('click', function () {
            addToCart(product.name, product.price);
        });

        card.appendChild(img);
        card.appendChild(name);
        card.appendChild(price);
        card.appendChild(button);
        container.appendChild(card);
    });
}
