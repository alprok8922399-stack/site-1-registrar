/**
 * =========================================================
 * ПРОЕКТ MITRON — САЙТ 1 (site-1-registrar)
 * Файловый путь: site-1-registrar/frontend/script.js
 * Назначение: Фронтенд-скрипт Маркетплейса
 * Управление витриной, корзиной, валидация диапазонов (-10 M),
 * отказ от покупок (33 дня) и работа с Роботом.
 * =========================================================
 */

const API_URL = '/api';
let cart = [];
let catalog = [];
let userAccumulatedTotal = 0;

// 1. Старт инициализации
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    checkAuthStatus();
    loadRefundStats();
    loadUserOrders();

    // Слушатель изменения поля с логином для мгновенного обновления заказов
    const userInput = document.getElementById('usernameInput');
    if (userInput) {
        userInput.addEventListener('change', () => {
            const val = userInput.value.trim();
            if (val) {
                localStorage.setItem('mitron_user', val);
                checkAuthStatus();
                loadUserOrders();
            }
        });
    }
});

// Загрузка статистики по отказам
async function loadRefundStats() {
    try {
        const res = await fetch(`${API_URL}/shop/refund-stats`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.stats) {
                const todayEl = document.getElementById('stat-refused-today');
                const totalEl = document.getElementById('stat-refused-total');
                
                if (todayEl) todayEl.innerText = `${data.stats.refusedToday || data.stats.refusedTodayUsers || 0} чел.`;
                if (totalEl) totalEl.innerText = `${data.stats.totalRefused || data.stats.totalUsersRefused || 0} чел.`;
            }
        }
    } catch (e) {
        console.error('Ошибка загрузки статистики отказов:', e);
    }
}

// 2. Отрисовка товаров на витрине
async function loadProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    try {
        const res = await fetch(`${API_URL}/products`);
        if (res.ok) {
            catalog = await res.json();
        } else {
            catalog = [
                { id: 1, title: "Сертификат MITRON 1000", priceMitrons: 1000, description: "Номинал: 1000 M | Эквивалент ячейки матрицы" },
                { id: 2, title: "Смарт-часы MITRON Watch Pro *", priceMitrons: 1231, description: "Себестоимость: 65 M | Наценка: x2.46 | Итого: 1231 M" },
                { id: 3, title: "Фирменное худи MITRON DAO *", priceMitrons: 654, description: "Себестоимость: 32.5 M | Наценка: x2.62 | Итого: 654 M" },
                { id: 4, title: "Беспроводные наушники MITRON Sound *", priceMitrons: 500, description: "Себестоимость: 25 M | Наценка: x2.60 | Итого: 500 M" },
                { id: 5, title: "Кожаный портмоне MITRON Leather *", priceMitrons: 346, description: "Себестоимость: 15 M | Наценка: x3.00 | Итого: 346 M" },
                { id: 6, title: "Умная бутылка MITRON Hydro *", priceMitrons: 323, description: "Себестоимость: 18 M | Наценка: x2.33 | Итого: 323 M" },
                { id: 7, title: "Фирменная кепка MITRON Cap *", priceMitrons: 215, description: "Себестоимость: 10 M | Наценка: x2.80 | Итого: 215 M" },
                { id: 8, title: "Портативный PowerBank 20000 mAh *", priceMitrons: 446, description: "Себестоимость: 22 M | Наценка: x2.64 | Итого: 446 M" }
            ];
        }

        renderCatalog();
    } catch (e) {
        console.error('Ошибка загрузки товаров:', e);
    }
}

