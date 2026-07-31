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

    return res.json({ 
        success: true, 
        username: username.trim(),
        message: 'Регистрация успешна. Ожидайте оплаты товаров.' 
    });
});

// Оплата и покупка
app.post('/api/shop/pay', async (req, res) => {
    const { username, amountMitrons, uplineUser } = req.body || {};
    if (!username || !username.trim()) {
        return res.status(400).json({ success: false, error: 'Укажите логин покупателя' });
    }

    const total = amountMitrons || 1000;
    const validation = validateCartTotal(Number(total) || 0);

    if (!validation.valid) {
        return res.status(400).json({ 
            success: false, 
            error: validation.message,
            addons: validation.addons || []
        });
    }

    try {
        const site2Res = await fetch(`${SITE2_URL}/api/shop/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: username.trim(), 
                cellsCount: validation.cellsCount, 
                amountMitrons: validation.totalMitrons,
                uplineUser: uplineUser || null
            })
        });
        const site2Data = await site2Res.json();
        
        if (site2Data.error) {
            return res.status(400).json({ success: false, error: site2Data.error });
        }

        const financeData = calculatePurchaseFinance(username.trim(), uplineUser);

        return res.json({ 
            success: true, 
            finance: financeData,
            shopUserStatus: { balance: 0 },
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

    const validation = validateCartTotal(Number(totalMitrons) || 0);
    if (!validation.valid) {
        return res.status(400).json({ 
            success: false, 
            error: validation.message,
            addons: validation.addons || []
        });
    }

    try {
        const site2Res = await fetch(`${SITE2_URL}/api/shop/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: username.trim(),
                cellsCount: validation.cellsCount,
                amountMitrons: validation.totalMitrons,
                cartItems: cartItems || [],
                uplineUser: uplineUser || null
            })
        });

        const site2Data = await site2Res.json();
        if (site2Data.success) {
            logEvent(`Покупатель ${username.trim()} совершил покупку на ${validation.totalMitrons} M`);
            const financeData = calculatePurchaseFinance(username.trim(), uplineUser);
            return res.json({ 
                success: true, 
                finance: financeData,
                message: "Заказ успешно оплачен и оформлен!" 
            });
        } else {
            return res.status(500).json({ success: false, error: site2Data.error || "Ошибка при оформлении заказа" });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: `Ошибка при проведении покупки: ${err.message}` });
    }
});

// Регистрация отказа от покупки
app.post('/api/shop/refund', (req, res) => {
    const { username, amount } = req.body || {};
    if (!username) {
        return res.status(400).json({ success: false, error: "Укажите логин" });
    }
    logRefund(username, amount || 1000);
    res.json({ success: true, message: "Отказ зафиксирован" });
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
