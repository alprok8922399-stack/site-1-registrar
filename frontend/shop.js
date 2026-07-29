const API_URL = '/api';
const logBox = document.getElementById('logBox');
const buyBtn = document.getElementById('buyBtn');
const startRobotBtn = document.getElementById('startRobotBtn');

let currentCartTotal = 1000; // По умолчанию берем 1000 M для первой тестовой покупки
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
    const minAllowed = targetBracket - 10; // 990, 1990, 2990 и т.д.

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

// Находим кнопку регистрации/покупки на странице
const regBtn = document.querySelector('button') || buyBtn;

if (regBtn) {
    regBtn.addEventListener('click', async () => {
        const usernameInput = document.getElementById('buyerName') || document.querySelector('input[type="text"]');
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

        regBtn.disabled = true;
        
        // Создаем плашку сообщения об ошибке/успехе под кнопкой
        let statusBox = document.querySelector('.status-box');
        if (!statusBox) {
            statusBox = document.createElement('div');
            statusBox.className = 'status-box';
            statusBox.style.marginTop = '15px';
            statusBox.style.padding = '12px';
            statusBox.style.borderRadius = '8px';
            statusBox.style.textAlign = 'center';
            statusBox.style.fontWeight = 'bold';
            regBtn.parentNode.appendChild(statusBox);
        }

        statusBox.style.backgroundColor = '#e8f8f5';
        statusBox.style.color = '#117a65';
        statusBox.innerText = `Обработка покупки для ${username}...`;

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

            statusBox.style.backgroundColor = '#d4efdf';
            statusBox.style.color = '#196f3d';
            statusBox.innerText = `✓ Покупка успешна! Место в матрице: ${checkoutData.cellId} (ячеек: ${checkoutData.cellsCount})`;

        } catch (err) {
            statusBox.style.backgroundColor = '#fadbd8';
            statusBox.style.color = '#78281f';
            statusBox.innerText = `Ошибка: ${err.message}`;
        } finally {
            regBtn.disabled = false;
        }
    });
}
