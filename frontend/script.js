/**
 * Единый скрипт Витрины, Корзины и Управления Роботом (Сайт 1)
 * Проект: MITRON
 */

const API_URL = ''; // Относительные запросы

let cart = [];
let logInterval = null;

// ==========================================
// 1. ВИТРИНА И КАТАЛОГ ТОВАРОВ
// ==========================================

async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/api/products`);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                renderProducts(data);
                return;
            }
        }
    } catch (err) {
        console.log("Ошибка загрузки каталога:", err);
    }
}

function renderProducts(products) {
    let mainView = document.getElementById('productsContainer') || document.querySelector('.products-grid');
    
    if (!mainView) {
        mainView = document.createElement('div');
        mainView.id = 'productsContainer';
        mainView.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 15px; padding: 15px;';
        
        const heading = document.querySelector('h1, h2') || document.body;
        heading.after(mainView);
    }

    mainView.innerHTML = products.map((p, idx) => {
        const title = p.title || p.name || `Товар #${idx + 1}`;
        const price = p.priceMitrons || p.totalMitrons || p.price || 1000;
        const costUsd = p.costUsd || p.basePriceUsd || '';
        const markup = p.markupRate ? ` | Наценка: x${p.markupRate}` : '';
        const desc = costUsd ? `Себестоимость: ${costUsd} USDT${markup} | Итого: ${price} М` : (p.description || '');

        return `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 1.1rem; font-weight: bold;">${title}</h3>
                    <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 12px;">${desc}</p>
                </div>
                <div>
                    <div style="font-size: 1.3rem; font-weight: bold; color: #10b981; margin-bottom: 12px;">${price} М</div>
                    <button onclick="addToCart('${p.id || idx}', '${title.replace(/'/g, "\\'")}', ${price})" style="width: 100%; background: #10b981; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;">В корзину</button>
                </div>
            </div>
        `;
    }).join('');
}

window.addToCart = function(id, name, price) {
    cart.push({ id, name, price });
    updateCartUI();
    alert(`Товар "${name}" добавлен в корзину!`);
};

function updateCartUI() {
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const cartBtns = document.querySelectorAll('.cart-btn, #cartBtn, button, a');
    
    cartBtns.forEach(btn => {
        if (btn.textContent.includes('Корзина')) {
            btn.textContent = `🛒 Корзина (${cart.length}) - ${total} M`;
        }
    });
}

// ==========================================
// 2. МОДАЛЬНОЕ ОКНО КОРЗИНЫ
// ==========================================

window.openCartModal = function() {
    let modal = document.getElementById('cartModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'cartModal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999; padding:15px;';
        document.body.appendChild(modal);
    }
    
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    
    modal.innerHTML = `
        <div style="background:#ffffff; color:#1e293b; width:100%; max-width:480px; border-radius:16px; padding:20px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">
                <h3 style="margin:0; font-size:1.2rem;">🛒 Ваша Корзина</h3>
                <button onclick="document.getElementById('cartModal').style.display='none'" style="background:none; border:none; color:#64748b; font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>
            <div style="max-height:200px; overflow-y:auto; margin-bottom:15px;">
                ${cart.length === 0 ? '<p style="color:#94a3b8; text-align:center;">Корзина пуста</p>' : cart.map((item) => `
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9;">
                        <span>${item.name}</span>
                        <span style="font-weight:bold; color:#10b981;">${item.price} M</span>
                    </div>
                `).join('')}
            </div>
            <div style="font-size:1.2rem; font-weight:bold; margin-bottom:15px; text-align:right;">
                Итого: <span style="color:#10b981;">${total} M</span>
            </div>
            <input type="text" id="buyerUsername" placeholder="Введите ваш логин" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:15px; box-sizing:border-box;">
            <button onclick="checkoutCart()" style="width:100%; padding:12px; background:#10b981; color:white; border:none; border-radius:8px; font-weight:bold; font-size:1rem; cursor:pointer;">ОПЛАТИТЬ И ЗАНЯТЬ ЯЧЕЙКИ</button>
        </div>
    `;
    modal.style.display = 'flex';
};

