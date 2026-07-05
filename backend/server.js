const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Отдаем статический фронтенд, если он лежит в папке frontend на уровень выше
app.use(express.static('../frontend'));

// Жестко прописываем адрес бэкенда Второго сайта на Render
const SITE_2_URL = "https://site-2-tree.onrender.com";

let isRobotActive = false;
let robotIntervalId = null;

// Генератор случайных ников для маркетплейса
function generateRandomUsername() {
    const prefixes = ['buyer', 'client', 'user', 'guest', 'alpha', 'rich', 'lucky', 'partner', 'shop', 'crypto'];
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${randomPrefix}_${randomNumber}`;
}

// Внутренняя функция, которая выполняет один полный цикл: Регистрация -> Оплата
async function executeRobotCycle() {
    if (!isRobotActive) return;

    const currentUsername = generateRandomUsername();
    console.log(`[РОБОТ] Шаг 1: Покупатель ${currentUsername} зашел на маркетплейс.`);

    try {
        // 1. Отправляем скрытый запрос на регистрацию на Сайт №2
        const regResponse = await fetch(`${SITE_2_URL}/api/shop/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUsername })
        });

        const regData = await regResponse.json();

        if (!regResponse.ok) {
            console.log(`[РОБОТ X] Ошибка регистрации: ${regData.error || 'Сбой API'}`);
            return;
        }

        console.log(`[РОБОТ] Шаг 2: ${currentUsername} зарегистрирован. Выбирает товар (имитация 3 сек)...`);

        // Ждем ровно 3 секунды внутри процесса перед оплатой товара
        setTimeout(async () => {
            if (!isRobotActive) return;
            console.log(`[РОБОТ] Шаг 3: Покупатель ${currentUsername} нажал кнопку "ОПЛАТИТЬ" товар.`);

            try {
                // 2. Отправляем скрытый запрос на оплату на Сайт №2
                const payResponse = await fetch(`${SITE_2_URL}/api/shop/pay`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: currentUsername, amount: 10000 })
                });

                const payData = await payResponse.json();

                if (!payResponse.ok) {
                    console.log(`[РОБОТ X] Ошибка оплаты: ${payData.error || 'Сбой API'}`);
                } else {
                    console.log(`[РОБОТ 💰] УСПЕХ! Товар оплачен, ник ${currentUsername} встал в ячейку ${payData.cellLabel || 'матрицы'}`);
                }
            } catch (payErr) {
                console.log(`[РОБОТ X] Ошибка сети при оплате: ${payErr.message}`);
            }
        }, 3000);

    } catch (regErr) {
        console.log(`[РОБОТ X] Ошибка сети при регистрации: ${regErr.message}`);
    }
}

// ==========================================
// ЭНДПОИНТЫ ДЛЯ УПРАВЛЕНИЯ РОБОТОМ НА САЙТЕ 1
// ==========================================

// Статус робота
app.get('/api/robot/status', (req, res) => {
    res.json({ active: isRobotActive });
});

// Запуск робота с интервалом в 3 секунды
app.post('/api/robot/start', (req, res) => {
    if (isRobotActive) {
        return res.json({ success: false, message: "Робот уже работает" });
    }
    
    isRobotActive = true;
    console.log("[СЕРВЕР 1] Автоматический регистратор успешно ЗАПУЩЕН.");
    
    executeRobotCycle();
    robotIntervalId = setInterval(executeRobotCycle, 3000);
    
    res.json({ success: true, message: "Робот запущен" });
});

// Остановить робота
app.post('/api/robot/stop', (req, res) => {
    if (!isRobotActive) {
        return res.json({ success: false, message: "Робот уже остановлен" });
    }
    
    isRobotActive = false;
    if (robotIntervalId) {
        clearInterval(robotIntervalId);
        robotIntervalId = null;
    }
    console.log("[СЕРВЕР 1] Автоматический регистратор ОСТАНОВЛЕН.");
    res.json({ success: true, message: "Робот остановлен" });
});

app.listen(PORT, () => console.log(`Маркетплейс (Сайт 1) запущен на порту ${PORT}`));
