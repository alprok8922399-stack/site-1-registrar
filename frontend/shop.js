/**
 * Фронтенд-скрипт Маркетплейса (Сайт 1)
 * Проект: MITRON
 * Управление корзиной, подсчет диапазонов (-10 M) и динамическая кнопка покупки.
 */

const API_URL = '/api';
const logBox = document.getElementById('logBox');
const buyBtn = document.getElementById('buyBtn');
const startRobotBtn = document.getElementById('startRobotBtn');

let currentCartTotal = 1000; // Сумма корзины по умолчанию
let cartItems = [];

// Вспомогательная функция для вывода логов на экран телефона
function log(message) {
    if (!logBox) return;
    const time = new Date().toLocaleTimeString();
    logBox.innerHTML += `[${time}] ${message}\n`;
    logBox.scrollTop = logBox.scrollHeight;
}

/**
 * Валидация корзины по допуску (-10 M):
 * 1000 M (990-1000 M)
 * 2000 M (1990-2000 M)
 * 3000 M (2990-3000 M)
 * 4000 M (3990-4000 M)
 * 5000 M (4990-5000 M)
 */
function validateCartUI(totalMitrons) {
    if (totalMitrons <= 0) {
        return { 
            valid: false, 
            message: 'Корзина пуста. Добавьте товары.', 
            needed: 1000, 
            targetBracket: 1000,
            cellsCount: 0
        };
    }
    
    if (totalMitrons > 5000) {
        return { 
            valid: false, 
            message: 'Максимальный объем одной покупки — 5000 Митронов', 
            needed: 0, 
            targetBracket: 5000,
            cellsCount: 5
        };
    }

    const targetBracket = Math.ceil(totalMitrons / 1000) * 1000;
    const minAllowed = targetBracket - 10; // 990, 1990, 2990, 3990, 4990 M
    const cellsCount = targetBracket / 1000;

    if (totalMitrons >= minAllowed && totalMitrons <= targetBracket) {
        return { 
            valid: true, 
            cellsCount: cellsCount, 
            targetBracket: targetBracket 
        };
    } else {
        const needed = Math.round(minAllowed - totalMitrons);
        return { 
            valid: false, 
            message: `Вам необходимо заполнить корзину ещё на ${needed > 0 ? needed : 0} Митронов`, 
            needed: needed > 0 ? needed : 0,
            targetBracket: targetBracket,
            cellsCount: cellsCount
        };
    }
}

/**
 * Обновление визуального состояния кнопки покупки и блока ошибок
 */
function updateBuyButtonState() {
    const regBtn = document.querySelector('button') || buyBtn;
    if (!regBtn) return;

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

    const validation = validateCartUI(currentCartTotal);

    if (!validation.valid) {
        regBtn.disabled = true;
        regBtn.style.opacity = '0.5';
        regBtn.style.cursor = 'not-allowed';
        regBtn.innerText = `Купить (${currentCartTotal} M)`;

        statusBox.style.backgroundColor = '#fadbd8';
        statusBox.style.color = '#78281f';
        statusBox.innerText = validation.message;
    } else {
        regBtn.disabled = false;
        regBtn.style.opacity = '1';
        regBtn.style.cursor = 'pointer';
        
        // Динамический текст кнопки на 1-5 сертификатов
        const certWord = validation.cellsCount === 1 ? 'сертификат' : (validation.cellsCount >= 5 ? 'сертификатов' : 'сертификата');
        regBtn.innerText = `Купить ${validation.cellsCount} ${certWord} на ${validation.targetBracket} M`;

        statusBox.style.backgroundColor = '#e8f8f5';
        statusBox.style.color = '#117a65';
        statusBox.innerText = `Корзина готова к оплате (${currentCartTotal} M). Займет ячеек на Сайте 2: ${validation.cellsCount}`;
    }
}

// Поиск кнопки для инициализации покупки
const regBtn = document.querySelector('button') || buyBtn;

if (regBtn) {
    // Инициализируем проверку состояния кнопки при открытии
    updateBuyButtonState();

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
        
        let statusBox = document.querySelector('.status-box');
        if (statusBox) {
            statusBox.style.backgroundColor = '#e8f8f5';
            statusBox.style.color = '#117a65';
            statusBox.innerText = `Обработка покупки для ${username}...`;
        }

        try {
            const checkoutRes = await fetch(`${API_URL}/shop/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: username, 
                    totalMitrons: currentCartTotal,
                    uplineUser: sponsor || null,
                    cartItems: cartItems
                })
            });
            const checkoutData = await checkoutRes.json();

            if (!checkoutRes.ok || !checkoutData.success) {
                throw new Error(checkoutData.error || 'Ошибка при проведении покупки');
            }

            if (statusBox) {
                statusBox.style.backgroundColor = '#d4efdf';
                statusBox.style.color = '#196f3d';
                statusBox.innerText = `✓ Покупка успешна! Место на Сайте 2: ${checkoutData.cellId} (ячеек: ${checkoutData.cellsCount})`;
            }

            log(`Успешная покупка: ${username} на ${currentCartTotal} M`);

        } catch (err) {
            if (statusBox) {
                statusBox.style.backgroundColor = '#fadbd8';
                statusBox.style.color = '#78281f';
                statusBox.innerText = `Ошибка: ${err.message}`;
            }
        } finally {
            updateBuyButtonState();
        }
    });
}
