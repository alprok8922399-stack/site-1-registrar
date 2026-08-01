/**
 * Фронтенд-скрипт Маркетплейса (Сайт 1)
 * Проект: MITRON
 * Управление витриной, корзиной, валидация диапазонов (-10 M), отказ от покупок и работа с Роботом.
 */

const API_URL = '/api';
let cart = [];
let catalog = [];

// 1. Старт инициализации
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    checkAuthStatus();
    loadRefundStats();
    loadUserOrders();
});

// Загрузка статистики по отказам (включая за 24 часа)
async function loadRefundStats() {
    try {
        const res = await fetch(`${API_URL}/shop/refund-stats`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.stats) {
                const todayEl = document.getElementById('stat-refused-today');
                const totalEl = document.getElementById('stat-refused-total');
                
                if (todayEl) todayEl.innerText = `${data.stats.refusedToday || 0} чел.`;
                if (totalEl) totalEl.innerText = `${data.stats.totalRefused || 0} чел.`;
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
            // Резервный расширенный список товаров
            catalog = [
                { id: 1, title: "Сертификат MITRON 1000", priceMitrons: 1000, description: "Номинал: 1000 M | Стоимость: 130 USDT" },
                { id: 2, title: "Смарт-часы MITRON Watch Pro *", priceMitrons: 1231, description: "Себестоимость: 65 USDT | Наценка: x2.46 | Итого: 1231 M" },
                { id: 3, title: "Фирменное худи MITRON DAO *", priceMitrons: 654, description: "Себестоимость: 32.5 USDT | Наценка: x2.62 | Итого: 654 M" },
                { id: 4, title: "Беспроводные наушники MITRON Sound *", priceMitrons: 500, description: "Себестоимость: 25 USDT | Наценка: x2.60 | Итого: 500 M" },
                { id: 5, title: "Кожаный портмоне MITRON Leather *", priceMitrons: 346, description: "Себестоимость: 15 USDT | Наценка: x3.00 | Итого: 346 M" },
                { id: 6, title: "Умная бутылка MITRON Hydro *", priceMitrons: 323, description: "Себестоимость: 18 USDT | Наценка: x2.33 | Итого: 323 M" },
                { id: 7, title: "Фирменная кепка MITRON Cap *", priceMitrons: 215, description: "Себестоимость: 10 USDT | Наценка: x2.80 | Итого: 215 M" },
                { id: 8, title: "Портативный PowerBank 20000 mAh *", priceMitrons: 446, description: "Себестоимость: 22 USDT | Наценка: x2.64 | Итого: 446 M" }
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

// 4. Отрисовка корзины и динамических проверок
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

// 5. Строгая валидация корзины (-10 M) по ТЗ с выводом нехватки
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

    if (totalM > 5000) {
        hint.className = 'status-alert error';
        hint.innerText = `Превышен лимит! Максимальная сумма заказа — 5000 M. Уберите товары на ${totalM - 5000} M.`;
        payBtn.disabled = true;
        return;
    }

    // Допустимые диапазоны (погрешность до -10 M)
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

        const needMore = target.min - totalM;
        hint.className = 'status-alert warning';
        hint.innerText = `Вам необходимо заполнить корзину ещё на ${needMore} Митронов.`;
        payBtn.disabled = true;
    }
}

// 6. Оплата заказа
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

    try {
        const res = await fetch(`${API_URL}/shop/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                totalMitrons: totalM,
                cartItems: cart
            })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            if (hint) {
                hint.className = 'status-alert success';
                hint.innerText = 'Оплата прошла успешно! Ваш заказ оформлен.';
            }
            cart = [];
            updateCartUI();
            loadUserOrders();
            setTimeout(() => toggleCart(false), 1500);
        } else {
            throw new Error(data.error || 'Ошибка при проведении оплаты');
        }
    } catch (err) {
        if (hint) {
            hint.className = 'status-alert error';
            hint.innerText = `Ошибка: ${err.message}`;
        }
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

// 7. Управление заказами пользователя и ОТОБРАЖЕНИЕ КНОПКИ ОТКАЗА
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
        if (data.success && data.orders && data.orders.length > 0) {
            ordersContainer.innerHTML = '<h4 style="margin:5px 0 10px 0; font-size:14px;">Мои активные заказы:</h4>' + data.orders.map(order => {
                const createdDate = new Date(order.createdAt || Date.now());
                const diffDays = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));
                const canRefund = diffDays <= 31 && order.status !== 'REFUNDED';
                const isRefunded = order.status === 'REFUNDED';

                return `
                    <div style="background:#f9f9f9; border:1px solid ${isRefunded ? '#e74c3c' : '#ddd'}; padding:12px; border-radius:8px; margin-bottom:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <strong>Заказ #${order.id || order._id || '1'}</strong>
                            <span style="font-size:12px; color:${isRefunded ? '#e74c3c' : '#2ecc71'}; font-weight:bold;">
                                ${isRefunded ? '🚫 Возвращен' : '✅ Оплачен'} (${diffDays} дн.)
                            </span>
                        </div>
                        <div style="font-size:14px; margin-bottom:8px;">Сумма: <strong>${order.totalMitrons || order.amountMitrons || 1000} M</strong></div>
                        ${canRefund ? `
                            <button 
                                onclick="refundOrder('${order.id || order._id}')" 
                                style="width:100%; padding:10px; background:#e74c3c; color:#fff; border:none; border-radius:5px; font-weight:bold; cursor:pointer; font-size:13px; margin-top:5px;">
                                🚫 Отказаться от покупки (Возврат)
                            </button>
                        ` : ''}
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

    if (!confirm('Вы действительно хотите отказаться от покупки? Средства будут возвращены в полном объеме, а выкупленный объем передается Администратору.')) {
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
            alert('Отказ оформлен! Покупка отменена, средства возвращены.');
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
    if (input && user) {
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
    const consoleLog = document.getElementById('consoleLog');

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

        if (consoleLog && data.logs) {
            consoleLog.innerHTML = data.logs.map(l => `<div>${l}</div>`).join('');
        }
    } catch (err) {
        if (statusLabel) statusLabel.innerText = 'Сервер недоступен';
        if (actionBtn) actionBtn.innerText = 'Повторить попытку';
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

// Глобальные мосты для обработчиков событий
window.refundOrder = refundOrder;
window.handleAuthClick = handleAuthClick;
