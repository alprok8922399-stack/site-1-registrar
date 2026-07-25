/**
 * Клиентский скрипт связи панели управления Сайта №1 (script.js)
 * Связывает UI с REST API бэкенда (управление роботом, живые логи, баланс кошелька Админа)
 */

const statusLabel = document.getElementById('statusLabel');
const actionBtn = document.getElementById('actionBtn');
const consoleLog = document.getElementById('consoleLog');
const adminBalanceDisplay = document.getElementById('adminBalanceDisplay');

const API_URL = ''; // Запросы идут на тот же адрес/порт, откуда открыт сайт

let logInterval = null;

/**
 * Функция добавления строки в интерактивную консоль
 */
function appendToConsole(text, isError = false) {
    if (!consoleLog) return;
    
    // Удаляем стартовую заглушку, если она есть
    if (consoleLog.innerHTML.includes("Ожидание запуска робота")) {
        consoleLog.innerHTML = "";
    }

    const line = document.createElement('div');
    line.className = isError ? 'log-line log-error' : 'log-line';
    
    // Форматируем время
    const now = new Date();
    const timeStr = now.toISOString().split('T')[1].slice(0, 8);
    
    line.textContent = `[${timeStr}] ${text}`;
    consoleLog.appendChild(line);

    // Автоматический скролл консоли вниз к последнему событию
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

/**
 * Загрузка свежих логов и баланса Кошелька Администрации
 */
async function fetchLiveLogs() {
    try {
        const res = await fetch(`${API_URL}/api/robot/logs`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data && Array.isArray(data.logs)) {
            // Если сервер очистил логи
            if (data.logs.length === 0 && consoleLog.children.length > 5) {
                consoleLog.innerHTML = '<div class="log-line" style="color: #888;">Логи очищены сервером.</div>';
            }
            
            // Выводим только новые строки
            const currentLinesCount = consoleLog.getElementsByClassName('log-line').length;
            if (data.logs.length > currentLinesCount) {
                for (let i = currentLinesCount; i < data.logs.length; i++) {
                    appendToConsole(data.logs[i]);
                }
            }
        }

        // Обновляем баланс кошелька администрации (если передан)
        if (data && typeof data.adminWalletBalance !== 'undefined' && adminBalanceDisplay) {
            adminBalanceDisplay.textContent = `${data.adminWalletBalance} M`;
        }
    } catch (err) {
        console.error("Ошибка обновления логов:", err);
    }
}

/**
 * Обновление статуса и визуальных состояний кнопок
 */
function updateUI(isActive) {
    if (!statusLabel || !actionBtn) return;

    if (isActive) {
        statusLabel.textContent = "🟢 Робот работает (эмуляция покупок)";
        statusLabel.classList.add('active');
        actionBtn.textContent = "⏹️ ОСТАНОВИТЬ РОБОТА";
        actionBtn.className = "btn stop";
        
        if (!logInterval) {
            logInterval = setInterval(fetchLiveLogs, 1200);
        }
    } else {
        statusLabel.textContent = "🔴 Робот остановлен";
        statusLabel.classList.remove('active');
        actionBtn.textContent = "▶️ ЗАПУСТИТЬ РОБОТА";
        actionBtn.className = "btn";
    }
}

/**
 * Первичная инициализация при загрузке страницы
 */
document.addEventListener('DOMContentLoaded', () => {
    fetch(`${API_URL}/api/robot/status`)
        .then(res => res.json())
        .then(data => {
            updateUI(data.running);
            fetchLiveLogs();
            setInterval(fetchLiveLogs, 1500);
        })
        .catch(() => {
            if (statusLabel) statusLabel.textContent = "⚠️ Ошибка соединения с сервером";
            appendToConsole("Критическая ошибка: Нет связи с сервером Сайта №1", true);
        });
});

/**
 * Обработка нажатия на кнопку управления роботом
 */
if (actionBtn) {
    actionBtn.addEventListener('click', () => {
        const isRunning = statusLabel.classList.contains('active');
        const endpoint = isRunning ? '/api/robot/stop' : '/api/robot/start';

        if (!isRunning) {
            appendToConsole("Отправка команды на запуск эмулятора трафика...");
        } else {
            appendToConsole("Остановка робота, завершение текущих транзакций...");
        }

        fetch(`${API_URL}${endpoint}`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    fetch(`${API_URL}/api/robot/status`)
                        .then(res => res.json())
                        .then(data => updateUI(data.running));
                }
            })
            .catch(err => {
                appendToConsole("Не удалось изменить состояние робота", true);
            });
    });
}

/**
 * Защита от зависания процессов при закрытии страницы
 */
window.addEventListener('pagehide', () => {
    if (statusLabel && statusLabel.classList.contains('active')) {
        navigator.sendBeacon(`${API_URL}/api/robot/stop`);
    }
});
