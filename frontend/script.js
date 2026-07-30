/**
 * Управление Генератором Роботов (Сайт 1)
 * Интеграция с модальным окном главной страницы
 */

const API_URL = ''; // Запросы идут на тот же адрес/порт

let logInterval = null;

// Функция для добавления строки в консоль
function appendToConsole(text, isError = false) {
    const consoleLog = document.getElementById('consoleLog');
    if (!consoleLog) return;
    
    if (consoleLog.innerHTML.includes("Ожидание запуска")) {
        consoleLog.innerHTML = "";
    }

    const line = document.createElement('div');
    line.className = isError ? 'log-line log-error' : 'log-line';
    
    const now = new Date();
    const timeStr = now.toISOString().split('T')[1].slice(0, 8);
    
    line.textContent = `[${timeStr}] ${text}`;
    consoleLog.appendChild(line);
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

// Загрузка логов с сервера
async function fetchLiveLogs() {
    const consoleLog = document.getElementById('consoleLog');
    if (!consoleLog) return;

    try {
        const res = await fetch(`${API_URL}/api/robot/logs`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data && Array.isArray(data.logs)) {
            if (data.logs.length === 0 && consoleLog.children.length > 5) {
                consoleLog.innerHTML = '<div class="log-line" style="color: #888;">Логи очищены сервером.</div>';
            }
            
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

// Обновление кнопок и статуса
function updateUI(isActive) {
    const statusLabel = document.getElementById('statusLabel');
    const actionBtn = document.getElementById('actionBtn');

    if (!statusLabel || !actionBtn) return;

    if (isActive) {
        statusLabel.textContent = "Робот работает";
        statusLabel.className = "status-box active";
        actionBtn.textContent = "ОСТАНОВИТЬ РОБОТА";
        actionBtn.style.background = "#d32f2f";
        
        if (!logInterval) {
            logInterval = setInterval(fetchLiveLogs, 1000);
        }
    } else {
        statusLabel.textContent = "Робот остановлен";
        statusLabel.className = "status-box";
        actionBtn.textContent = "ЗАПУСТИТЬ РОБОТА";
        actionBtn.style.background = "#3d5af1";
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const actionBtn = document.getElementById('actionBtn');

    // Проверка статуса
    fetch(`${API_URL}/api/robot/status`)
        .then(res => res.json())
        .then(data => {
            updateUI(data.running);
            fetchLiveLogs();
            if (!logInterval) {
                logInterval = setInterval(fetchLiveLogs, 1200);
            }
        })
        .catch(() => {
            const statusLabel = document.getElementById('statusLabel');
            if (statusLabel) statusLabel.textContent = "Ошибка соединения";
            appendToConsole("Критическая ошибка: Нет связи с сервером генератора", true);
        });

    // Обработка клика
    if (actionBtn) {
        actionBtn.addEventListener('click', () => {
            const statusLabel = document.getElementById('statusLabel');
            const isRunning = statusLabel && statusLabel.classList.contains('active');
            const endpoint = isRunning ? '/api/robot/stop' : '/api/robot/start';

            if (!isRunning) {
                appendToConsole("Запуск робота: регистрация (по 10-20 участников)...");
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
});

// Отслеживание закрытия
window.addEventListener('pagehide', () => {
    const statusLabel = document.getElementById('statusLabel');
    if (statusLabel && statusLabel.classList.contains('active')) {
        navigator.sendBeacon(`${API_URL}/api/robot/stop`);
    }
});
