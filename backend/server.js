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

function startRobot() {
    if (robotInterval) return;
    isRobotRunning = true;
    
    logEvent("Робот успешно запущен.");
    
    robotInterval = setInterval(async () => {
        try {
            // Уникальный ID для бота на основе времени и случайного числа
            const botNumber = Math.floor(1000 + Math.random() * 9000);
            const botName = `AutoBot_${Date.now().toString().slice(-4)}_${botNumber}`;

            // 1. Регистрация бота в магазине
            await fetch(`${SITE2_URL}/api/shop/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: botName })
            });
            
            // 2. Оплата товара ботом (посадка в матрицу)
            const res = await fetch(`${SITE2_URL}/api/shop/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: botName, amount: 10000 })
            });
            
            const data = await res.json();
            if (data.success) {
                logEvent(`Бот ${botName} встал в ячейку ${data.cellId}`);
            } else {
                logEvent(`Ошибка: ${data.error || 'Конец матрицы'}`);
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
    startRobot();
    res.json({ success: true, running: true });
});

app.post('/api/robot/stop', (req, res) => {
    stopRobot();
    res.json({ success: true, running: false });
});

app.listen(PORT, () => console.log(`Site 1 Bridge Server running on port ${PORT}`));
