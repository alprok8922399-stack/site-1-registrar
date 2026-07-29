const API_URL = '/api';
const logBox = document.getElementById('logBox');
const buyBtn = document.getElementById('buyBtn');
const startRobotBtn = document.getElementById('startRobotBtn');

let currentCartTotal = 0;
let cartItems = [];

// Вспомогательная функция для вывода логов на экран телефона
function log(message) {
    if (!logBox) return;
    const time = new Date().toLocaleTimeString();
    logBox.innerHTML += `[${time}] ${message}\n`;
    logBox.scrollTop = logBox.scrollHeight;
}

// Валидация корзины по правилам диапазона (990-1000 M, 1990-2000 M и т.д. до 5000 M)
function validateCartUI(totalMitrons) {
    if (totalMitrons <= 0) {
        return { valid: false, message: 'Корзина пуста', needed: 1000 };
    }
    if (totalMitrons > 5000) {
        return { valid: false, message: 'Максимальный объем одной покупки — 5000 Митронов', needed: 0 };
    }

    const targetBracket = Math.ceil(totalMitrons / 1000) * 1000;
    const minAllowed = targetBracket - 10; // Например 990, 1990, 2990 и т.д.

    if (totalMitrons >= minAllowed && totalMitrons <= targetBracket) {
        const cellsCount = targetBracket / 1000;
        return { valid: true, cellsCount, targetBracket };
    } else {
        const needed = minAllowed - totalMitrons;
        return { 
            valid: false, 
            message: `Вам необходимо заполнить корзину ещё на ${needed > 0 ? needed : 0} Митронов (цель: ${minAllowed}-${targetBracket} M)`, 
            needed: needed > 0 ? needed : 0 
        };
    }
}

// Функция обновления состояния кнопки оплаты и подсказки
function updateCheckoutStatus(totalMitrons) {
    currentCartTotal = totalMitrons;
    const validation = validateCartUI(totalMitrons);
    
    const cartStatusElement = document.getElementById('cartStatusText');

    if (validation.valid) {
        if (buyBtn) buyBtn.disabled = false;
        if (cartStatusElement) {
            cartStatusElement.style.color = '#2ecc71';
            cartStatusElement.innerText = `✓ Готово к оплате! Сумма: ${totalMitrons} M (мест в матрице: ${validation.cellsCount})`;
        }
    } else {
        if (buyBtn) buyBtn.disabled = true;
        if (cartStatusElement) {
            cartStatusElement.style.color = '#e74c3c';
            cartStatusElement.innerText = validation.message;
        }
    }
}

// --- КНОПКА: ИМИТАЦИЯ РУЧНОЙ ПОКУПКИ ---
if (buyBtn) {
    buyBtn.addEventListener('click', async () => {
        const usernameInput = document.getElementById('buyerName');
        const sponsorInput = document.getElementById('buyerSponsor');
        
        const username = usernameInput ? usernameInput.value.trim() : '';
        const sponsor = sponsorInput ? sponsorInput.value.trim() : '';

        if (!username) {
            alert('Введите логин покупателя!');
            return;
        }

        const validation = validateCartUI(currentCartTotal);
        if (!validation.valid) {
            alert(validation.message);
            return;
        }

        buyBtn.disabled = true;
        log(`Запуск оплаты покупки для: ${username} на сумму ${currentCartTotal} M...`);

        try {
            const checkoutRes = await fetch(`${API_URL}/shop/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, 
                    totalMitrons: currentCartTotal,
                    uplineUser: sponsor || null,
                    cartItems: cartItems
                })
            });
            const checkoutData = await checkoutRes.json();

            if (!checkoutRes.ok || !checkoutData.success) {
                throw new Error(checkoutData.error || 'Ошибка при проведении покупки');
            }

            log(`💰 Оплата на сумму ${currentCartTotal} M успешно выполнена!`);
            log(`💸 450 M/ячейку отправлено на покупку товара, остаток осел в кошельке.`);
            log(`🟢 На Сайте 2 зарезервировано ячеек: ${checkoutData.cellsCount} (стартовая: ${checkoutData.cellId})`);

            alert(`Покупка успешна! Занято ячеек в матрице: ${checkoutData.cellsCount}`);

        } catch (err) {
            log(`❌ Ошибка: ${err.message}`);
        } finally {
            updateCheckoutStatus(currentCartTotal);
        }
    });
}

// --- КНОПКА: УПРАВЛЕНИЕ РОБОТОМ ---
if (startRobotBtn) {
    startRobotBtn.addEventListener('click', async () => {
        const botCountInput = document.getElementById('botCount');
        const count = botCountInput ? parseInt(botCountInput.value, 10) : 10;

        startRobotBtn.disabled = true;
        log(`🤖 Запуск Автобота (порционный режим по 10-20 ботов)...`);

        try {
            const res = await fetch(`${API_URL}/robot/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batchSize: count })
            });
            const data = await res.json();
            if (data.success) {
                log(`🟢 Автобот запущен! Логи будут поступать с сервера.`);
            } else {
                log(`❌ Ошибка запуска автобота.`);
            }
        } catch (err) {
            log(`❌ Ошибка сети при запуске робота: ${err.message}`);
        } finally {
            startRobotBtn.disabled = false;
        }
    });
}