function renderCatalog() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    grid.innerHTML = catalog.map(p => {
        const displayTitle = p.title || p.name;
        const priceM = p.priceMitrons || p.priceM || 1000;
        const image = p.image || 'https://via.placeholder.com/300x200';
        const desc = p.description || '';

        return `
            <div class="card">
                <img src="${image}" alt="${displayTitle}">
                <div class="card-content">
                    <div>
                        <div class="card-title">${displayTitle}</div>
                        ${desc ? `<div style="font-size:11px; color:#777; margin-bottom:5px;">${desc}</div>` : ''}
                    </div>
                    <div>
                        <div class="card-price" style="font-size:18px; font-weight:bold; color:#00b894; margin-bottom:10px;">
                            ${priceM} M
                        </div>
                        <button class="btn btn-add" style="width:100%; padding:10px; background:#00b894; color:#fff; border:none; border-radius:5px; cursor:pointer;" onclick="addToCart('${p.id}')">В корзину</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 3. Управление корзиной
function addToCart(productId) {
    const item = catalog.find(p => String(p.id) === String(productId));
    if (item) {
        cart.push(item);
        updateCartUI();
        toggleCart(true);
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// 4. Отрисовка корзины и валидация
function updateCartUI() {
    const badge = document.getElementById('cartBadge');
    const itemsContainer = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotalM');

    if (badge) badge.innerText = cart.length;

    if (itemsContainer) {
        if (cart.length === 0) {
            itemsContainer.innerHTML = '<p style="color:#999; text-align:center; margin-top:30px;">Корзина пуста</p>';
        } else {
            itemsContainer.innerHTML = cart.map((item, idx) => `
                <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #eee;">
                    <div>
                        <strong>${item.title || item.name}</strong>
                        <div style="font-size:12px; color:#666;">${item.priceMitrons || item.priceM} M</div>
                    </div>
                    <button class="btn" style="color:red; background:none; border:none; font-size:16px; cursor:pointer;" onclick="removeFromCart(${idx})">✕</button>
                </div>
            `).join('');
        }
    }

    const totalM = cart.reduce((sum, item) => sum + (item.priceMitrons || item.priceM || 0), 0);
    if (totalEl) totalEl.innerText = `${totalM} M`;

    validateCartUI(totalM);
}

// 5. Валидация корзины с учетом накопительного лимита (5000 M) и отображением разрыва (-10 M)
function validateCartUI(totalM) {
    const hint = document.getElementById('cartHint');
    const payBtn = document.getElementById('payBtn');
    if (!hint || !payBtn) return;

    if (totalM === 0) {
        hint.className = 'status-alert warning';
        hint.innerText = 'Добавьте товары в корзину для оформления заказа.';
        payBtn.disabled = true;
        return;
    }

    const grandTotal = userAccumulatedTotal + totalM;

    if (grandTotal > 5000) {
        hint.className = 'status-alert error';
        hint.innerText = `Превышен глобальный лимит (5000 M)! Доступно для заказа: ${Math.max(0, 5000 - userAccumulatedTotal)} M. Уберите лишние товары.`;
        payBtn.disabled = true;
        return;
    }

    const ranges = [
        { min: 990, max: 1000 },
        { min: 1990, max: 2000 },
        { min: 2990, max: 3000 },
        { min: 3990, max: 4000 },
        { min: 4990, max: 5000 }
    ];

    const match = ranges.find(r => totalM >= r.min && totalM <= r.max);

    if (match) {
        hint.className = 'status-alert success';
        hint.innerText = 'Сумма корзины корректна! Покупка готова к оформлению.';
        payBtn.disabled = false;
    } else {
        let target = ranges.find(r => r.max >= totalM);
        if (!target) target = ranges[ranges.length - 1];

        const diffMin = target.min - totalM;
        const diffMax = target.max - totalM;

        hint.className = 'status-alert warning';
        if (diffMin === diffMax) {
            hint.innerText = `Вам необходимо заполнить корзину ещё на ${diffMin} Митронов.`;
        } else {
            hint.innerText = `Вам необходимо заполнить корзину ещё на ${diffMin}–${diffMax} Митронов.`;
        }
        payBtn.disabled = true;
    }
}

// 6. Оплата заказа с защитой от зависания
async function processPayment() {
    const totalM = cart.reduce((sum, item) => sum + (item.priceMitrons || item.priceM || 0), 0);
    const payBtn = document.getElementById('payBtn');
    const hint = document.getElementById('cartHint');
    const userInput = document.getElementById('usernameInput');

    const username = userInput && userInput.value.trim() ? userInput.value.trim() : (localStorage.getItem('mitron_user') || 'Покупатель');

    if (!username || username === 'Покупатель') {
        if (hint) {
            hint.className = 'status-alert error';
            hint.innerText = 'Пожалуйста, укажите ваш логин покупателя.';
        }
        return;
    }

    localStorage.setItem('mitron_user', username);

    if (payBtn) payBtn.disabled = true;
    if (hint) {
        hint.className = 'status-alert warning';
        hint.innerText = 'Обработка платежа и создание заказа...';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const res = await fetch(`${API_URL}/shop/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                username: username,
                totalMitrons: totalM,
                cartItems: cart
            })
        });

        clearTimeout(timeoutId);
        const data = await res.json();

        if (res.ok && data.success) {
            if (hint) {
                hint.className = 'status-alert success';
                hint.innerText = 'Оплата прошла успешно! Ваш заказ оформлен.';
            }
            cart = [];
            userAccumulatedTotal = data.accumulatedTotal || (userAccumulatedTotal + totalM);
            updateCartUI();
            loadUserOrders();
            setTimeout(() => toggleCart(false), 1500);
        } else {
            throw new Error(data.error || 'Ошибка при проведении оплаты');
        }
    } catch (err) {
        clearTimeout(timeoutId);
        if (hint) {
            hint.className = 'status-alert error';
            if (err.name === 'AbortError') {
                hint.innerText = 'Превышено время ожидания сервера. Попробуйте еще раз.';
            } else {
                hint.innerText = `Ошибка: ${err.message}`;
            }
        }
    } finally {
        if (payBtn) payBtn.disabled = false;
    }
}

