/**
 * Скрипт витрины и корзины покупок (Сайт 1)
 * Связывает покупки на Маркетплейсе с синхронизацией матричных ячеек на Сайте 2
 */

const API_URL = '/api';
const logBox = document.getElementById('logBox');
const buyBtn = document.getElementById('buyBtn');
const startRobotBtn = document.getElementById('startRobotBtn');
const productsContainer = document.getElementById('productsContainer');

// Переменная для хранения выбранного товара
let selectedProduct = { id: 1, title: 'Сертификат MITRON 1000', priceMitrons: 1000 };

/**
 * Логирование событий в консоль страницы
 */
function log(message) {
    const time = new Date().toLocaleTimeString();
    if (logBox) {
        logBox.innerHTML += `[${time}] ${message}\n`;
        logBox.scrollTop = logBox.scrollHeight;
    }
    console.log(`[Shop] ${message}`);
}

/**
 * Загрузка каталога товаров с бэкенда
 */
async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/products`);
        const data = await res.json();

        if (data.success && productsContainer) {
            productsContainer.innerHTML = '';
            data.products.forEach(product => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <img src="${product.image}" alt="${product.title}" style="max-width: 100%; height: auto; border-radius: 8px;">
                    <h3>${product.title}</h3>
                    <p style="font-size: 14px; color: #666;">${product.description}</p>
                    <p style="font-weight: bold; font-size: 18px; color: #2e7d32;">
                        ${product.priceMitrons} Mitron ${product.hasAsterisk ? '*' : ''} 
                        <span style="font-size: 14px; color: #888;">($${product.finalPriceUsd})</span>
                    </p>
                    <button onclick="selectAndBuyProduct(${product.id}, '${product.title}', ${product.priceMitrons})" style="cursor:pointer; padding: 10px 15px; background: #27ae60; color: white; border: none; border-radius: 6px;">
                        Купить за ${product.priceMitrons} M
                    </button>
                `;
                productsContainer.appendChild(card);
            });
            log(`✓ Загружено товаров из каталога: ${data.products.length}`);
        }
    } catch (err) {
        log(`⚠️ Ошибка загрузки каталога: ${err.message}`);
    }
}

/**
 * Выбор товара и передача в корзину
 */
window.selectAndBuyProduct = function(productId, title, priceMitrons) {
    selectedProduct = { id: productId, title, priceMitrons };
    log(`🛒 Выбран товар: ${title} (${priceMitrons} Mitron)`);
    if (buyBtn) buyBtn.click();
};

/**
 * Обработчик кнопки ручной покупки
 */
if (buyBtn) {
    buyBtn.addEventListener('click', async () => {
        const usernameInput = document.getElementById('buyerName');
        const sponsorInput = document.getElementById('buyerSponsor');
        
        const userWallet = usernameInput ? usernameInput.value.trim() : `User_${Date.now()}`;
        const sponsorId = sponsorInput ? sponsorInput.value.trim() : '';

        if (!userWallet) {
            alert('Введите логин покупателя!');
            return;
        }

        buyBtn.disabled = true;
        const mitronAmount = selectedProduct.priceMitrons || 1000;
        log(`Запуск покупки "${selectedProduct.title}" (${mitronAmount} M) для: ${userWallet}...`);

        try {
            // Оплата, создание анонимного DAO пользователя и зачисление 100% в Кошелек Админа
            const payRes = await fetch(`${API_URL}/shop/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userWallet: userWallet, 
                    totalAmount: mitronAmount, 
                    sponsorId: sponsorId 
                })
            });
            const payData = await payRes.json();

            if (!payRes.ok || !payData.success) {
                throw new Error(payData.error || 'Ошибка покупки');
            }

            log(`💰 Оплата получена! 100% средств (${mitronAmount} M) переведено в Кошелек Администрации.`);
            log(`🟢 На Сайте 2 успешно активировано ячеек: ${payData.activatedCells} (DAO ID: ${payData.daoUsername})`);

        } catch (err) {
            log(`❌ Ошибка: ${err.message}`);
        } finally {
            buyBtn.disabled = false;
        }
    });
}

/**
 * Генератор авто-трафика (Робот покупок)
 */
if (startRobotBtn) {
    startRobotBtn.addEventListener('click', async () => {
        const prefixInput = document.getElementById('botPrefix');
        const countInput = document.getElementById('botCount');

        const prefix = prefixInput ? prefixInput.value.trim() : 'Bot_';
        const count = countInput ? parseInt(countInput.value, 10) : 5;

        startRobotBtn.disabled = true;
        log(`🤖 Робот запущен. Генерируем цепочку из ${count} уникальных ботов...`);

        for (let i = 1; i <= count; i++) {
            const uniqueId = `${Date.now().toString().slice(-6)}_${Math.floor(1000 + Math.random() * 9000)}`;
            const botName = `${prefix}${uniqueId}`;

            log(`➡️ [${i}/${count}] Обработка ${botName}...`);

            try {
                const payRes = await fetch(`${API_URL}/shop/checkout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userWallet: botName, totalAmount: 1000 })
                });
                const payData = await payRes.json();

                if (payRes.ok && payData.success) {
                    log(`  ✓ ${botName} оплатил 1000 M. На Сайте 2 активировано ячеек: ${payData.activatedCells}`);
                } else {
                    log(`  ❌ Ошибка оплаты для ${botName}: ${payData.error || ''}`);
                }

                await new Promise(resolve => setTimeout(resolve, 800));

            } catch (err) {
                log(`  ❌ Системный сбой для ${botName}: ${err.message}`);
            }
        }

        log(`🤖 Работа робота завершена! Проверь обновленные домики на Сайте 2.`);
        startRobotBtn.disabled = false;
    });
}

document.addEventListener('DOMContentLoaded', loadProducts);
