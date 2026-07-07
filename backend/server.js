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
let robotInterval = null;
const SITE2_URL = 'http://localhost:5000';

function startRobot() {
    if (robotInterval) return;
    isRunning = true; // Для совместимости со старым кодом
    isRobotRunning = true;
    
    robotInterval = setInterval(async () => {
        try {
            const botNumber = Math.floor(1000 + Math.random() * 9000);
            const botName = `AutoBot_${botNumber}`;

            // 1. Регистрация бота в магазине
            await fetch(`${SITE2_URL}/api/shop/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: botName })
            });
            
            // 2. Оплата товара ботом
            const res = await fetch(`${SITE2_URL}/api/shop/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: botName, amount: 10000 })
            });
            
            const data = await res.json();
            if (data.success) {
                console.log(`[Робот] Бот ${botName} встал в ячейку ${data.cellId}`);
            } else {
                console.log(`[Робот] Ошибка: ${data.error || 'Конец матрицы'}`);
            }
        } catch (err) {
            console.error('[Робот] Ошибка сети:', err.message);
        }
    }, 4000);
}

function stopRobot() {
    if (robotInterval) {
        clearInterval(robotInterval);
        robotInterval = null;
    }
    isRobotRunning = false;
    console.log('[Робот] Остановлен.');
}

// Отдаем index.html при переходе на корень сайта
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// API для панели управления роботом
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
