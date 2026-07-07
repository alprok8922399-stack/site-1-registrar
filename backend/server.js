const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Жесткая привязка к папке frontend на уровень выше от текущего файла backend
const frontendPath = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendPath));

let isRobotRunning = false;
let robotInterval = null;
const SITE2_URL = 'http://localhost:5000';

function startRobot() {
    if (robotInterval) return;
    isRobotRunning = true;
    
    robotInterval = setInterval(async () => {
        try {
            const botNumber = Math.floor(1000 + Math.random() * 9000);
            const botName = `AutoBot_${botNumber}`;

            await fetch(`${SITE2_URL}/api/shop/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: botName })
            });
            
            const res = await fetch(`${SITE2_URL}/api/shop/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: botName, amount: 10000 })
            });
            
            const data = await res.json();
            if (data.success) {
                console.log(`[Робот] Успешно провел покупку для ${botName}. Встал в ячейку ${data.cellId}`);
            } else {
                console.log(`[Робот] Не удалось распределить: ${data.error || 'Конец матрицы'}`);
            }
        } catch (err) {
            console.error('[Робот] Ошибка генерации трафика:', err.message);
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

// Главная страница отдает index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
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

app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`🚀 Сайт 1 запущен на http://localhost:${PORT}`);
    console.log(`📂 Папка фронтенда: ${frontendPath}`);
    console.log(`===================================================`);
});
