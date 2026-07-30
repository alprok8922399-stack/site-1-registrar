/**
 * Фронтенд-скрипт Маркетплейса (Сайт 1)
 * Проект: MITRON
 * Управление витриной, корзиной, валидация диапазонов (-10 M) и отправка покупок.
 */

const API_URL = '/api';
let cart = [];

// 1. Отрисовка товаров на витрине
async function loadProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    try {
        const res = await fetch(`${API_URL}/products`);
        let products = [];
        if (res.ok) {
            products = await res.json();
        } else {
            // Резервный список с поддержкой флага Потолка (*)
            products = [
                { id: 1, title: "Сертификат MITRON 1000", priceMitrons: 1000, hasStarMark: false },
                { id: 2, title: "Смарт-часы MITRON Watch Pro *", priceMitrons: 1231, hasStarMark: true },
                { id: 3, title: "Фирменное худи MITRON DAO *", priceMitrons: 654, hasStarMark: true }
            ];
        }

        grid.innerHTML = products.map(p => {
            const displayTitle = p.title || p.name;
            const priceM = p.priceMitrons || p.priceM || 1000;
            const image = p.image || p.img || 'https://via.placeholder.com/300x200';
            const desc = p.description || '';

            return `
                <div class="card">
                    <img src="${image}" alt="${displayTitle}">
                    <div class="card-content">
                        <div class="card-title">${displayTitle}</div>
                        ${desc ? `<div style="font-size:11px; color:#777; margin-bottom:5px;">${desc}</div>` : ''}
                        <div class="card-price" style="font-size:18px; font-weight:bold; color:#00b894; margin-bottom:10px;">
                            ${priceM} M
                        </div>
                        <button class="btn btn-add" style="width:100%; padding:10px; background:#00b894; color:#fff; border:none; border-radius:5px; cursor:pointer;" onclick="addToCart('${p.id}', '${displayTitle.replace(/'/g, "\\'")}', ${priceM})">В корзину</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Ошибка загрузки товаров:', e);
    }
}

// 2. Управление корзиной
function addToCart(id, name, priceM) {
    cart.push({ id, name, priceM });
    updateCartUI();
    toggleCart(true);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// 3. Отрисовка корзины и динамических проверок
function updateCartUI() {
    const badge = document.getElementById('cartBadge');
    const itemsContainer = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotalM');

    if (badge) badge.innerText = cart.length;

    if (!itemsContainer) return;

    if (cart.length === 0) {
        itemsContainer.innerHTML = '<p style="color:#999; text-align:center; margin-top:30px;">Корзина пуста</p>';
    } else {
        itemsContainer.innerHTML = cart.map((item, idx) => `
            <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #eee;">
                <div>
                    <strong>${item.name}</strong>
                    <div style="font-size:12px; color:#666;">${item.priceM} M</div>
                </div>
                <button class="btn" style="color:red; background:none; border:none; font-size:16px; cursor:pointer;" onclick="removeFromCart(${idx})">✕</button>
            </div>
        `).join('');
    }

    const totalM = cart.reduce((sum, item) => sum + item.priceM, 0);
    if (totalEl) totalEl.innerText = `${totalM} M`;

    validateCartUI(totalM);
}

// 4. Строгая валидация корзины (-10 M) по ТЗ с выводом нехватки
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

    // Допустимые диапазоны для 1-5 ячеек (погрешность до -10 M)
    const ranges = [
        { min: 990, max: 1000, cells: 1 },
        { min: 1990, max: 2000, cells: 2 },
        { min: 2990, max: 3000, cells: 3 },
        { min: 3990, max: 4000, cells: 4 },
        { min: 4990, max: 5000, cells: 5 }
    ];

    const match = ranges.find(r => totalM >= r.min && totalM <= r.max);

    if (match) {
        hint.className = 'status-alert success';
        hint.innerText = `Сумма корзины корректна! Активируется ячеек на Сайте 2: ${match.cells}.`;
        payBtn.disabled = false;
    } else {
        // Определение целевого порога
        let target = ranges.find(r => r.max >= totalM);
        if (!target) target = ranges[ranges.length - 1];

        const needMore = target.min - totalM;
        hint.className = 'status-alert warning';
        hint.innerText = `Вам необходимо заполнить корзину ещё на ${needMore} Митронов.`;
        payBtn.disabled = true;
    }
}

// 5. Оплата заказа и передача на Сайт 2
async function processPayment() {
    const totalM = cart.reduce((sum, item) => sum + item.priceM, 0);
    const payBtn = document.getElementById('payBtn');
    const hint = document.getElementById('cartHint');
    const userInput = document.getElementById('usernameInput');

    const username = userInput ? userInput.value.trim() : 'Пупкин';

    if (!username) {
        alert('Пожалуйста, введите логин покупателя');
        return;
    }

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
            alert(`Покупка успешно совершена! Создано ячеек на Сайте 2: ${data.cellsCount || 1}`);
            cart = [];
            updateCartUI();
            toggleCart(false);
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

// Вспомогательное открытие/закрытие корзины
function toggleCart(open) {
    const drawer = document.getElementById('cartDrawer');
    if (drawer) drawer.classList.toggle('open', open);
}

function toggleModal(open) {
    const modal = document.getElementById('modalOverlay');
    if (modal) modal.classList.toggle('open', open);
}

// Старт инициализации
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateCartUI();
});
