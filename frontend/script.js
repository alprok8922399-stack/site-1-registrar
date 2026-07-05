const statusLabel = document.getElementById('statusLabel');
const actionBtn = document.getElementById('actionBtn');

// Функция для обновления интерфейса
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

// Проверка статуса при загрузке страницы
fetch('/api/robot/status')
    .then(res => res.json())
    .then(data => updateUI(data.running))
    .catch(() => statusLabel.textContent = "Ошибка соединения");

// Обработка нажатия на кнопку
actionBtn.addEventListener('click', () => {
    const isRunning = statusLabel.classList.contains('active');
    const endpoint = isRunning ? '/api/robot/stop' : '/api/robot/start';

    fetch(endpoint, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Если запрос прошел, обновляем статус с сервера
                fetch('/api/robot/status')
                    .then(res => res.json())
                    .then(data => updateUI(data.running));
            }
        });
});
