/**
 * Единый скрипт Витрины, Корзины и Управления Роботом (Сайт 1)
 * Проект: MITRON
 */

const API_URL = ''; // Относительные запросы на свой бэкенд

let cart = [];
let logInterval = null;

// ==========================================
// 1. ВИРИНА И КАТАЛОГ ТОВАРОВ
// ==========================================

// Загрузка товаров от 1000 M до 5000 M
async function loadProducts() {
    const productsContainer = document.getElementById('productsContainer') || document.querySelector('.products-grid') || document.querySelector('#products');
    
    // Дефолтные товары, если бэкенд задерживает ответ
    const defaultProducts = [
        { id: 'p1000', name: 'Пакет Станция Mitron (1 Ячейка)', priceMitrons: 1000, description: 'Базовый товар. Дает 1 ячейку в матрице Сайта 2.' },
        { id: 'p2000', name: 'Пакет Бизнес Mitron (2 Ячейки)', priceMitrons: 2000, description: 'Двойной объем. Дает 2 ячейки в матрице Сайта 2.' },
        { id: 'p3000', name: 'Пакет Премиум Mitron (3 Ячейки)', priceMitrons: 3000, description: 'Тройной объем. Дает 3 ячейки в матрице Сайта 2.' },
        { id: 'p4000', name: 'Пакет Ультра Mitron (4 Ячейки)', priceMitrons: 4000, description: 'Оптимальный набор. Дает 4 ячейки в матрице Сайта 2.' },
        { id: 'p5000', name: 'Пакет Максимум Mitron (5 Ячеек)', priceMitrons: 5000, description: 'Максимальный комплект. Дает 5 ячеек в матрице Сайта 2.' }
    ];

    let products = defaultProducts;

    try {
        const res = await fetch(`${API_URL}/api/products`);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                products = data;
            }
        }
    } catch (err) {
        console.log("Используем локальный каталог товаров");
    }

    renderProducts(products);
}

function renderProducts(products) {
    let mainView = document.getElementById('productsContainer');
    
    if (!mainView) {
        mainView = document.createElement('div');
        mainView.id = 'productsContainer';
        mainView.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 15px; padding: 15px;';
        
        const heading = document.querySelector('h1, h2') || document.body;
        heading.after(mainView);
    }

    mainView.innerHTML = products.map(p => `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
                <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 1.1rem;">${p.name}</h3>
                <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 12px;">${p.description || ''}</p>
            </div>
            <div>
                <div style="font-size: 1.3rem; font-weight: bold; color: #10b981; margin-bottom: 12px;">${p.priceMitrons} M</div>
                <button onclick="addToCart('${p.id}', '${p.name}', ${p.priceMitrons})" style="width: 100%; background: #10b981; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;">В корзину</button>
            </div>
        </div>
    `).join('');
}

function addToCart(id, name, price) {
    cart.push({ id, name, price });
    updateCartUI();
    alert(`Товар "${name}" добавлен в корзину!`);
}

function updateCartUI() {
    const cartBtns = document.querySelectorAll('.cart-btn, #cartBtn, [href*="cart"]');
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    
    cartBtns.forEach(btn => {
        btn.textContent = `🛒 Корзина (${cart.length}) - ${total} M`;
    });
}

// ==========================================
// 2. УПРАВЛЕНИЕ ГЕНЕРАТОРОМ РОБОТОВ
// ==========================================

function appendToConsole(text, isError = false) {
    const consoleLog = document.getElementById('consoleLog');
    if (!consoleLog) return;
    
    if (consoleLog.innerHTML.includes("Ожидание запуска")) {
        consoleLog.innerHTML = "";
    }

    const line = document.createElement('div');
    line.className = isError ? 'log-line log-error' : 'log-line';
    line.style.padding = '4px 0';
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
        statusLabel.style.color = "#64748b";
        actionBtn.textContent = "ЗАПУСТИТЬ РОБОТА";
        actionBtn.style.background = "#3b82f6";
    }
}

// Открытие модального окна робота
function openRobotModal() {
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
                <button id="actionBtn" style="width:100%; padding:12px; border-radius:8px; border:none; color:white; font-weight:bold; cursor:pointer; background:#3b82f6; margin-bottom:15px;">Загрузка...</button>
                <div id="consoleLog" style="background:#0f172a; height:180px; overflow-y:auto; border-radius:8px; padding:10px; font-family:monospace; font-size:0.8rem;">
                    <div class="log-line">Ожидание запуска...</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        bindRobotEvents();
    } else {
        modal.style.display = 'flex';
    }
    checkRobotStatus();
}

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

function bindRobotEvents() {
    const actionBtn = document.getElementById('actionBtn');
    if (actionBtn) {
        actionBtn.onclick = () => {
            const actionBtnText = actionBtn.textContent;
            const isRunning = actionBtnText.includes("ОСТАНОВИТЬ");
            const endpoint = isRunning ? '/api/robot/stop' : '/api/robot/start';

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
            });
        };
    }
}

// ИНИЦИАЛИЗАЦИЯ
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    // Привязка синей кнопки Робота из шапки
    const robotBtns = document.querySelectorAll('#robotBtn, .robot-btn, button:contains("Робот")');
    robotBtns.forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            openRobotModal();
        };
    });

    // На случай если на кнопке нет id
    document.body.addEventListener('click', (e) => {
        if (e.target && e.target.textContent.includes('Робот')) {
            openRobotModal();
        }
    });
});