window.checkoutCart = async function() {
    const usernameInput = document.getElementById('buyerUsername');
    const username = usernameInput ? usernameInput.value.trim() : '';
    
    if (!username) {
        alert("Пожалуйста, введите логин покупателя!");
        return;
    }

    if (cart.length === 0) {
        alert("Корзина пуста!");
        return;
    }

    const totalMitrons = cart.reduce((sum, item) => sum + item.price, 0);

    try {
        const res = await fetch(`${API_URL}/api/shop/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, totalMitrons, cartItems: cart })
        });

        const data = await res.json();
        if (data.success) {
            alert(`Успешно! Покупка оформлена. Вы зарезервировали ${data.cellsCount || 1} яч. в матрице Сайта 2.`);
            cart = [];
            updateCartUI();
            document.getElementById('cartModal').style.display = 'none';
        } else {
            alert(`Ошибка оплаты: ${data.error || 'Неизвестная ошибка'}`);
        }
    } catch (err) {
        alert(`Ошибка сети: ${err.message}`);
    }
};

// ==========================================
// 3. УПРАВЛЕНИЕ ГЕНЕРАТОРОМ РОБОТОВ
// ==========================================

function appendToConsole(text, isError = false) {
    const consoleLog = document.getElementById('consoleLog');
    if (!consoleLog) return;

    const line = document.createElement('div');
    line.className = 'log-line';
    line.style.padding = '3px 0';
    line.style.color = isError ? '#ef4444' : '#10b981';
    
    const now = new Date();
    const timeStr = now.toISOString().split('T')[1].slice(0, 8);
    line.textContent = `[${timeStr}] ${text}`;
    
    consoleLog.appendChild(line);
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

async function fetchLiveLogs() {
    const consoleLog = document.getElementById('consoleLog');
    if (!consoleLog) return;

    try {
        const res = await fetch(`${API_URL}/api/robot/logs`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data && Array.isArray(data.logs)) {
            const currentLinesCount = consoleLog.getElementsByClassName('log-line').length;
            if (data.logs.length > currentLinesCount) {
                for (let i = currentLinesCount; i < data.logs.length; i++) {
                    appendToConsole(data.logs[i]);
                }
            }
        }
    } catch (err) {
        console.error("Ошибка обновления логов:", err);
    }
}

function updateRobotUI(isActive) {
    const statusLabel = document.getElementById('statusLabel');
    const actionBtn = document.getElementById('actionBtn');

    if (!statusLabel || !actionBtn) return;

    if (isActive) {
        statusLabel.textContent = "Робот работает";
        statusLabel.style.color = "#10b981";
        actionBtn.textContent = "ОСТАНОВИТЬ РОБОТА";
        actionBtn.style.background = "#ef4444";
        
        if (!logInterval) {
            logInterval = setInterval(fetchLiveLogs, 1000);
        }
    } else {
        statusLabel.textContent = "Робот остановлен";
        statusLabel.style.color = "#94a3b8";
        actionBtn.textContent = "ЗАПУСТИТЬ РОБОТА";
        actionBtn.style.background = "#3b82f6";
    }
}

// Прямой вызов переключения состояния робота
window.toggleRobotState = function() {
    const actionBtn = document.getElementById('actionBtn');
    if (!actionBtn) return;

    const isRunning = actionBtn.textContent.includes("ОСТАНОВИТЬ");
    const endpoint = isRunning ? '/api/robot/stop' : '/api/robot/start';

    if (!isRunning) {
        appendToConsole("Запуск робота...");
    } else {
        appendToConsole("Остановка робота...");
    }

    fetch(`${API_URL}${endpoint}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: Math.floor(Math.random() * 11) + 10 })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            checkRobotStatus();
        }
    })
    .catch(err => {
        appendToConsole("Ошибка управления роботом: " + err.message, true);
    });
};

window.openRobotModal = function() {
    let modal = document.getElementById('robotModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'robotModal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999; padding:15px;';
        modal.innerHTML = `
            <div style="background:#1e293b; color:white; width:100%; max-width:480px; border-radius:16px; padding:20px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0;">🤖 Панель Робота</h3>
                    <button onclick="document.getElementById('robotModal').style.display='none'" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">&times;</button>
                </div>
                <div id="statusLabel" style="font-weight:bold; margin-bottom:15px;">Проверка статуса...</div>
                <button id="actionBtn" onclick="window.toggleRobotState()" style="width:100%; padding:12px; border-radius:8px; border:none; color:white; font-weight:bold; cursor:pointer; background:#3b82f6; margin-bottom:15px;">ЗАПУСТИТЬ РОБОТА</button>
                <div id="consoleLog" style="background:#0f172a; height:180px; overflow-y:auto; border-radius:8px; padding:10px; font-family:monospace; font-size:0.8rem;">
                    <div>Ожидание запуска...</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.style.display = 'flex';
    }
    checkRobotStatus();
};

function checkRobotStatus() {
    fetch(`${API_URL}/api/robot/status`)
        .then(res => res.json())
        .then(data => {
            updateRobotUI(data.running);
            fetchLiveLogs();
        })
        .catch(() => {
            const statusLabel = document.getElementById('statusLabel');
            if (statusLabel) statusLabel.textContent = "Ошибка связи с сервером";
        });
}

// ==========================================
// 4. ИНИЦИАЛИЗАЦИЯ И ПРИВЯЗКА КНОПОК
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    // Перехват кликов по ВСЕМ кнопкам в шапке
    document.addEventListener('click', (e) => {
        const target = e.target.closest('button, a, div');
        if (!target) return;
        
        const text = target.textContent || '';
        if (text.includes('Робот')) {
            e.preventDefault();
            window.openRobotModal();
        } else if (text.includes('Корзина')) {
            e.preventDefault();
            window.openCartModal();
        }
    });
});
