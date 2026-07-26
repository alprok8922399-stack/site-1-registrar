const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const crypto = require('crypto');
const { getProductsCatalog } = require('./products');

const app = express();
const PORT = process.env.PORT || 4000;

// Секретный ключ для межсерверного взаимодействия с Сайтом №2
const INTERNAL_SECRET_KEY = process.env.INTERNAL_SECRET_KEY || 'super_secret_mitron_key_2026';

app.use(cors());
app.use(express.json());

// Раздача статики публичного фронтенда (Сайт 1)
app.use(express.static(path.join(__dirname, '../frontend')));

// Глобальное состояние системы Сайта 1
let isRobotRunning = false;
let robotInterval = null;
let liveLogs = [];

// Системный Кошелек Администрации (100% первичных поступлений)
let adminWalletBalance = 0; 

// База заблокированных и зарегистрированных пользователей Сайта 1
const registeredUsers = new Map(); 
const blockedUsers = new Set();
const pendingPayouts = new Map(); // Очередь запросов на выплату (с таймером 3 дня)

// URL приватного контура (Сайт 2)
const SITE2_URL = process.env.SITE2_URL || 'https://site-2-tree.onrender.com';

/**
 * Логирование событий системы
 */
function logEvent(message) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}`;
    liveLogs.push(formattedMessage);
    if (liveLogs.length > 200) {
        liveLogs.shift();
    }
    console.log(`[Сайт 1 - Bridge] ${message}`);
}

/**
 * Генерация DAO Smart ID (Хэш-Логин) для анонимной бесшовной регистрации
 */
function generateDaoUserHash() {
    return 'DAO_0x' + crypto.randomBytes(8).toString('hex');
}

/* ==========================================================================
   1. РЕГИСТРАЦИЯ ПОКУПАТЕЛЯ И ПОКУПКА СЕРТИФИКАТА (1000 M)
   ========================================================================== */

app.post('/api/register-buyer', async (req, res) => {
    try {
        const { username, sponsor, amount } = req.body;
        const purchaseAmount = amount || 1000;

        if (!username) {
            return res.status(400).json({ success: false, message: 'Укажите логин пользователя.' });
        }

        if (blockedUsers.has(username)) {
            return res.status(403).json({ success: false, message: 'Ваш аккаунт заблокирован Администратором.' });
        }

        // Поступление 100% средств в Кошелек Администрации
        adminWalletBalance += purchaseAmount;
        
        const userObj = {
            username: username,
            sponsor: sponsor || null,
            createdAt: new Date()
        };
        registeredUsers.set(username, userObj);

        logEvent(`[Регистрация Покупателя] Зарегистрирован ${username} (Спонсор: ${sponsor || 'Нет'}). Сертификат: ${purchaseAmount} M. Баланс Админа: ${adminWalletBalance} M`);

        // Вызов Моста на Сайт 2 для создания ячейки в Матрице и Таблице
        const site2Response = await fetch(`${SITE2_URL}/api/shop/pay`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-internal-key': INTERNAL_SECRET_KEY
            },
            body: JSON.stringify({
                username: username,
                amount: purchaseAmount,
                cellsCount: 1,
                sponsorId: sponsor || null
            })
        });

        const site2Data = await site2Response.json();

        if (!site2Data.success) {
            logEvent(`[Ошибка Сайт 2] Не удалось зарегистрировать в Матрице: ${site2Data.error}`);
            return res.status(500).json({ success: false, message: site2Data.error || 'Ошибка активации на Сайте 2.' });
        }

        logEvent(`[Успех] Пользователь ${username} успешно активирован в Матрице и Таблице на Сайте 2.`);

        res.json({
            success: true,
            username: username,
            message: 'Покупатель успешно зарегистрирован, сертификат куплен.'
        });

    } catch (err) {
        logEvent(`[Критическая ошибка Регистрации]: ${err.message}`);
        res.status(500).json({ success: false, message: err.message });
    }
});

/* ==========================================================================
   2. ПАРСИНГ И КАТАЛОГ ТОВАРОВ (ЦЕНООБРАЗОВАНИЕ x2.2 И «ПОТОЛОК»)
   ========================================================================== */

app.get('/api/products', (req, res) => {
    try {
        const catalog = getProductsCatalog();
        res.json({ success: true, products: catalog });
    } catch (err) {
        logEvent(`Ошибка получения каталога: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
});

/* ==========================================================================
   3. ПРАВИЛО КОРЗИНЫ И ПРОВЕРКА ДОПУСКА (-10 M)
   ========================================================================== */

