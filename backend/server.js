const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const { calculatePurchaseFinance } = require('./finance');
const { getProductsCatalog } = require('./products');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Размещение статических файлов фронтенда
app.use(express.static(path.join(__dirname, '../frontend')));

let isRobotRunning = false;
let robotInterval = null;
let liveLogs = [];

// Адрес Сайта 2 на Render
const SITE2_URL = 'https://site-2-tree.onrender.com';

function logEvent(message) {
    liveLogs.push(message);
    if (liveLogs.length > 100) {
        liveLogs.shift();
    }
    console.log(`[Сайт 1] ${message}`);
}

// Запуск бота-генератора с правильным сплитом 1000M
function startRobot() {
    if (robotInterval) return;
    isRobotRunning = true;
    
    logEvent("Генератор успешно запущен.");
    
    robotInterval = setInterval(async () => {
        try {
            const botNumber = Math.floor(1000 + Math.random() * 9000);
            const botName = `AutoBot_${Date.now().toString().slice(-4)}_${botNumber}`;

            // Сплит 1000 M: 450M Поставщик | 550M Система (250M Матрица + 70M Реферальные резервы + 230M Доход)
            logEvent(`💳 [Покупка 1000M] ${botName}: 450M -> Маркетплейс | 250M -> Матрица | 70M -> Резерв 31дн (50/10/10) | 230M -> Доход`);

            // Регистрация и посадка в матрицу на Сайте 2
            const res = await fetch(`${SITE2_URL}/api/shop/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: botName, sponsor: 'System' })
            });
            
            const data = await res.json();
            if (res.ok && data.success) {
                logEvent(`🟢 Бот ${botName} встал в ячейку ${data.cellId || 'OK'}`);
            } else {
                logEvent(`⚠️ Ответ Сайта 2: ${data.error || 'Занято или завершено'}`);
            }
        } catch (err) {
            logEvent(`❌ Ошибка сети: ${err.message}`);
        }
    }, 4000);
}

function stopRobot() {
    if (robotInterval) {
        clearInterval(robotInterval);
        robotInterval = null;
    }
    isRobotRunning = false;
    logEvent('Генератор остановлен.');
}

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Каталог товаров с коэффициентом 2.2
app.get('/api/products', (req, res) => {
    try {
        const catalog = getProductsCatalog();
        res.json({ success: true, products: catalog });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Обработка оплаты корзины с проверкой диапазона (990 M - 1000 M)
app.post('/api/cart/checkout', async (req, res) => {
    try {
        const { username, sponsor, cartTotal, customerDetails } = req.body;
        const total = parseFloat(cartTotal);

        // Проверка допустимого разбега цены: от 990 M до 1000 M
        if (isNaN(total) || total < 990 || total > 1000) {
            const diff = (1000 - (total || 0)).toFixed(2);
            return res.status(400).json({
                success: false,
                error: `Недопустимая сумма корзины (${total || 0} M). Вам необходимо заполнить корзину ещё на ${diff > 0 ? diff : 0} Митронов (диапазон от 990 M до 1000 M).`
            });
        }

        // 1. Отправка 450M на внешний маркетплейс (авто-покупка с данными покупателя)
        logEvent(`🛒 [Внешний Маркетплейс] Заказ для ${username} передан поставщику (450M). Данные доставки: ${JSON.stringify(customerDetails || {})}`);

        // 2. Распределение 550M (250M в Матрицу, 70M Резерв лидерам, 230M Доход)
        logEvent(`💰 [Финансовый сплит 1000M] ${username}: 450M Поставщик | 250M Матрица | 70M Резерв (50/10/10) | 230M Доход`);

        // 3. Отправка сигнала на Сайт 2 для постановки в ячейку
        const response = await fetch(`${SITE2_URL}/api/shop/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, sponsor: sponsor || 'System' })
        });
        
        const data = await response.json();
        res.status(response.status).json({
            success: true,
            message: 'Оплата успешно произведена',
            treeResponse: data,
            split: {
                supplier: 450,
                matrixReserve: 250,
                referralReserve: 70,
                profit: 230
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Совместимость с прошлыми ручными запросами
app.post('/api/shop/register', async (req, res) => {
    try {
        const { username, sponsor } = req.body;
        logEvent(`💰 [Покупка] ${username}: 450M -> Поставщик, 550M -> Система`);

        const response = await fetch(`${SITE2_URL}/api/shop/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, sponsor })
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Логи и статус
app.get('/api/robot/logs', (req, res) => {
    res.json({ logs: liveLogs });
});

app.get('/api/robot/status', (req, res) => {
    res.json({ running: isRobotRunning });
});

app.post('/api/robot/start', (req, res) => {
    startRobot();
    res.json({ success: true, running: true });
});

app.post('/api/robot/stop', (req, res) => {
    stopRobot();
    res.json({ success: true, running: false });
});

app.listen(PORT, () => console.log(`Site 1 Bridge Server running on port ${PORT}`));
