const API_URL = '/api';
const logBox = document.getElementById('logBox');
const buyBtn = document.getElementById('buyBtn');
const startRobotBtn = document.getElementById('startRobotBtn');
const productsContainer = document.getElementById('productsContainer');

function log(message) {
    const time = new Date().toLocaleTimeString();
    if (logBox) {
        logBox.innerHTML += `[${time}] ${message}\n`;
        logBox.scrollTop = logBox.scrollHeight;
    }
    console.log(`[Shop] ${message}`);
}

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
                    <button onclick="buyProduct(${product.id}, '${product.title}', ${product.priceMitrons})">
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

window.buyProduct = function(productId, title, priceMitrons) {
    log(`🛒 Выбран товар: ${title} (${priceMitrons} Mitron)`);
    if (buyBtn) buyBtn.click();
};

if (buyBtn) {
    buyBtn.addEventListener('click', async () => {
        const usernameInput = document.getElementById('buyerName');
        const sponsorInput = document.getElementById('buyerSponsor');
        
        const username = usernameInput ? usernameInput.value.trim() : `User_${Date.now()}`;
        const sponsor = sponsorInput ? sponsorInput.value.trim() : '';

        if (!username) {
            alert('Введите логин покупателя!');
            return;
        }

        buyBtn.disabled = true;
        log(`Запуск покупки Сертификата MITRON 1000 для: ${username}...`);

        try {
            const regRes = await fetch(`${API_URL}/shop/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, sponsor })
            });
            const regData = await regRes.json();

            if (!regRes.ok) {
                throw new Error(regData.error || 'Ошибка регистрации');
            }
            log(`✓ Клиент ${username} зарегистрирован в базе магазина.`);

            const payRes = await fetch(`${API_URL}/shop/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, amount: 10000 })
            });
            const payData = await payRes.json();

            if (!payRes.ok) {
                throw new Error(payData.error || 'Ошибка оплаты');
            }

            log(`💰 Оплата получена!`);
            log(`💸 Распределение: 55% через DAO Смарт-контракт / 45% в Административный кошелек`);
            log(`🟢 На Сайте 2 зарезервирована ячейка матрицы: ${payData.cellId}`);

        } catch (err) {
            log(`❌ Ошибка: ${err.message}`);
        } finally {
            buyBtn.disabled = false;
        }
    });
}

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
                const regRes = await fetch(`${API_URL}/shop/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: botName })
                });
                const regData = await regRes.json();

                if (!regRes.ok) {
                    log(`  ⚠️ Пропуск ${botName}: ${regData.error}`);
                    continue;
                }

                const payRes = await fetch(`${API_URL}/shop/pay`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: botName, amount: 10000 })
                });
                const payData = await payRes.json();

                if (payRes.ok) {
                    log(`  ✓ ${botName} оплатил. Встал в ячейку: ${payData.cellId}`);
                } else {
                    log(`  ❌ Ошибка оплаты для ${botName}: ${payData.error || ''}`);
                }

                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (err) {
                log(`  ❌ Системный сбой для ${botName}: ${err.message}`);
            }
        }

        log(`🤖 Работа робота завершена! Проверь Сайт 2.`);
        startRobotBtn.disabled = false;
    });
}

document.addEventListener('DOMContentLoaded', loadProducts);
