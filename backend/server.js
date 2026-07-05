const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Разрешаем CORS-запросы, чтобы ваш рабочий фронтенд мог свободно забирать матрицу
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Глобальная база данных с тремя предустановленными муляжами для правильного отображения картинки
let treeDatabase = {
    "A1": { id: "A1", user: "МУЛЯЖ_1", parent: null },
    "B1": { id: "B1", user: "МУЛЯЖ_2", parent: "A1" },
    "B2": { id: "B2", user: "МУЛЯЖ_3", parent: "A1" }
};

let isRobotRunning = false;
let robotUserIndex = 1;
let robotTimer = null;

// Точная копия функции генерации уровней букв из вашего фронтенда (A -> B -> C ... Z -> AA)
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

// Поиск первой свободной ячейки по алгоритму бинарного дерева. Пропускает занятые муляжи
function findFirstEmptyCellId() {
    let queue = ["A1"];
    let visited = new Set();

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const cell = treeDatabase[currentId];
        // Если ячейка пустая — это наше целевое место. Благодаря муляжам, первыми заполнятся C1, C2, C3, C4
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

// Эндпоинт получения дерева для админки
app.get('/api/tree', (req, res) => {
    res.json(treeDatabase);
});

// Имитация регистрации
app.post('/api/shop/register', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Имя не указано' });
    
    const exists = Object.values(treeDatabase).some(cell => cell && cell.user === username);
    if (exists) return res.json({ error: 'Пользователь уже зарегистрирован' });

    res.json({ success: true, username });
});

// Имитация покупки товара и автоматической вставки в дерево
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
        "A1": { id: "A1", user: "МУЛЯЖ_1", parent: null },
        "B1": { id: "B1", user: "МУЛЯЖ_2", parent: "A1" },
        "B2": { id: "B2", user: "МУЛЯЖ_3", parent: "A1" }
    };
    robotUserIndex = 1;
    res.json({ success: true });
});

// Запуск серверного робота-автомата
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
        
        robotTimer = setTimeout(cycle, 2000); // Интервал в 2 секунды для стабильного обновления экрана
    }
    cycle();
    res.json({ status: 'started' });
});

// Остановка серверного робота-автомата
app.get('/api/robot/stop', (req, res) => {
    isRobotRunning = false;
    if (robotTimer) clearTimeout(robotTimer);
    res.json({ status: 'stopped' });
});

app.get('/', (req, res) => {
    res.send('<h1>Бэкенд Сайта №1 успешно синхронизирован и запущен по пути backend/server.js!</h1>');
});

app.listen(port, () => {
    console.log(`Сервер успешно работает на порту ${port}`);
});
