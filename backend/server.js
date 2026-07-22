const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const { calculatePurchaseFinance } = require('./finance');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Настраиваем сервер так, чтобы он раздавал файлы из папки frontend
app.use(express.static(path.join(__dirname, '../frontend')));

let isRobotRunning = false;
let robotInterval = null;
let liveLogs = [];

// Реальный адрес Сайта 2 на Render:
const SITE2_URL = 'https://site-2-tree.onrender.com';

function logEvent(message) {
    liveLogs.push(message);
    if (liveLogs.length > 100) {
        liveLogs.shift();
    }
    console.log(`[Сайт 1] ${message}`);
}

function startRobot() {
    if (robotInterval) return;
    isRobotRunning = true;
    
    logEvent("Робот успешно запущен.");
    
    robotInterval = setInterval(async () => {
        try {
            // Уникальный ID для бота на основе времени и случайного числа
            const botNumber = Math.floor(1000 + Math.random() * 9000);
            const botName = `AutoBot_${Date.now().toString().slice(-4)}_${botNumber}`;

            // 1. Расчет финансовой модели (1000 Митронов)
            const finData = calculatePurchaseFinance(botName, 'System');
            logEvent(`💳 [Финансы] ${botName}: 450M -> Админ, 550M -> DAO, 450M -> Логистика (Таймер: ${finData.timerDays} дн.)`);

            // 2. Регистрация бота на Сайте 2
            await fetch(`${SITE2_URL}/api/shop/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: botName, sponsor: 'System' })
            });
            
            // 3. Посадка в матрицу (Сайт 2)
            const res = await fetch(`${SITE2_URL}/api/shop/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: botName, amount: 10000 })
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
    logEvent('Робот остановлен.');
}

// Отдаем index.html при переходе на корень сайта
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Эндпоинты обработки ручной покупки с финансовым расчетом
app.post('/api/shop/register', async (req, res) => {
    try {
        const response = await fetch(`${SITE2_URL}/api/shop/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/shop/pay', async (req, res) => {
    try {
        const { username, sponsor } = req.body;
        
        // Проводим финансовый расчет
        const finData = calculatePurchaseFinance(username, sponsor);
        logEvent(`💰 [Покупка] ${username}: 450M -> Админ, 550M -> DAO (Спонсор: ${finData.distribution.daoMarketing.directSponsor.recipient})`);

        // Передаем команду посадки в матрицу на Сайт 2
        const response = await fetch(`${SITE2_URL}/api/shop/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, amount: 10000 })
        });
        
        const data = await response.json();
        res.status(response.status).json({
            ...data,
            finance: finData
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API управления логированием и роботом
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
