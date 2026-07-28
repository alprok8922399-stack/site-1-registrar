const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Настраиваем сервер так, чтобы он раздавал файлы из папки frontend
app.use(express.static(path.join(__dirname, '../frontend')));

let isRobotRunning = false;
let robotTimeout = null;
let liveLogs = [];

// Реальный адрес Сайта 2 на Render:
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

    // Генерируем размер пачки от 10 до 20, если не передан конкретный
    const batchSize = requestedBatchSize || Math.floor(Math.random() * 11) + 10;
    logEvent(`Старт порции: регистрируем ${batchSize} ботов...`);

    for (let i = 0; i < batchSize; i++) {
        if (!isRobotRunning) break;

        try {
            const botNumber = Math.floor(1000 + Math.random() * 9000);
            const botName = `AutoBot_${Date.now().toString().slice(-4)}_${botNumber}`;

            // 1. Регистрация бота в системе
            await fetch(`${SITE2_URL}/api/shop/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: botName })
            });

            // 2. Оплата сертификата ботом (посадка в матрицу и проведение покупки для аналитики)
            const res = await fetch(`${SITE2_URL}/api/shop/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: botName, amount: 1000 })
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

        // Пауза 100мс между ботами в пачке для стабильности
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (isRobotRunning) {
        // Пауза 3 секунды перед следующей порцией
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

// Отдаем index.html при переходе на корень сайта
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Заглушка для совместимости
app.post('/api/robot/heartbeat', (req, res) => {
    res.json({ success: true });
});

// API для отправки свежих логов на фронтенд
app.get('/api/robot/logs', (req, res) => {
    res.json({ logs: liveLogs });
});

// API для панели управления роботом
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
