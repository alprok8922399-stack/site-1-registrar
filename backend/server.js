const express = require('express');
const https = require('https'); // Встроенный модуль Node.js, не требует установки
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Включаем CORS через чистые заголовки, чтобы фронтенд всегда мог достучаться
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Отдаем статический фронтенд
app.use(express.static('../frontend'));

// Жестко прописываем адрес бэкенда Второго сайта на Render
const SITE_2_URL = "https://site-2-tree.onrender.com";

let isRobotActive = false;
let robotIntervalId = null;

// Локальная база данных для имитации кабинета покупателя на Сайте 1
const shopUsers = {};

function generateRandomUsername() {
    const prefixes = ['buyer', 'client', 'user', 'guest', 'alpha', 'rich', 'lucky', 'partner', 'shop', 'crypto'];
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${randomPrefix}_${randomNumber}`;
}

// Вспомогательная функция для отправки POST запросов через встроенный модуль https
function sendPostRequest(url, data) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(data);
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            },
            timeout: 10000
        };

        const req = https.request(url, options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => responseBody += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseBody);
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: parsed });
                } catch (e) {
                    resolve({ ok: false, data: { error: 'Некорректный JSON ответа' } });
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Превышено время ожидания запроса'));
        });
        req.write(payload);
        req.end();
    });
}

// Внутренний цикл робота (использует те же локальные эндпоинты для идентичности логики)
async function executeRobotCycle() {
    if (!isRobotActive) return;

    const currentUsername = generateRandomUsername();
    console.log(`[РОБОТ] Шаг 1: Покупатель ${currentUsername} зашел на маркетплейс.`);

    try {
        // 1. Регистрация через собственный обработчик
        shopUsers[currentUsername] = { username: currentUsername, balance: 0, paid: false };
        console.log(`[РОБОТ] Шаг 2: ${currentUsername} зарегистрирован локально. Выбирает товар (3 сек)...`);

        // Ждем 3 секунды перед оплатой
        setTimeout(async () => {
            if (!isRobotActive) return;
            console.log(`[РОБОТ] Шаг 3: Покупатель ${currentUsername} нажимает "ОПЛАТИТЬ".`);

            try {
                // 2. Имитация перевода 10 000 руб (5000 в твой кошелек, отправка на Сайт 2)
                const payResult = await sendPostRequest(`${SITE_2_URL}/api/shop/pay`, { 
                    username: currentUsername, 
                    amount: 10000 
                });

                if (!payResult.ok) {
                    console.log(`[РОБОТ X] Ошибка оплаты на Сайте 2: ${payResult.data.error || 'Сбой API'}`);
                } else {
                    shopUsers[currentUsername].paid = true;
                    shopUsers[currentUsername].balance = 0; // кэшбэк покупателя равен 0, так как деньги ушли в структуру
                    console.log(`[РОБОТ 💰] УСПЕХ! Товар оплачен. 10 000 руб распределено: 5 000 руб отправлено в Ваш кошелек. Ник ${currentUsername} встал в ячейку матрицы.`);
                }
            } catch (payErr) {
                console.log(`[РОБОТ X] Сбой сети при оплате: ${payErr.message}`);
            }
        }, 3000);

    } catch (regErr) {
        console.log(`[РОБОТ X] Сбой при регистрации: ${regErr.message}`);
    }
}

// ==========================================
// ЭНДПОИНТЫ ДЛЯ ЖИВОГО ПОКУПАТЕЛЯ (shop.html)
// ==========================================

// Регистрация пользователя в магазине
app.post('/api/shop/register', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Логин не указан' });

    if (shopUsers[username]) {
        return res.status(400).json({ error: 'Этот логин уже занят на маркетплейсе' });
    }

    shopUsers[username] = { username, balance: 0, paid: false };
    res.json({ success: true, message: 'Пользователь успешно создан' });
});

// Оплата товара пользователем (10 000 рублей)
app.post('/api/shop/pay', async (req, res) => {
    const { username, amount } = req.body;
    if (!username || !shopUsers[username]) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    try {
        // Проксируем оплату на Сайт №2 для постановки в матрицу
        const payResult = await sendPostRequest(`${SITE_2_URL}/api/shop/pay`, { username, amount: 10000 });

        if (!payResult.ok) {
            return res.status(400).json({ error: payResult.data.error || 'Ошибка при проведении транзакции на Сайте 2' });
        }

        shopUsers[username].paid = true;
        shopUsers[username].balance = 0; // Баланс самого покупателя (чистый кэшбэк)

        // Возвращаем фронтенду красивый сплит-отчет о виртуальном распределении
        res.json({
            success: true,
            shopUserStatus: shopUsers[username],
            split: {
                total: 10000,
                marketplace: 5000,
                myWallet: 5000 // 5 000 рублей улетает виртуально в твой кошелек/структуру
            }
        });

    } catch (err) {
        res.status(500).json({ error: 'Сбой сети при отправке транзакции: ' + err.message });
    }
});

// ==========================================
// ЭНДПОИНТЫ УПРАВЛЕНИЯ РОБОТОМ (index.html)
// ==========================================

app.get('/api/robot/status', (req, res) => {
    res.json({ active: isRobotActive });
});

app.post('/api/robot/start', (req, res) => {
    if (isRobotActive) {
        return res.json({ success: false, message: "Робот уже работает" });
    }
    isRobotActive = true;
    console.log("[СЕРВЕР 1] Робот ЗАПУЩЕН.");
    
    executeRobotCycle();
    robotIntervalId = setInterval(executeRobotCycle, 7000); // 7 секунд на полный круг, чтобы запросы не наслаивались
    
    res.json({ success: true, message: "Робот запущен" });
});

app.post('/api/robot/stop', (req, res) => {
    if (!isRobotActive) {
        return res.json({ success: false, message: "Робот уже остановлен" });
    }
    isRobotActive = false;
    if (robotIntervalId) {
        clearInterval(robotIntervalId);
        robotIntervalId = null;
    }
    console.log("[СЕРВЕР 1] Робот ОСТАНОВЛЕН.");
    res.json({ success: true, message: "Робот остановлен" });
});

app.listen(PORT, () => console.log(`Маркетплейс (Сайт 1) запущен на порту ${PORT}`));