app.post('/api/cart/validate', (req, res) => {
    const { totalAmount } = req.body;

    if (!totalAmount || totalAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Корзина пуста' });
    }

    if (totalAmount > 5000) {
        return res.status(400).json({ 
            success: false, 
            error: 'Максимальная сумма закупки за один раз — не более 5000 Митронов' 
        });
    }

    let targetCells = 0;
    let requiredAdd = 0;

    for (let k = 1; k <= 5; k++) {
        const minBound = k * 1000 - 10;
        const maxBound = k * 1000;

        if (totalAmount >= minBound && totalAmount <= maxBound) {
            targetCells = k;
            break;
        } else if (totalAmount < minBound && (k === 1 || totalAmount > (k - 1) * 1000)) {
            requiredAdd = minBound - totalAmount;
            break;
        }
    }

    if (targetCells > 0) {
        return res.json({ 
            success: true, 
            valid: true, 
            cellsToActivate: targetCells,
            message: `Корзина валидна. Будет активировано ячеек на Сайте 2: ${targetCells}` 
        });
    } else {
        return res.json({ 
            success: true, 
            valid: false, 
            requiredAdd: requiredAdd,
            message: `Вам необходимо заполнить корзину ещё на ${requiredAdd} Митронов` 
        });
    }
});

/* ==========================================================================
   4. DAO ПОКУПКА, ПОСТУПЛЕНИЕ 100% В КОШЕЛЕК АДМИНА И ПЕРЕДАЧА НА САЙТ 2
   ========================================================================== */

app.post('/api/shop/checkout', async (req, res) => {
    try {
        const { userWallet, totalAmount, cartItems, sponsorId } = req.body;

        if (userWallet && blockedUsers.has(userWallet)) {
            return res.status(403).json({ success: false, error: 'Ваш аккаунт заблокирован Администратором.' });
        }

        let cellsCount = 0;
        for (let k = 1; k <= 5; k++) {
            if (totalAmount >= (k * 1000 - 10) && totalAmount <= (k * 1000)) {
                cellsCount = k;
                break;
            }
        }

        if (cellsCount === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Сумма корзины не соответствует допуску кратности 1000 M (-10 M).' 
            });
        }

        let daoUser = registeredUsers.get(userWallet);
        if (!daoUser) {
            daoUser = {
                username: generateDaoUserHash(),
                wallet: userWallet || 'Web3_Guest',
                createdAt: new Date()
            };
            registeredUsers.set(daoUser.username, daoUser);
            if (userWallet) registeredUsers.set(userWallet, daoUser);
        }

        adminWalletBalance += totalAmount;
        logEvent(`[Финансы] Поступление ${totalAmount} M в Кошелек Администрации от ${daoUser.username}. Баланс Админа: ${adminWalletBalance} M`);

        // Вызов Моста на Сайт 2 с секретным ключом авторизации
        const site2Response = await fetch(`${SITE2_URL}/api/shop/pay`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-internal-key': INTERNAL_SECRET_KEY
            },
            body: JSON.stringify({
                username: daoUser.username,
                amount: totalAmount,
                cellsCount: cellsCount,
                sponsorId: sponsorId || null
            })
        });

        const site2Data = await site2Response.json();

        if (!site2Data.success) {
            logEvent(`[Ошибка Сайт 2] Не удалось расфасовать ячейки: ${site2Data.error}`);
            return res.status(500).json({ success: false, error: 'Ошибка активации ячеек на Сайте 2.' });
        }

        logEvent(`[Успех] ${daoUser.username} успешно оплатил покупку. На Сайте 2 активировано ячеек: ${cellsCount}`);

        res.json({
            success: true,
            daoUsername: daoUser.username,
            activatedCells: cellsCount,
            message: 'Покупка успешно совершена. Товар отправлен на выкуп.'
        });

    } catch (err) {
        logEvent(`[Критическая ошибка Checkout]: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
});

/* ==========================================================================
   5. МЕХАНИКА ОТКАЗА И ПОЛНОГО ВОЗВРАТА (В ТЕЧЕНИЕ 31 ДНЯ)
   ========================================================================== */

app.post('/api/user/refund', async (req, res) => {
    try {
        const { username, userWallet } = req.body;
        const targetUser = username || userWallet;

        if (!targetUser) {
            return res.status(400).json({ success: false, error: 'Укажите пользователя для возврата.' });
        }

        logEvent(`[Отказ] Инициирован возврат средств и полный выход из системы для пользователя: ${targetUser}`);

        const site2Refund = await fetch(`${SITE2_URL}/api/admin/delete-user`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-internal-key': INTERNAL_SECRET_KEY
            },
            body: JSON.stringify({ username: targetUser })
        });

        const refundData = await site2Refund.json();

        adminWalletBalance = Math.max(0, adminWalletBalance - 1000); 
        registeredUsers.delete(targetUser);

        logEvent(`[Отказ Завершен] Средства возвращены ${targetUser} в полном объеме. Аккаунт удален с Сайта 1. Ячейки на Сайте 2 переданы Admin_System.`);

        res.json({
            success: true,
            message: 'Возврат выполнен в полном объеме. Аккаунт полностью удален из систем.'
        });

    } catch (err) {
        logEvent(`[Ошибка Отказа]: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
});

/* ==========================================================================
   6. ДВУСТОРОННЯЯ СКВОЗНАЯ БЛОКИРОВКА АДМИНИСТРАЦИЕЙ
   ========================================================================== */

