const API_URL = '/api';
const logBox = document.getElementById('logBox');
const buyBtn = document.getElementById('buyBtn');
const startRobotBtn = document.getElementById('startRobotBtn');

// Вспомогательная функция для вывода логов на экран телефона
function log(message) {
    const time = new Date().toLocaleTimeString();
    logBox.innerHTML += `[${time}] ${message}\n`;
    logBox.scrollTop = logBox.scrollHeight;
}

// --- КНОПКА: ИМИТАЦИЯ РУЧНОЙ ПОКУПКИ ---
buyBtn.addEventListener('click', async () => {
    const username = document.getElementById('buyerName').value.trim();
    const sponsor = document.getElementById('buyerSponsor').value.trim();

    if (!username) {
        alert('Введите логин покупателя!');
        return;
    }

    buyBtn.disabled = true;
    log(`Запуск покупки для: ${username}...`);

    try {
        // 1. Регистрируем покупателя в базе магазина
        const regRes = await fetch(`${API_URL}/shop/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, sponsor })
        });
        const regData = await regRes.json();

        if (!regRes.ok) {
            throw new Error(regData.error || 'Ошибка регистрации');
        }
        log(`✓ Клиент ${username} зарегистрирован в магазине.`);

        // 2. Имитируем оплату
        const payRes = await fetch(`${API_URL}/shop/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, amount: 10000 })
        });
        const payData = await payRes.json();

        if (!payRes.ok) {
            throw new Error(payData.error || 'Ошибка оплаты');
        }

        log(`💰 Оплата 10 000 руб. получена!`);
        log(`💸 Сплит: на Маркетплейс отправлено 7 000 руб., в твой кошелек — 3 000 руб.`);
        log(`🟢 На Сайте 2 зарезервирована ячейка: ${payData.cellId}`);

    } catch (err) {
        log(`❌ Ошибка: ${err.message}`);
    } finally {
        buyBtn.disabled = false;
    }
});

// --- КНОПКА: ЗАПУСК РОБОТА ---
startRobotBtn.addEventListener('click', async () => {
    const prefix = document.getElementById('botPrefix').value.trim() || 'Bot_';
    const count = parseInt(document.getElementById('botCount').value, 10) || 5;

    startRobotBtn.disabled = true;
    log(`🤖 Робот запущен. Генерируем цепочку из ${count} ботов...`);

    for (let i = 1; i <= count; i++) {
        // Генерируем случайное число для уникальности имени бота
        const randId = Math.floor(1000 + Math.random() * 9000);
        const botName = `${prefix}${randId}`;

        log(`➡️ [${i}/${count}] Обработка ${botName}...`);

        try {
            // Регистрируем бота на сервере магазина
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

            // Бот совершает покупку
            const payRes = await fetch(`${API_URL}/shop/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: botName, amount: 10000 })
            });
            const payData = await payRes.json();

            if (payRes.ok) {
                log(`  ✓ ${botName} оплатил. Встал в ячейку: ${payData.cellId}`);
            } else {
                log(`  ❌ Ошибка оплаты для ${botName}`);
            }

            // Небольшая пауза, чтобы не перегружать телефон и сервер
            await new Promise(resolve => setTimeout(resolve, 800));

        } catch (err) {
            log(`  ❌ Системный сбой для ${botName}: ${err.message}`);
        }
    }

    log(`🤖 Работа робота завершена! Проверь Сайт 2 — там всё пришло в движение.`);
    startRobotBtn.disabled = false;
});
