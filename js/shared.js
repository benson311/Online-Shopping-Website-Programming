// ===== 全站共用腳本：登入狀態與購物車 =====

// 取得目前登入的使用者（由 login.html / register.html 寫入 localStorage）
function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('currentUser'));
    } catch (e) {
        return null;
    }
}

// 儲存 / 清除目前登入的使用者
function setCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

function clearCurrentUser() {
    localStorage.removeItem('currentUser');
}

// 建立並顯示右上角通知（若頁面沒有通知元素會自動建立）
function showNotification(message, type) {
    let notification = document.getElementById('cart-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'cart-notification';
        notification.className = 'cart-notification';
        notification.style.cssText =
            'position:fixed;top:10px;right:10px;padding:10px 20px;border-radius:5px;' +
            'color:#fff;z-index:1000;display:none;max-width:80%;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
        document.body.appendChild(notification);
    }
    // 一般訊息為深色、錯誤訊息為紅色、成功訊息為綠色
    notification.style.backgroundColor = type === 'error' ? '#c0392b' : (type === 'success' ? '#27ae60' : '#333');
    notification.innerText = message;
    notification.style.display = 'block';
    clearTimeout(notification._timer);
    notification._timer = setTimeout(function () {
        notification.style.display = 'none';
    }, 2000);
}

// 加入商品到購物車（所有商品頁的按鈕都會呼叫這個函數）
async function addToCart(productName, price) {
    const user = getCurrentUser();

    // 未登入時提示並導向登入頁
    if (!user) {
        showNotification('請先登入會員再加入購物車', 'error');
        setTimeout(function () {
            window.location.href = 'login.html';
        }, 1200);
        return;
    }

    try {
        const response = await fetch('/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.userId, itemName: productName, itemPrice: price })
        });
        const data = await response.json();
        if (response.ok) {
            showNotification(`已加入購物車：${productName}`, 'success');
            // 若頁面有購物車數量徽章則一併更新
            const badge = document.getElementById('cart-count');
            if (badge) {
                const res = await fetch(`/cart/${user.userId}`);
                const cartData = await res.json();
                badge.innerText = cartData.totalQuantity || 0;
            }
        } else {
            showNotification(data.error || '加入購物車失敗', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        showNotification('連線伺服器失敗，請確認後端已啟動', 'error');
    }
}
