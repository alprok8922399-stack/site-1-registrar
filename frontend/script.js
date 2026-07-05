const SERVER_1_URL = 'https://site-2-tree.onrender.com';

const statusLabel = document.getElementById('statusLabel');
const actionBtn = document.getElementById('actionBtn');
let isRunning = false;

async function checkStatus() {
    try {
        const response = await fetch(`${SERVER_1_URL}/api/robot/status`);
        if (!response.ok) throw new Error('Ответ сети не OK');
        const data = await response.json();
        
        isRunning = data.active;
        updateUI();
    } catch (err) {
        console.error("Ошибка проверки статуса:", err);
        statusLabel.innerText = "Сбой связи с сервером 1";
        statusLabel.className = "status-box";
        actionBtn.innerText = "Повторить проверку";
    }
}

function updateUI() {
    if (isRunning) {
        statusLabel.innerText = "РОБОТ РАБОТАЕТ";
        statusLabel.className = "status-box active";
        actionBtn.innerText = "Остановить регистрацию";
        actionBtn.className = "btn stop";
    } else {
        statusLabel.innerText = "РОБОТ ОСТАНОВЛЕН";
        statusLabel.className = "status-box";
        actionBtn.innerText = "Начать регистрацию";
        actionBtn.className = "btn";
    }
}

actionBtn.addEventListener('click', async () => {
    const endpoint = isRunning ? '/api/robot/stop' : '/api/robot/start';
    
    actionBtn.disabled = true;
    actionBtn.innerText = "Обработка...";
    
    try {
        const response = await fetch(`${SERVER_1_URL}${endpoint}`, { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            isRunning = !isRunning;
        } else {
            alert(data.message || "Ошибка сервера");
        }
    } catch (err) {
        alert("Не удалось отправить команду: " + err.message);
    } finally {
        actionBtn.disabled = false;
        updateUI();
    }
});

// Первая проверка при старте
checkStatus();
// Синхронизация каждые 3 секунды
setInterval(checkStatus, 3000);
