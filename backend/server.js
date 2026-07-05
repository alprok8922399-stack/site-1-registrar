const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Специальное разрешение (CORS), чтобы Сайт №2 (Админка) 
// мог свободно забирать данные матрицы и показывать её на телефоне
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Наша глобальная база данных дерева в оперативной памяти
let treeDatabase = {
    "A1": { id: "A1", user: null, parent: null }
};

// Робот-автомат (перенесён на бэкенд, чтобы не зависеть от телефона)
let isRobotRunning = false;
let robotUserIndex = 1;
let robotTimer = null;

const LEVELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function getNextLevelLetter(letter) {
    const idx = LEVELS.indexOf(letter);
    if (idx === -1 || idx === LEVELS.length - 1) return letter;
    return LEVELS[idx + 1];
}

// Поиск первой свободной ячейки сверху вниз, слева направо (BFS через стек/очередь)
function findFirstEmptyCellId() {
    let queue = ["A1"];
    let visited = new Set();

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const cell = treeDatabase[currentId];
        if (!cell || !cell.user) {
            return currentId;
        }

        const match = currentId.match(/^([A-Z]+)(\d+)$/);
        if (match) {
            const letter = match[1];
            const num = parseInt(match[2], 10);
            
            const nextLetter = getNextLevelLetter(letter);
            const leftChildId = `${nextLetter}${num * 2 - 1}`;
            const rightChildId = `${nextLetter}${num * 2}`;

            if (!treeDatabase[leftChildId]) {
                treeDatabase[leftChildId] = { id: leftChildId, user: null, parent: currentId };
            }
            if (!treeDatabase[rightChildId]) {
                treeDatabase[rightChildId] = { id: rightChildId, user: null, parent: currentId };
            }

            queue.push(leftChildId);
            queue.push(rightChildId);
        }
    }
    return "A1";
}

// Эндпоинт получения всей матрицы для Админки
app.get('/api/tree', (req, res) => {
    res.json(treeDatabase);
});

// Имитация регистрации на Маркетплейсе
app.post('/api/shop/register', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Имя не указано' });
    
    // Проверяем, нет ли уже такого юзера в матрице
    const exists = Object.values(treeDatabase).some(cell => cell && cell.user === username);
    if (exists) return res.json({ error: 'Пользователь уже зарегистрирован' });

    res.json({ success: true, username });
});

// Имитация оплаты товара и вставки в матрицу
app.post('/api/shop/pay', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Имя не указано' });

    const targetId = findFirstEmptyCellId();
    if (!treeDatabase[targetId]) {
        treeDatabase[targetId] = { id: targetId, user: null, parent: null };
    }
    
    treeDatabase[targetId].user = username;
    res.json({ success: true, cellId: targetId, user: username });
});

// Сброс базы данных
app.post('/api/reset', (req, res) => {
    treeDatabase = {
        "A1": { id: "A1", user: null, parent: null }
    };
    robotUserIndex = 1;
    res.json({ success: true });
});

// Управление роботом прямо с сервера (для тестов без сбоев связи)
app.get('/api/robot/start', (req, res) => {
    if (isRobotRunning) return res.json({ status: 'already_running' });
    isRobotRunning = true;
    
    function cycle() {
        if (!isRobotRunning) return;
        const name = `AutoUser_${robotUserIndex}`;
        const targetId = findFirstEmptyCellId();
        
        if (!treeDatabase[targetId]) {
            treeDatabase[targetId] = { id: targetId, user: null, parent: null };
        }
        treeDatabase[targetId].user = name;
        robotUserIndex++;
        
        robotTimer = setTimeout(cycle, 1500);
    }
    cycle();
    res.json({ status: 'started' });
});

app.get('/api/robot/stop', (req, res) => {
    isRobotRunning = false;
    if (robotTimer) clearTimeout(robotTimer);
    res.json({ status: 'stopped' });
});

app.get('/', (req, res) => {
    res.send('<h1>Сайт №1 (Магазин и Бэкенд) успешно работает!</h1><p>Админка теперь может подключаться.</p>');
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});
