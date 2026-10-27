// ===== 購物車頁面邏輯 =====

let currentUser = null;
let cartData = { cart: [], totalQuantity: 0, totalPrice: 0 };

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function () {
    currentUser = getCurrentUser();
    renderUserStatus();
    if (currentUser) {
        loadCart();
        loadOrders();
    } else {
        // 未登入時顯示登入提示區塊
        document.getElementById('cart-section').style.display = 'none';
        document.getElementById('login-prompt').style.display = 'block';
    }
});

// 顯示使用者狀態列（歡迎訊息與登出按鈕）
function renderUserStatus() {
    const status = document.getElementById('user-status');
    if (currentUser) {
        status.innerHTML =
            `歡迎，${currentUser.username}！` +
            `<button id="logout-btn" onclick="logout()">登出</button>`;
    } else {
        status.innerHTML = '';
    }
}

// 登出並返回登入頁
function logout() {
    clearCurrentUser();
    alert('已登出');
    window.location.href = 'login.html';
}

// 從後端載入購物車內容並渲染
async function loadCart() {
    try {
        const response = await fetch(`/cart/${currentUser.userId}`);
        cartData = await response.json();
        renderCart();
    } catch (err) {
        console.error('Error:', err);
        alert('載入購物車失敗，請確認後端已啟動');
    }
}

// 渲染購物車清單
function renderCart() {
    const container = document.getElementById('cart-items');
    const checkoutBtn = document.getElementById('checkout-btn');
    const emptyMsg = document.getElementById('cart-empty');
    const totalEl = document.getElementById('total-price');
    const items = cartData.cart || [];

    // 清空目前的清單
    container.innerHTML = '';
    document.getElementById('cart-count-info').innerText = `共 ${cartData.totalQuantity || 0} 件商品`;

    // 購物車為空的處理
    if (items.length === 0) {
        emptyMsg.style.display = 'block';
        checkoutBtn.disabled = true;
        totalEl.innerText = '0';
        return;
    }

    emptyMsg.style.display = 'none';
    checkoutBtn.disabled = false;

    // 逐一渲染每個商品列
    items.forEach(function (item) {
        const quantity = item.quantity || 1;
        const subtotal = item.item_price * quantity;
        const row = document.createElement('div');
        row.className = 'cart-product';
        row.innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.item_name}</span>
                <span class="item-price">單價 $${item.item_price.toFixed(2)}</span>
            </div>
            <div class="item-controls">
                <button class="qty-btn" onclick="changeQuantity(${item.id}, ${quantity - 1})" ${quantity <= 1 ? 'disabled' : ''}>－</button>
                <span class="qty">${quantity}</span>
                <button class="qty-btn" onclick="changeQuantity(${item.id}, ${quantity + 1})">＋</button>
            </div>
            <div class="item-subtotal">$${subtotal.toFixed(2)}</div>
            <button class="remove-btn" onclick="removeItem(${item.id})">移除</button>
        `;
        container.appendChild(row);
    });

    // 更新總計金額
    totalEl.innerText = (cartData.totalPrice || 0).toFixed(2);
}

// 調整商品數量（數量為 0 時後端會自動移除該項）
async function changeQuantity(itemId, newQuantity) {
    try {
        await fetch(`/cart/item/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.userId, quantity: newQuantity })
        });
        loadCart();
    } catch (err) {
        console.error('Error:', err);
        alert('更新數量失敗');
    }
}

// 從購物車移除單一商品
async function removeItem(itemId) {
    if (!confirm('確定要將此商品從購物車移除嗎？')) return;
    try {
        await fetch(`/cart/item/${itemId}?userId=${currentUser.userId}`, { method: 'DELETE' });
        loadCart();
    } catch (err) {
        console.error('Error:', err);
        alert('移除商品失敗');
    }
}

// 結帳：將購物車轉為訂單
async function checkout() {
    const items = cartData.cart || [];
    if (items.length === 0) {
        alert('購物車是空的');
        return;
    }
    if (!confirm(`確定要結帳嗎？總金額：$${(cartData.totalPrice || 0).toFixed(2)}`)) return;

    try {
        const response = await fetch('/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.userId })
        });
        const data = await response.json();
        if (response.ok) {
            alert(`結帳成功！\n訂單編號：${data.orderId}\n總金額：$${data.total.toFixed(2)}\n感謝您的購買！`);
            loadCart();
            loadOrders();
        } else {
            alert(data.error || '結帳失敗');
        }
    } catch (err) {
        console.error('Error:', err);
        alert('結帳失敗，請確認後端已啟動');
    }
}

// 載入並渲染歷史訂單
async function loadOrders() {
    const section = document.getElementById('orders-section');
    const list = document.getElementById('orders-list');
    try {
        const response = await fetch(`/orders/${currentUser.userId}`);
        const data = await response.json();
        const orders = data.orders || [];
        list.innerHTML = '';

        if (orders.length === 0) {
            section.style.display = 'none';
            return;
        }
        section.style.display = 'block';

        orders.forEach(function (order) {
            const itemsHtml = order.items.map(function (item) {
                return `<li>${item.item_name} × ${item.quantity}（$${(item.item_price * item.quantity).toFixed(2)}）</li>`;
            }).join('');
            const div = document.createElement('div');
            div.className = 'order-card';
            div.innerHTML = `
                <div class="order-header">
                    <span>訂單編號 #${order.id}</span>
                    <span>${order.created_at || ''}</span>
                    <span class="order-total">$${order.total.toFixed(2)}</span>
                </div>
                <ul class="order-items">${itemsHtml}</ul>
            `;
            list.appendChild(div);
        });
    } catch (err) {
        console.error('Error:', err);
    }
}
