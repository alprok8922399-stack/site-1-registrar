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

// Внутренний цикл робота
async function executeRobotCycle() {
    if (!isRobotActive) return;

    const currentUsername = generateRandomUsername();
    console.log(`[РОБОТ] Шаг 1: Покупатель ${currentUsername} зашел на маркетплейс.`);

    try {
        // 1. Регистрация
        const regResult = await sendPostRequest(`${SITE_2_URL}/api/shop/register`, { username: currentUsername });

        if (!regResult.ok) {
            console.log(`[РОБОТ X] Ошибка регистрации: ${regResult.data.error || 'Сбой API'}`);
            return;
        }

        console.log(`[РОБОТ] Шаг 2: ${currentUsername} зарегистрирован. Выбирает товар (3 сек)...`);

        // Ждем 3 секунды перед оплатой
        setTimeout(async () => {
            if (!isRobotActive) return;
            console.log(`[РОБОТ] Шаг 3: Покупатель ${currentUsername} нажимает "ОПЛАТИТЬ".`);

            try {
                // 2. Оплата
                const payResult = await sendPostRequest(`${SITE_2_URL}/api/shop/pay`, { username: currentUsername, amount: 10000 });

                if (!payResult.ok) {
                    console.log(`[РОБОТ X] Ошибка оплаты: ${payResult.data.error || 'Сбой API'}`);
                } else {
                    console.log(`[РОБОТ 💰] УСПЕХ! Товар оплачен, ник ${currentUsername} встал в ячейку матрицы.`);
                }
            } catch (payErr) {
                console.log(`[РОБОТ X] Сбой сети при оплате: ${payErr.message}`);
            }
        }, 3000);

    } catch (regErr) {
        console.log(`[РОБОТ X] Сбой сети при регистрации: ${regErr.message}`);
    }
}

// ==========================================
// ЭНДПОИНТЫ УПРАВЛЕНИЯ
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
    robotIntervalId = setInterval(executeRobotCycle, 6000); // 6 секунд на полный цикл (3 сек выбор + 3 сек запас)
    
    res.json({ success: true, message: "Робот запущен" });
});

app.post('/api/robot/stop', (req, res) => {
    if (!isRobotActive) {
        res.json({ success: false, message: "Робот уже остановлен" });
        return;
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
