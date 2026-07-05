const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Разрешаем CORS, чтобы твоя рабочая админка без проблем читала данные
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Глобальная база с уже предустановленными тремя муляжами для красивого старта картинки
let treeDatabase = {
    "A1": { id: "A1", user: "GUEST_1", parent: null },
    "B1": { id: "B1", user: "GUEST_2", parent: "A1" },
    "B2": { id: "B2", user: "GUEST_3", parent: "A1" }
};

let isRobotRunning = false;
let robotUserIndex = 1;
let robotTimer = null;

// Идентичная фронтенду логика генерации следующего уровня букв (A -> B -> C ... Z -> AA)
function getNextLevelLetter(letter) {
    let i = letter.length - 1;
    while (i >= 0) {
        if (letter[i] !== 'Z') {
            return letter.substring(0, i) + String.fromCharCode(letter.charCodeAt(i) + 1) + 'A'.repeat(letter.length - 1 - i);
        }
        i--;
    }
    return 'A'.repeat(letter.length + 1);
}

// Поиск первой свободной рабочей ячейки. Пропускает заполненные муляжи и идет строго по правилам дерева
function findFirstEmptyCellId() {
    let queue = ["A1"];
    let visited = new Set();

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const cell = treeDatabase[currentId];
        // Если ячейка пустая — это наша цель! (Для старта это будет C1, так как A1, B1, B2 уже заняты муляжами)
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
    return "C1";
}

// Отдача дерева для админки
app.get('/api/tree', (req, res) => {
    res.json(treeDatabase);
});

// Регистрация на Маркетплейсе
app.post('/api/shop/register', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Имя не указано' });
    
    const exists = Object.values(treeDatabase).some(cell => cell && cell.user === username);
    if (exists) return res.json({ error: 'Пользователь уже зарегистрирован' });

    res.json({ success: true, username });
});

// Покупка товара и автоматическая расстановка
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

// Сброс базы данных обратно к трем стартовым муляжам
app.post('/api/reset', (req, res) => {
    treeDatabase = {
        "A1": { id: "A1", user: "GUEST_1", parent: null },
        "B1": { id: "B1", user: "GUEST_2", parent: "A1" },
        "B2": { id: "B2", user: "GUEST_3", parent: "A1" }
    };
    robotUserIndex = 1;
    res.json({ success: true });
});

// Запуск серверного автомата тестирования
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
        
        robotTimer = setTimeout(cycle, 2000); // Каждые 2 секунды новая покупка
    }
    cycle();
    res.json({ status: 'started' });
});

// Остановить робота
app.get('/api/robot/stop', (req, res) => {
    isRobotRunning = false;
    if (robotTimer) clearTimeout(robotTimer);
    res.json({ status: 'stopped' });
});

app.get('/', (req, res) => {
    res.send('<h1>Сервер Сайта №1 обновлен под муляжи и синхронизирован с фронтендом!</h1>');
});

app.listen(port, () => {
    console.log(`Сервер работает на порту ${port}`);
});
