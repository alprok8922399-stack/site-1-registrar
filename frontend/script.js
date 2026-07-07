const statusLabel = document.getElementById('statusLabel');
const actionBtn = document.getElementById('actionBtn');
const BRIDGE_URL = 'http://localhost:4000'; // Запросы идут на мост Сайта 1

function updateUI(isActive) {
    if (isActive) {
        statusLabel.textContent = "Робот работает";
        statusLabel.classList.add('active');
        actionBtn.textContent = "ОСТАНОВИТЬ РОБОТА";
        actionBtn.className = "btn stop";
    } else {
        statusLabel.textContent = "Робот остановлен";
        statusLabel.classList.remove('active');
        actionBtn.textContent = "ЗАПУСТИТЬ РОБОТА";
        actionBtn.className = "btn";
    }
}

function checkStatus() {
    fetch(`${BRIDGE_URL}/api/robot/status`)
        .then(res => res.json())
        .then(data => updateUI(data.running))
        .catch(() => statusLabel.textContent = "Ошибка соединения с мостом");
}

checkStatus();

actionBtn.addEventListener('click', () => {
    const isRunning = statusLabel.classList.contains('active');
    const endpoint = isRunning ? '/api/robot/stop' : '/api/robot/start';

    fetch(`${BRIDGE_URL}${endpoint}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.hasOwnProperty('running')) {
                updateUI(data.running);
            } else {
                checkStatus();
            }
        })
        .catch(() => alert('Не удалось изменить состояние робота'));
});
