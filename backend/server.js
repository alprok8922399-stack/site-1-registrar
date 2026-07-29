/**
 * Сервер моста и бизнес-логики (Сайт 1 — Маркетплейс)
 * Проект: MITRON
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const { getProductsCatalog, validateCartTotal } = require('./products');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Разделы и статика
app.use(express.static(path.join(__dirname, '../frontend')));

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
                logEvent(`[${i + 1}/${batchSize}] Ошибка: ${data.error || 'Конец матрицы'}`);
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
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Регистрация профиля в магазине
app.post('/api/shop/register', async (req, res) => {
    const { username } = req.body || {};
    if (!username || !username.trim()) {
        return res.status(400).json({ error: 'Логин обязателен' });
    }

    return res.json({ 
        success: true, 
        message: 'Регистрация успешна. Ожидайте оплаты товаров.' 
    });
});

// Оплата и активация ячейки
app.post('/api/shop/pay', async (req, res) => {
    const { username, amountMitrons } = req.body || {};
    if (!username || !username.trim()) {
        return res.status(400).json({ error: 'Логин обязателен' });
    }

    const total = amountMitrons || 1000;
    const validation = validateCartTotal(Number(total) || 0);

    if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
    }

    try {
        const site2Res = await fetch(`${SITE2_URL}/api/shop/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: username.trim(), 
                cellsCount: validation.cellsCount, 
                amountMitrons: validation.totalMitrons 
            })
        });
        const site2Data = await site2Res.json();
        
        if (site2Data.error) {
            return res.status(400).json({ error: site2Data.error });
        }

        return res.json({ 
            success: true, 
            cellId: site2Data.cellId || 'A1',
            cellsCount: validation.cellsCount,
            shopUserStatus: { balance: 0 }
        });
    } catch (err) {
        return res.status(500).json({ error: `Ошибка связи с Сайтом 2: ${err.message}` });
    }
});

// API Каталога
app.get('/api/shop/catalog', (req, res) => {
    res.json({ success: true, catalog: getProductsCatalog() });
});

// API Валидации Корзины
app.post('/api/shop/validate-cart', (req, res) => {
    const { totalMitrons } = req.body || {};
    const validation = validateCartTotal(Number(totalMitrons) || 0);
    res.json(validation);
});

// API Мультипокупки и передачи ячеек на Сайт 2
app.post('/api/shop/checkout', async (req, res) => {
    const { username, totalMitrons, cartItems, uplineUser } = req.body || {};
    
    if (!username || !username.trim()) {
        return res.status(400).json({ success: false, error: "Укажите имя/логин покупателя" });
    }

    const validation = validateCartTotal(Number(totalMitrons) || 0);
    if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.message });
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
            logEvent(`Покупатель ${username} совершил покупку на ${validation.totalMitrons} M и занял ${validation.cellsCount} яч. на Сайте 2`);
            return res.json({ 
                success: true, 
                cellsCount: validation.cellsCount,
                cellId: site2Data.cellId,
                message: `Оплата успешна! Вы зарезервировали ${validation.cellsCount} яч. в матрице.` 
            });
        } else {
            return res.status(500).json({ success: false, error: site2Data.error || "Ошибка при регистрации в матрице" });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: `Ошибка связи с Сайтом 2: ${err.message}` });
    }
});

// Панель робота
app.get('/api/robot/logs', (req, res) => {
    res.json({ logs: liveLogs });
});

app.get('/api/robot/status', (req, res) => {
    res.json({ running: isRobotRunning });
});

app.post('/api/robot/start', (req, res) => {
    const { batchSize } = req.body || {};
    startRobot(batchSize);
    res.json({ success: true, running: true });
});

app.post('/api/robot/stop', (req, res) => {
    stopRobot();
    res.json({ success: true, running: false });
});

app.listen(PORT, () => console.log(`Site 1 Bridge Server running on port ${PORT}`));
