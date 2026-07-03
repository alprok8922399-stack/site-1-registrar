let isRunning = false;
let userCount = 1;

const statusBox = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const logsContainer = document.getElementById('logs');

// Функция вывода логов на экран смартфона
function addLog(text) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerText = `> ${text}`;
    logsContainer.appendChild(entry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

// Главная функция, которая шлет запросы на Сайт №2
async function registerAutomatedUser() {
    // Если нажали Стоп — прерываем цикл
    if (!isRunning) return;

    const username = `AutoUser_${userCount}`;
    addLog(`Генерация: ${username}...`);

    try {
        const response = await fetch('https://site-2-tree.onrender.com/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: username })
        });

        const data = await response.json();

        if (response.ok) {
            // Надежный поиск имени ячейки
            const cellName = data.cellId || data.cell || data.id || 'Неизвестно';
            addLog(`✅ Успех! ${username} добавлен в ячейку ${cellName}`);
            userCount++;
        } else {
            addLog(`❌ Ошибка сервера: ${data.message || 'Неизвестный сбой'}`);
        }
    } catch (error) {
        addLog(`⚠️ Ошибка сети: Нет связи с Сайтом №2`);
    }

    // Ждем ровно 2 секунды ТОЛЬКО ПОСЛЕ того, как пришел ответ
    if (isRunning) {
        setTimeout(registerAutomatedUser, 2000);
    }
}

// Управление кнопкой Старт / Стоп
startBtn.addEventListener('click', () => {
    if (isRunning) {
        // Останавливаем автомат
        isRunning = false;
        startBtn.innerText = 'Запустить регистрацию';
        startBtn.style.backgroundColor = '#3498db';
        statusBox.innerText = 'Автомат остановлен';
        addLog('Робот остановлен пользователем.');
    } else {
        // Запускаем автомат
        isRunning = true;
        startBtn.innerText = 'Остановить регистрацию';
        startBtn.style.backgroundColor = '#e74c3c';
        statusBox.innerText = '🤖 Робот активно шлет запросы...';
        addLog('Робот запущен. Умный режим ожидания ответа.');
        
        // Запускаем умный цикл
        registerAutomatedUser();
    }
});
