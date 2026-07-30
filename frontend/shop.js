/**
 * Фронтенд-скрипт Маркетплейса (Сайт 1)
 * Проект: MITRON
 * Управление витриной, корзиной, валидация диапазонов (-10 M) и отправка покупок.
 */

const API_URL = '/api';
let cart = [];

// 1. Алгоритм расчёта цены товара по ТЗ (x2.2 или Потолок)
function calculatePrice(p) {
    const minAvg = p.minPrice || p.price;
    const ceilingAvg = p.ceilingPrice || (minAvg * 2.5);
    const ratio = ceilingAvg / minAvg;

    let finalPrice = 0;
    let isCeiling = false;

    if (ratio >= 2.2) {
        finalPrice = Math.round(ceilingAvg);
        isCeiling = true;
    } else {
        finalPrice = Math.round(minAvg * 2.2);
    }
    return { priceM: finalPrice, isCeiling };
}

// 2. Отрисовка товаров на витрине
async function loadProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    try {
        const res = await fetch(`${API_URL}/products`);
        let products = [];
        if (res.ok) {
            products = await res.json();
        } else {
            // Резервный список если сервер еще загружается
            products = [
                { id: 1, name: "Беспроводные наушники Pro", minPrice: 200, ceilingPrice: 500, img: "https://picsum.photos/300/200?random=1" },
                { id: 2, name: "Смарт-часы Mitron Band", minPrice: 300, ceilingPrice: 800, img: "https://picsum.photos/300/200?random=2" },
                { id: 3, name: "Портативная колонка Boom", minPrice: 150, ceilingPrice: 300, img: "https://picsum.photos/300/200?random=3" },
                { id: 4, name: "Рюкзак городской Shield", minPrice: 100, ceilingPrice: 250, img: "https://picsum.photos/300/200?random=4" },
                { id: 5, name: "Powerbank 20000 mAh", minPrice: 180, ceilingPrice: 420, img: "https://picsum.photos/300/200?random=5" }
            ];
        }

        grid.innerHTML = products.map(p => {
            const { priceM, isCeiling } = calculatePrice(p);
            return `
                <div class="card">
                    <img src="${p.img || 'https://picsum.photos/300/200'}" alt="${p.name}">
                    <div class="card-content">
                        <div class="card-title">${p.name}</div>
                        <div class="card-price">
                            ${priceM} M ${isCeiling ? '<span class="ceiling-tag">*</span>' : ''}
                        </div>
                        <button class="btn btn-add" onclick="addToCart('${p.id}', '${p.name}', ${priceM})">В корзину</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Ошибка загрузки товаров:', e);
    }
}

// 3. Управление корзиной
function addToCart(id, name, priceM) {
    cart.push({ id, name, priceM });
    updateCartUI();
    toggleCart(true);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// 4. Отрисовка корзины и проверок по ТЗ
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
            <div class="cart-item">
                <div>
                    <strong>${item.name}</strong>
                    <div style="font-size:12px; color:#666;">${item.priceM} M</div>
                </div>
                <button class="btn" style="color:red; background:none; font-size:16px;" onclick="removeFromCart(${idx})">✕</button>
            </div>
        `).join('');
    }

    const totalM = cart.reduce((sum, item) => sum + item.priceM, 0);
    if (totalEl) totalEl.innerText = `${totalM} M`;

    validateCartUI(totalM);
}

// 5. Строгая валидация корзины (-10 M) по ТЗ
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

    // Допустимые диапазоны для 1-5 ячеек
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
        let target = ranges.find(r => r.min > totalM);
        if (!target) target = ranges[ranges.length - 1];

        const needMore = target.min - totalM;
        hint.className = 'status-alert warning';
        hint.innerText = `Вам необходимо заполнить корзину ещё на ${needMore} Митронов.`;
        payBtn.disabled = true;
    }
}

// 6. Оплата заказа
async function processPayment() {
    const totalM = cart.reduce((sum, item) => sum + item.priceM, 0);
    const payBtn = document.getElementById('payBtn');
    const hint = document.getElementById('cartHint');

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
