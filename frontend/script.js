const statusLabel = document.getElementById('statusLabel');
const actionBtn = document.getElementById('actionBtn');
const consoleLog = document.getElementById('consoleLog');
const API_URL = ''; // Запросы идут на тот же адрес/порт, откуда открыт сайт

let logInterval = null;

// Функция для добавления строки в консоль на экране
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

// Функция для загрузки порции свежих логов с бэкенда Сайта №1
async function fetchLiveLogs() {
    try {
        const res = await fetch(`${API_URL}/api/robot/logs`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data && Array.isArray(data.logs)) {
            // Если сервер очистил логи или база сброшена
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
    } catch (err) {
        console.error("Ошибка обновления логов:", err);
    }
}

// Функция для обновления интерфейса кнопок
function updateUI(isActive) {
    if (isActive) {
        statusLabel.textContent = "Робот работает";
        statusLabel.classList.add('active');
        actionBtn.textContent = "ОСТАНОВИТЬ РОБОТА";
        actionBtn.className = "btn stop";
        
        if (!logInterval) {
            logInterval = setInterval(fetchLiveLogs, 1000);
        }
    } else {
        statusLabel.textContent = "Робот остановлен";
        statusLabel.classList.remove('active');
        actionBtn.textContent = "ЗАПУСТИТЬ РОБОТА";
        actionBtn.className = "btn";
    }
}

// Проверка статуса при загрузке страницы
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
        statusLabel.textContent = "Ошибка соединения";
        appendToConsole("Критическая ошибка: Нет связи с сервером генератора", true);
    });

// Обработка нажатия на кнопку управления роботом
actionBtn.addEventListener('click', () => {
    const isRunning = statusLabel.classList.contains('active');
    const endpoint = isRunning ? '/api/robot/stop' : '/api/robot/start';

    if (!isRunning) {
        appendToConsole("Запуск робота: порционная регистрация (по 10-20 участников)...");
    } else {
        appendToConsole("Остановка робота, завершение активных пачек...");
    }

    fetch(`${API_URL}${endpoint}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: Math.floor(Math.random() * 11) + 10 }) // Пакет 10-20 человек
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

// Отслеживаем закрытие вкладки через sendBeacon
window.addEventListener('pagehide', () => {
    if (statusLabel && statusLabel.classList.contains('active')) {
        navigator.sendBeacon(`${API_URL}/api/robot/stop`);
    }
});
