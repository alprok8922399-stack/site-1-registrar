/**
 * Фронтенд-скрипт Маркетплейса (Сайт 1)
 * Проект: MITRON — Модуль взаимодействия с покупателем
 */

const API_URL = '/api';
let cart = [];
let catalog = [];

// Вспомогательная функция защиты от XSS
function escapeHTML(str) {
    return String(str ?? '').replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
}

// 1. Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    checkAuthStatus();
    loadRefundStats();
    loadUserOrders();
});

// Загрузка глобальной статистики по отказам
async function loadRefundStats() {
    try {
        const res = await fetch(`${API_URL}/shop/refund-stats`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.stats) {
                const todayEl = document.getElementById('stat-refused-today');
                const totalEl = document.getElementById('stat-refused-total');
                
                if (todayEl) todayEl.innerText = `${data.stats.refusedTodayUsers || data.stats.refusedToday || 0} чел. (${data.stats.refusedTodayUnits || 0} яч.)`;
                if (totalEl) totalEl.innerText = `${data.stats.totalUsersRefused || data.stats.totalRefused || 0} чел. (${data.stats.totalUnitsRefused || 0} яч.)`;
            }
        }
    } catch (e) {
        console.error('Ошибка загрузки статистики отказов:', e);
    }
}

// 2. Отрисовка каталога товаров
async function loadProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    try {
        const res = await fetch(`${API_URL}/products`);
        if (res.ok) {
            catalog = await res.json();
        } else {
            // Резервный каталог по ТЗ
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
        const displayTitle = escapeHTML(p.title || p.name);
        const priceM = Number(p.priceMitrons || p.priceM || 1000);
        const image = escapeHTML(p.image || 'https://via.placeholder.com/300x200');
        const desc = escapeHTML(p.description || '');

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

// 4. Отрисовка содержимого корзины
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
                        <strong>${escapeHTML(item.title || item.name)}</strong>
                        <div style="font-size:12px; color:#666;">${Number(item.priceMitrons || item.priceM || 0)} M</div>
                    </div>
                    <button class="btn" style="color:red; background:none; border:none; font-size:16px; cursor:pointer;" onclick="removeFromCart(${idx})">✕</button>
                </div>
            `).join('');
        }
    }

    const totalM = cart.reduce((sum, item) => sum + Number(item.priceMitrons || item.priceM || 0), 0);
    if (totalEl) totalEl.innerText = `${totalM} M`;

    validateCartUI(totalM);
}

// 5. Валидация сумм и разрыва в -10 M по ТЗ
async function validateCartUI(totalM) {
    const hint = document.getElementById('cartHint');
    const payBtn = document.getElementById('payBtn');
    const userInput = document.getElementById('usernameInput');
    const username = (userInput && userInput.value.trim()) || localStorage.getItem('mitron_user');

    if (!hint || !payBtn) return;

    if (totalM === 0) {
        hint.className = 'status-alert warning';
        hint.innerText = 'Добавьте товары в корзину для оформления заказа.';
        payBtn.disabled = true;
        return;
    }

    // Проверка лимита заказа в рамках одной покупки
    if (totalM > 5000) {
        hint.className = 'status-alert error';
        hint.innerText = `Превышен лимит! Максимальная сумма единовременного заказа — 5000 M. Уберите товары на ${totalM - 5000} M.`;
        payBtn.disabled = true;
        return;
    }

    // Проверка накопительного лимита за все время у пользователя (макс. 5000 M)
    if (username && username !== 'Покупатель') {
        try {
            const checkRes = await fetch(`${API_URL}/shop/user-purchases/${encodeURIComponent(username)}`);
            if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.success) {
                    const spent = checkData.totalSpent || 0;
                    if (spent + totalM > 5000) {
                        hint.className = 'status-alert error';
                        hint.innerText = `Превышен накопительный лимит! Вы уже купили товаров на ${spent} M. Максимум 5000 M до получения 100% кешбэка.`;
                        payBtn.disabled = true;
                        return;
                    }
                }
            }
        } catch (e) {
            console.error('Ошибка проверки накопительного лимита:', e);
        }
    }

    // Расчет кратного шага (1000, 2000, 3000, 4000, 5000) с допуском -10 M
    const targetBracket = Math.ceil(totalM / 1000) * 1000;
    const currentTarget = targetBracket === 0 ? 1000 : targetBracket;
    const minAllowed = currentTarget - 10;

    if (totalM >= minAllowed && totalM <= currentTarget) {
        hint.className = 'status-alert success';
        hint.innerText = `Сумма корзины (${totalM} M) готова к оформлению! Зачисляется ячеек: ${currentTarget / 1000} шт.`;
        payBtn.disabled = false;
    } else if (totalM < minAllowed) {
        const minNeeded = minAllowed - totalM;
        const maxNeeded = currentTarget - totalM;
        hint.className = 'status-alert warning';
        hint.innerText = `Вам необходимо заполнить корзину ещё на ${minNeeded}–${maxNeeded} Митронов.`;
        payBtn.disabled = true;
    }
}

// 6. Оформление оплаты
async function processPayment() {
    const totalM = cart.reduce((sum, item) => sum + Number(item.priceMitrons || item.priceM || 0), 0);
    const payBtn = document.getElementById('payBtn');
    const hint = document.getElementById('cartHint');
    const userInput = document.getElementById('usernameInput');
    const sponsorInput = document.getElementById('sponsorInput');

    const username = userInput && userInput.value.trim() ? userInput.value.trim() : (localStorage.getItem('mitron_user') || 'Покупатель');
    const sponsorLogin = sponsorInput ? sponsorInput.value.trim() : '';

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
        hint.innerText = 'Обработка платежа и перечисление средств...';
    }

    try {
        const res = await fetch(`${API_URL}/shop/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                sponsor: sponsorLogin,
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
            loadRefundStats();
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

// Контейнер заказов
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

// 7. Загрузка списка заказов пользователя и блокировка отмены через 33 дня
async function loadUserOrders() {
    const ordersContainer = getOrCreateOrdersContainer();
    const userInput = document.getElementById('usernameInput');
    const username = (userInput && userInput.value.trim()) || localStorage.getItem('mitron_user');

    if (!username || username === 'Покупатель') {
        ordersContainer.innerHTML = '<p style="color:#888; font-size:12px; text-align:center;">Укажите ваш логин для просмотра заказов и функций отмены.</p>';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/shop/orders?username=${encodeURIComponent(username)}`);
        if (!res.ok) throw new Error('Не удалось загрузить заказы');

        const data = await res.json();
        if (data.success && data.orders && data.orders.length > 0) {
            ordersContainer.innerHTML = '<h4 style="margin:5px 0 10px 0; font-size:14px;">Мои заказы:</h4>' + data.orders.map(order => {
                const createdDate = new Date(order.createdAt || Date.now());
                const diffDays = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));
                const isRefunded = order.status === 'REFUNDED' || order.isRefunded;
                const isExpired = diffDays >= 33;
                const orderAmount = Number(order.totalMitrons || order.amountMitrons || 1000);
                const safeOrderId = escapeHTML(order.id || order._id || '1');

                let buttonHtml = '';
                if (isRefunded) {
                    buttonHtml = `<div style="font-size:12px; color:#e74c3c; text-align:center; padding:5px; font-weight:bold;">🚫 Покупка отменена (Возврат 100%)</div>`;
                } else if (isExpired) {
                    buttonHtml = `
                        <button disabled style="width:100%; padding:10px; background:#95a5a6; color:#fff; border:none; border-radius:5px; font-weight:bold; cursor:not-allowed; font-size:13px; margin-top:5px; opacity:0.6;">
                            🚫 Срок возврата истек (33 дня)
                        </button>
                    `;
                } else {
                    buttonHtml = `
                        <button onclick="refundOrder('${safeOrderId}', ${orderAmount})" style="width:100%; padding:10px; background:#e74c3c; color:#fff; border:none; border-radius:5px; font-weight:bold; cursor:pointer; font-size:13px; margin-top:5px;">
                            🚫 Отказаться от покупки (Возврат)
                        </button>
                    `;
                }

                return `
                    <div style="background:#f9f9f9; border:1px solid ${isRefunded ? '#e74c3c' : '#ddd'}; padding:12px; border-radius:8px; margin-bottom:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <strong>Заказ #${safeOrderId}</strong>
                            <span style="font-size:12px; color:${isRefunded ? '#e74c3c' : '#2ecc71'}; font-weight:bold;">
                                ${isRefunded ? '🚫 Отменен' : '✅ Оплачен'} (${diffDays} дн.)
                            </span>
                        </div>
                        <div style="font-size:14px; margin-bottom:8px;">Сумма: <strong>${orderAmount} M</strong></div>
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

// 8. Обработка нажатия кнопки отказа от покупки
async function refundOrder(orderId, amount) {
    const userInput = document.getElementById('usernameInput');
    const username = (userInput && userInput.value.trim()) || localStorage.getItem('mitron_user');

    if (!username) return alert('Пожалуйста, укажите ваш логин');

    if (!confirm('Вы действительно хотите отказаться от покупки? Вам гарантирован 100% возврат средств, а выкупленный товар и место переходят Администратору.')) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/shop/refund`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, orderId, amount: Number(amount) || 1000 })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            alert('Отказ успешно зафиксирован! Средства возвращены в полном объеме.');
            loadUserOrders();
            loadRefundStats();
            updateCartUI();
        } else {
            alert(`Ошибка отказа: ${data.error || 'Неизвестная ошибка'}`);
        }
    } catch (err) {
        console.error('Ошибка при отмене заказа:', err);
        alert('Не удалось связаться с сервером');
    }
}

// 9. Авторизация и переключение окон
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
        updateCartUI();
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

// 10. Управление Роботом-генератором
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
            consoleLog.innerHTML = data.logs.map(l => `<div>${escapeHTML(l)}</div>`).join('');
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

// Регистрируем глобальные функции для вызова из HTML
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.processPayment = processPayment;
window.refundOrder = refundOrder;
window.handleAuthClick = handleAuthClick;
window.toggleCart = toggleCart;
window.toggleModal = toggleModal;
