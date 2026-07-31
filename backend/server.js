/**
 * Сервер моста и бизнес-логики (Сайт 1 — Маркетплейс)
 * Проект: MITRON
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const { getProductsCatalog, validateCartTotal } = require('./products');
const { calculatePurchaseFinance, logRefund, getRefundStats } = require('./finance');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Хранилище накопленных покупок по логинам (для соблюдения лимита макс 5000 M на логин)
const userPurchasesTotal = {};
const userOrdersStore = {};

// Универсальное определение пути к папке frontend для Render
function getFrontendPath() {
    const possiblePaths = [
        path.resolve(__dirname, '../frontend'),
        path.resolve(__dirname, '../../frontend'),
        path.resolve(process.cwd(), 'frontend'),
        path.resolve(process.cwd(), '../frontend')
    ];
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
    }
    return path.resolve(__dirname, '../../frontend');
}

const frontendPath = getFrontendPath();

// Разделы и статика
app.use(express.static(frontendPath));

let isRobotRunning = false;
let robotTimeout = null;
let liveLogs = [];

// Адрес Сайта 2 на Render
const SITE2_URL = 'https://site-2-tree.onrender.com';

function logEvent(message) {
    liveLogs.push(message);
    if (liveLogs.length > 100) {
        liveLogs.shift();
    }
    console.log(`[Робот] ${message}`);
}

async function registerBatch(requestedBatchSize) {
    if (!isRobotRunning) return;

    const batchSize = requestedBatchSize || Math.floor(Math.random() * 11) + 10;
    logEvent(`Старт порции: регистрируем ${batchSize} ботов...`);

    for (let i = 0; i < batchSize; i++) {
        if (!isRobotRunning) break;

        try {
            const botNumber = Math.floor(1000 + Math.random() * 9000);
            const botName = `AutoBot_${Date.now().toString().slice(-4)}_${botNumber}`;

            const res = await fetch(`${SITE2_URL}/api/shop/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: botName, cellsCount: 1, amountMitrons: 1000 })
            });

            const data = await res.json();
            if (data.success) {
                logEvent(`[${i + 1}/${batchSize}] Бот ${botName} встал в ячейку ${data.cellId || 'активирован'}`);
            } else {
                logEvent(`[${i + 1}/${batchSize}] Ошибка: ${data.error || 'Конец структуры'}`);
            }
        } catch (err) {
            logEvent(`Ошибка сети: ${err.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (isRobotRunning) {
        robotTimeout = setTimeout(() => registerBatch(), 3000);
    }
}

function startRobot(batchSize) {
    if (isRobotRunning) return;
    isRobotRunning = true;
    logEvent("Робот успешно запущен (порционный режим).");
    registerBatch(batchSize);
}

function stopRobot() {
    if (robotTimeout) {
        clearTimeout(robotTimeout);
        robotTimeout = null;
    }
    isRobotRunning = false;
    logEvent('Робот остановлен.');
}

// Корень сайта
app.get('/', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('Сайт 1 работает! Страница frontend/index.html загружается...');
    }
});

// API Каталога товаров
app.get('/api/products', (req, res) => {
    res.json(getProductsCatalog());
});

app.get('/api/shop/catalog', (req, res) => {
    res.json({ success: true, catalog: getProductsCatalog() });
});

// Регистрация профиля в магазине
app.post('/api/shop/register', async (req, res) => {
    const { username } = req.body || {};
    if (!username || !username.trim()) {
        return res.status(400).json({ success: false, error: 'Укажите логин покупателя' });
    }

    const cleanUser = username.trim();
    return res.json({ 
        success: true, 
        username: cleanUser,
        accumulatedMitrons: userPurchasesTotal[cleanUser] || 0,
        message: 'Регистрация успешна. Ожидайте оплаты товаров.' 
    });
});

// Получение списка заказов пользователя
app.get('/api/shop/orders', (req, res) => {
    const username = (req.query.username || '').trim();
    if (!username) {
        return res.status(400).json({ success: false, error: 'Укажите логин' });
    }
    const orders = userOrdersStore[username] || [];
    res.json({ success: true, orders });
});

// Проверка накопительного лимита пользователя
app.get('/api/shop/user-purchases/:username', (req, res) => {
    const cleanUser = (req.params.username || '').trim();
    const totalSpent = userPurchasesTotal[cleanUser] || 0;
    const orders = userOrdersStore[cleanUser] || [];
    res.json({
        success: true,
        username: cleanUser,
        totalSpent: totalSpent,
        remainingLimit: Math.max(0, 5000 - totalSpent),
        canBuy: totalSpent < 5000,
        orders: orders
    });
});

// Оплата и покупка
app.post('/api/shop/pay', async (req, res) => {
    const { username, amountMitrons, uplineUser } = req.body || {};
    if (!username || !username.trim()) {
        return res.status(400).json({ success: false, error: 'Укажите логин покупателя' });
    }

    const cleanUser = username.trim();
    const currentSpent = userPurchasesTotal[cleanUser] || 0;
    const total = amountMitrons || 1000;
    const validation = validateCartTotal(Number(total) || 0);

    if (!validation.valid) {
        return res.status(400).json({ 
            success: false, 
            error: validation.message,
            addons: validation.addons || []
        });
    }

    // Жесткая проверка накопительного лимита в 5000 M
    if (currentSpent + validation.totalMitrons > 5000) {
        const available = Math.max(0, 5000 - currentSpent);
        return res.status(400).json({
            success: false,
            error: `Превышен лимит! Вы уже приобрели на ${currentSpent} M. Ваша макс. доступная покупка: ${available} M (глобальный лимит 5000 M).`
        });
    }

    try {
        const site2Res = await fetch(`${SITE2_URL}/api/shop/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: cleanUser, 
                cellsCount: validation.cellsCount, 
                amountMitrons: validation.totalMitrons,
                uplineUser: uplineUser || null
            })
        });
        const site2Data = await site2Res.json();
        
        if (site2Data.error) {
            return res.status(400).json({ success: false, error: site2Data.error });
        }

        // Обновляем накопительный баланс пользователя
        userPurchasesTotal[cleanUser] = currentSpent + validation.totalMitrons;
        if (!userOrdersStore[cleanUser]) userOrdersStore[cleanUser] = [];
        userOrdersStore[cleanUser].push({
            id: Date.now(),
            totalMitrons: validation.totalMitrons,
            status: 'PAID',
            createdAt: new Date().toISOString()
        });

        // Передаем точную сумму покупки для корректного расчета финансов Админа
        const financeData = calculatePurchaseFinance(cleanUser, uplineUser, validation.totalMitrons);

        return res.json({ 
            success: true, 
            finance: financeData,
            shopUserStatus: { balance: 0 },
            accumulatedTotal: userPurchasesTotal[cleanUser],
            message: 'Оплата прошла успешно! Ваш заказ оформлен.'
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: `Ошибка при обработке заказа: ${err.message}` });
    }
});

// API Валидации Корзины
app.post('/api/shop/validate-cart', (req, res) => {
    const { totalMitrons } = req.body || {};
    const validation = validateCartTotal(Number(totalMitrons) || 0);
    res.json(validation);
});

app.post('/api/cart/validate', (req, res) => {
    const { totalMitrons } = req.body || {};
    const validation = validateCartTotal(Number(totalMitrons) || 0);
    res.json(validation);
});

// API Мультипокупки
app.post('/api/shop/checkout', async (req, res) => {
    const { username, totalMitrons, cartItems, uplineUser } = req.body || {};
    
    if (!username || !username.trim()) {
        return res.status(400).json({ success: false, error: "Укажите логин покупателя" });
    }

    const cleanUser = username.trim();
    const currentSpent = userPurchasesTotal[cleanUser] || 0;
    const validation = validateCartTotal(Number(totalMitrons) || 0);

    if (!validation.valid) {
        return res.status(400).json({ 
            success: false, 
            error: validation.message,
            addons: validation.addons || []
        });
    }

    // Жесткая проверка накопительного лимита в 5000 M
    if (currentSpent + validation.totalMitrons > 5000) {
        const available = Math.max(0, 5000 - currentSpent);
        return res.status(400).json({
            success: false,
            error: `Превышен лимит! Вы уже купили на ${currentSpent} M. Допустимая сумма покупки до 5000 M составляет: ${available} M.`
        });
    }

    try {
        const site2Res = await fetch(`${SITE2_URL}/api/shop/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: cleanUser,
                cellsCount: validation.cellsCount,
                amountMitrons: validation.totalMitrons,
                cartItems: cartItems || [],
                uplineUser: uplineUser || null
            })
        });

        const site2Data = await site2Res.json();
        if (site2Data.success) {
            // Увеличиваем накопленный объем покупок
            userPurchasesTotal[cleanUser] = currentSpent + validation.totalMitrons;
            if (!userOrdersStore[cleanUser]) userOrdersStore[cleanUser] = [];
            
            const newOrder = {
                id: Date.now(),
                totalMitrons: validation.totalMitrons,
                items: cartItems || [],
                status: 'PAID',
                createdAt: new Date().toISOString()
            };
            userOrdersStore[cleanUser].push(newOrder);

            logEvent(`Покупатель ${cleanUser} совершил покупку на ${validation.totalMitrons} M`);
            
            // Расчет с учетом полной суммы заказа
            const financeData = calculatePurchaseFinance(cleanUser, uplineUser, validation.totalMitrons);
            
            return res.json({ 
                success: true, 
                order: newOrder,
                finance: financeData,
                accumulatedTotal: userPurchasesTotal[cleanUser],
                message: "Заказ успешно оплачен и оформлен!" 
            });
        } else {
            return res.status(500).json({ success: false, error: site2Data.error || "Ошибка при оформлении заказа" });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: `Ошибка при проведении покупки: ${err.message}` });
    }
});

// Регистрация отказа от покупки и передача сигнала на Сайт 2
app.post('/api/shop/refund', async (req, res) => {
    const { username, orderId, amount } = req.body || {};
    if (!username) {
        return res.status(400).json({ success: false, error: "Укажите логин" });
    }
    const cleanUser = username.trim();
    const refundAmount = amount || 1000;

    logRefund(cleanUser, refundAmount);

    // Передаем команду отмены на Сайт 2 (передача ячеек Администрации)
    try {
        await fetch(`${SITE2_URL}/api/admin/refund-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanUser })
        });
    } catch (e) {
        console.error('Ошибка отправки сигнала отмены на Сайт 2:', e);
    }

    // Обновляем статус заказа
    if (userOrdersStore[cleanUser]) {
        userOrdersStore[cleanUser] = userOrdersStore[cleanUser].map(o => {
            if (String(o.id) === String(orderId) || !orderId) {
                return { ...o, status: 'REFUNDED' };
            }
            return o;
        });
    }

    // Сбрасываем/уменьшаем накопленную сумму покупок при отказе
    if (userPurchasesTotal[cleanUser]) {
        userPurchasesTotal[cleanUser] = Math.max(0, userPurchasesTotal[cleanUser] - refundAmount);
    }
    
    res.json({ 
        success: true, 
        message: "Отказ зафиксирован, средства возвращены, ячейка перешла Администрации.",
        accumulatedTotal: userPurchasesTotal[cleanUser] || 0
    });
});

// Получение статистики по отказам (включая СЕГОДНЯ за 24 часа)
app.get('/api/shop/refund-stats', (req, res) => {
    res.json({ success: true, stats: getRefundStats() });
});

// Панель робота
app.get('/api/robot/logs', (req, res) => {
    res.json({ logs: liveLogs });
});

app.get('/api/robot/status', (req, res) => {
    res.json({ active: isRobotRunning, running: isRobotRunning, logs: liveLogs });
});

app.get('/api/test-bot/status', (req, res) => {
    res.json({ active: isRobotRunning, running: isRobotRunning, logs: liveLogs });
});

app.post('/api/robot/start', (req, res) => {
    const { batchSize } = req.body || {};
    startRobot(batchSize);
    res.json({ success: true, running: true, active: true });
});

app.post('/api/test-bot/start', (req, res) => {
    const { batchSize } = req.body || {};
    startRobot(batchSize);
    res.json({ success: true, running: true, active: true });
});

app.post('/api/robot/stop', (req, res) => {
    stopRobot();
    res.json({ success: true, running: false, active: false });
});

app.post('/api/test-bot/stop', (req, res) => {
    stopRobot();
    res.json({ success: true, running: false, active: false });
});

app.listen(PORT, () => console.log(`Site 1 Bridge Server running on port ${PORT}`));