// Вспомогательная функция поиска/создания контейнера для заказов
function getOrCreateOrdersContainer() {
    let container = document.getElementById('userOrdersContainer');
    if (!container) {
        const drawer = document.getElementById('cartDrawer') || document.body;
        container = document.createElement('div');
        container.id = 'userOrdersContainer';
        container.style.cssText = 'margin-top:20px; padding:10px; border-top:2px dashed #ccc;';
        drawer.appendChild(container);
    }
    return container;
}

// 7. Управление заказами пользователя и отказ от покупок (33 дня)
async function loadUserOrders() {
    const ordersContainer = getOrCreateOrdersContainer();
    const userInput = document.getElementById('usernameInput');
    const username = (userInput && userInput.value.trim()) || localStorage.getItem('mitron_user');

    if (!username || username === 'Покупатель') {
        ordersContainer.innerHTML = '<p style="color:#888; font-size:12px; text-align:center;">Укажите ваш логин для просмотра заказов и функций отказа.</p>';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/shop/orders?username=${encodeURIComponent(username)}`);
        if (!res.ok) throw new Error('Не удалось загрузить заказы');

        const data = await res.json();
        
        userAccumulatedTotal = data.orders 
            ? data.orders.filter(o => o.status !== 'REFUNDED').reduce((sum, o) => sum + (o.totalMitrons || o.amountMitrons || 0), 0)
            : 0;

        if (data.success && data.orders && data.orders.length > 0) {
            ordersContainer.innerHTML = '<h4 style="margin:5px 0 10px 0; font-size:14px;">Мои активные заказы:</h4>' + data.orders.map(order => {
                const createdDate = new Date(order.createdAt || Date.now());
                const diffDays = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));
                
                const isRefunded = order.status === 'REFUNDED';
                const canRefund = diffDays <= 33 && !isRefunded;

                let buttonHtml = '';
                if (isRefunded) {
                    buttonHtml = `<div style="font-size:12px; color:#777; text-align:center; padding:5px;">Покупка была отменена</div>`;
                } else if (!canRefund) {
                    buttonHtml = `
                        <button disabled style="width:100%; padding:10px; background:#95a5a6; color:#fff; border:none; border-radius:5px; font-weight:bold; cursor:not-allowed; font-size:13px; margin-top:5px; opacity:0.6;">
                            🚫 Срок возврата истек (33 дня)
                        </button>
                    `;
                } else {
                    buttonHtml = `
                        <button onclick="refundOrder('${order.id || order._id}')" style="width:100%; padding:10px; background:#e74c3c; color:#fff; border:none; border-radius:5px; font-weight:bold; cursor:pointer; font-size:13px; margin-top:5px;">
                            🚫 Отказаться от покупки (Возврат)
                        </button>
                    `;
                }

                return `
                    <div style="background:#f9f9f9; border:1px solid ${isRefunded ? '#e74c3c' : '#ddd'}; padding:12px; border-radius:8px; margin-bottom:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <strong>Заказ #${order.id || order._id || '1'}</strong>
                            <span style="font-size:12px; color:${isRefunded ? '#e74c3c' : '#2ecc71'}; font-weight:bold;">
                                ${isRefunded ? '🚫 Возвращен' : '✅ Оплачен'} (${diffDays} дн.)
                            </span>
                        </div>
                        <div style="font-size:14px; margin-bottom:8px;">Сумма: <strong>${order.totalMitrons || order.amountMitrons || 1000} M</strong></div>
                        ${buttonHtml}
                    </div>
                `;
            }).join('');
        } else {
            ordersContainer.innerHTML = '<p style="color:#888; font-size:12px; text-align:center;">У вас пока нет активных заказов.</p>';
        }
    } catch (e) {
        console.error('Ошибка загрузки заказов:', e);
        ordersContainer.innerHTML = '<p style="color:#888; font-size:12px; text-align:center;">Ошибка загрузки списка заказов.</p>';
    }
}

async function refundOrder(orderId) {
    const userInput = document.getElementById('usernameInput');
    const username = (userInput && userInput.value.trim()) || localStorage.getItem('mitron_user');

    if (!username) return alert('Пожалуйста, укажите ваш логин');

    if (!confirm('Вы действительно хотите отказаться от покупки? Средства будут возвращены в полном объеме, а выкупленные ячейки переданы Администратору.')) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/shop/refund`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, orderId })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            alert('Отказ оформлен! Покупка отменена, а ячейки переданы Администратору.');
            loadUserOrders();
            loadRefundStats();
        } else {
            alert(`Ошибка отказа: ${data.error || 'Неизвестная ошибка'}`);
        }
    } catch (err) {
        console.error('Ошибка при отмене заказа:', err);
        alert('Не удалось связаться с сервером');
    }
}

