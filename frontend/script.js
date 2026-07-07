const statusLabel = document.getElementById('statusLabel');
const actionBtn = document.getElementById('actionBtn');

// Относительный URL — берет хост, с которого открыта страница
const BRIDGE_URL = ''; 

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
        .catch((err) => {
            console.error(err);
            statusLabel.textContent = "Ошибка соединения с мостом";
        });
}

checkStatus();

actionBtn.addEventListener('click', () => {
    const isRunning = statusLabel.classList.contains('active');
    const endpoint = isRunning ? '/api/robot/stop' : '/api/robot/start';

    fetch(`${BRIDGE_URL}${endpoint}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data && data.hasOwnProperty('running')) {
                updateUI(data.running);
            } else {
                checkStatus();
            }
        })
        .catch(() => alert('Не удалось изменить состояние робота'));
});