app.post('/api/admin/block-user', async (req, res) => {
    try {
        const { username, reason } = req.body;

        if (!username) {
            return res.status(400).json({ success: false, error: 'Укажите логин для блокировки.' });
        }

        blockedUsers.add(username);

        await fetch(`${SITE2_URL}/api/admin/delete-user`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-internal-key': INTERNAL_SECRET_KEY
            },
            body: JSON.stringify({ username, reason })
        });

        adminWalletBalance = Math.max(0, adminWalletBalance - 1000);

        logEvent(`[Блокировка] Пользователь ${username} заблокирован Администратором. Блок синхронизирован с Сайтом 2. Средства возвращены.`);

        res.json({
            success: true,
            message: `Пользователь ${username} заблокирован на обоих сайтах. Аккаунт передал права проекту MITRON.`
        });

    } catch (err) {
        logEvent(`[Ошибка Блокировки]: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
});

/* ==========================================================================
   7. КАСКАДНАЯ СИСТЕМА ВЫПЛАТ КЕШБЭКА (ПОСЛЕ 31 ДНЯ)
   ========================================================================== */

app.post('/api/payouts/request', (req, res) => {
    const { leaderUsername, amount } = req.body;
    const payoutId = `PAY_${Date.now()}`;

    pendingPayouts.set(payoutId, {
        payoutId,
        leaderUsername,
        amount: amount || 1000,
        createdAt: Date.now(),
        status: 'PENDING_ADMIN_APPROVE'
    });

    logEvent(`[Запрос Выплаты] Робот сформировал запрос ${payoutId} на выплату ${amount || 1000} M Лидеру ${leaderUsername}. Ожидание одобрения Админа (авточерез 3 дня).`);

    res.json({ success: true, payoutId });
});

app.post('/api/payouts/approve', (req, res) => {
    const { payoutId } = req.body;
    const payout = pendingPayouts.get(payoutId);

    if (!payout) {
        return res.status(404).json({ success: false, error: 'Запрос на выплату не найден' });
    }

    if (adminWalletBalance < payout.amount) {
        return res.status(400).json({ success: false, error: 'Недостаточно средств в Кошельке Администрации' });
    }

    adminWalletBalance -= payout.amount;
    logEvent(`[Каскадный Перевод] 1. Списано ${payout.amount} M из Кошелька Администрации.`);
    logEvent(`[Каскадный Перевод] 2. Переведено на Выплатной кошелек.`);
    logEvent(`[Каскадный Перевод] 3. Проведено через Буферный кошелек (очищен в 0).`);
    logEvent(`[Каскадный Перевод] 4. Зачислено Лидеру ${payout.leaderUsername}.`);

    payout.status = 'COMPLETED';
    pendingPayouts.delete(payoutId);

    res.json({ 
        success: true, 
        message: `КЕШБЭК 100% (${payout.amount} M) успешно переведен Лидеру ${payout.leaderUsername}!` 
    });
});

/* ==========================================================================
   8. УПРАВЛЕНИЕ АВТО-РОБОТОМ (ЭМУЛЯТОР ПОКУПОК)
   ========================================================================== */

function startRobot() {
    if (robotInterval) return;
    isRobotRunning = true;
    
    logEvent("Авто-Робот покупок запущен.");
    
    robotInterval = setInterval(async () => {
        try {
            const uniqueSuffix = `${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`;
            const botDaoName = `DAO_AutoBot_${uniqueSuffix}`;

            adminWalletBalance += 1000;

            const payRes = await fetch(`${SITE2_URL}/api/shop/pay`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-internal-key': INTERNAL_SECRET_KEY
                },
                body: JSON.stringify({ 
                    username: botDaoName, 
                    amount: 1000, 
                    cellsCount: 1 
                })
            });
            
            const payData = await payRes.json();
            if (payData.success) {
                logEvent(`✓ [Робот Покупок] Авто-покупка 1000 M совершена: ${botDaoName}. Ячейка встала на Сайте 2.`);
            } else {
                logEvent(`Ошибка покупки роботом: ${payData.error || 'Не удалось занять место'}`);
            }
        } catch (err) {
            logEvent(`Ошибка связи Авто-Робота с Сайтом 2: ${err.message}`);
        }
    }, 5000);
}

function stopRobot() {
    if (robotInterval) {
        clearInterval(robotInterval);
        robotInterval = null;
    }
    isRobotRunning = false;
    logEvent('Авто-Робот покупок остановлен.');
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.post('/api/robot/heartbeat', (req, res) => {
    res.json({ success: true, adminBalance: adminWalletBalance });
});

app.get('/api/robot/logs', (req, res) => {
    res.json({ logs: liveLogs, adminBalance: adminWalletBalance });
});

app.get('/api/robot/status', (req, res) => {
    res.json({ running: isRobotRunning, adminBalance: adminWalletBalance });
});

app.post('/api/robot/start', (req, res) => {
    startRobot();
    res.json({ success: true, running: true });
});

app.post('/api/robot/stop', (req, res) => {
    stopRobot();
    res.json({ success: true, running: false });
});

app.listen(PORT, () => logEvent(`Site 1 Bridge Server running on port ${PORT}`));