// 8. Вход и Окна
function checkAuthStatus() {
    const user = localStorage.getItem('mitron_user');
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        authBtn.innerText = user ? `👤 ${user}` : '👤 Вход';
    }
    const input = document.getElementById('usernameInput');
    if (input && user && !input.value) {
        input.value = user;
    }
}

function handleAuthClick() {
    const current = localStorage.getItem('mitron_user') || 'Покупатель';
    const username = prompt('Введите ваш логин для входа:', current);
    if (username) {
        localStorage.setItem('mitron_user', username.trim());
        checkAuthStatus();
        loadUserOrders();
    }
}

function toggleCart(open) {
    const drawer = document.getElementById('cartDrawer');
    if (drawer) drawer.classList.toggle('open', open);
}

function toggleModal(open) {
    const modal = document.getElementById('modalOverlay');
    if (modal) {
        modal.classList.toggle('open', open);
        if (open) fetchBotStatus();
    }
}

// 9. Связь с Генератором Робота
async function fetchBotStatus() {
    const statusLabel = document.getElementById('statusLabel');
    const actionBtn = document.getElementById('actionBtn');

    if (statusLabel) statusLabel.innerText = 'Запрос к серверу...';

    try {
        const res = await fetch(`${API_URL}/test-bot/status`);
        const data = await res.json();

        if (statusLabel) {
            statusLabel.innerText = data.active ? 'Генератор АКТИВЕН' : 'Генератор ОСТАНОВЛЕН';
            statusLabel.className = `status-box ${data.active ? 'active' : ''}`;
        }

        if (actionBtn) {
            actionBtn.innerText = data.active ? 'Остановить Генератор' : 'Запустить Генератор';
            actionBtn.onclick = () => toggleBot(!data.active);
        }
    } catch (err) {
        if (statusLabel) statusLabel.innerText = 'Сервер недоступен';
    }
}

async function toggleBot(enable) {
    try {
        await fetch(`${API_URL}/test-bot/${enable ? 'start' : 'stop'}`, { method: 'POST' });
        fetchBotStatus();
    } catch (err) {
        console.error('Ошибка переключения генератора:', err);
    }
}

// Глобальные мосты
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.processPayment = processPayment;
window.refundOrder = refundOrder;
window.handleAuthClick = handleAuthClick;
window.toggleCart = toggleCart;
window.toggleModal = toggleModal;
