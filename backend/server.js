const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const { getProductsCatalog } = require('./products');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Раздача статики фронтенда
app.use(express.static(path.join(__dirname, '../frontend')));

let isRobotRunning = false;
let robotInterval = null;
let liveLogs = [];

// Адрес Сайта 2 на Render:
const SITE2_URL = 'https://site-2-tree.onrender.com';

function logEvent(message) {
    liveLogs.push(message);
    if (liveLogs.length > 100) {
        liveLogs.shift();
    }
    console.log(`[Робот] ${message}`);
}

function startRobot() {
    if (robotInterval) return;
    isRobotRunning = true;
    
    logEvent("Робот успешно запущен.");
    
    robotInterval = setInterval(async () => {
        try {
            // Гарантированно уникальное имя бота с использованием высокой точности времени и случайного ID
            const uniqueSuffix = `${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`;
            const botName = `AutoBot_${uniqueSuffix}`;

            // 1. Регистрация уникального бота
            const regRes = await fetch(`${SITE2_URL}/api/shop/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: botName })
            });

            if (!regRes.ok) {
                const regData = await regRes.json();
                logEvent(`Ошибка регистрации: ${regData.error || 'Неизвестная ошибка'}`);
                return;
            }
            
            // 2. Оплата и посадкa бота в матрицу
            const payRes = await fetch(`${SITE2_URL}/api/shop/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: botName, amount: 10000 })
            });
            
            const payData = await payRes.json();
            if (payData.success) {
                logEvent(`✓ Бот ${botName} встал в ячейку ${payData.cellId}`);
            } else {
                logEvent(`Ошибка оплаты: ${payData.error || 'Не удалось занять место'}`);
            }
        } catch (err) {
            logEvent(`Ошибка сети: ${err.message}`);
        }
    }, 4000);
}

function stopRobot() {
    if (robotInterval) {
        clearInterval(robotInterval);
        robotInterval = null;
    }
    isRobotRunning = false;
    logEvent('Робот остановлен.');
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/api/products', (req, res) => {
    try {
        const catalog = getProductsCatalog();
        res.json({ success: true, products: catalog });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/robot/heartbeat', (req, res) => {
    res.json({ success: true });
});

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
