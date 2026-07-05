const BACKEND_URL = "https://site-2-tree.onrender.com"; 

let isRunning = false;
let timerId = null;

const startBtn = document.getElementById('startBtn');
const statusBox = document.getElementById('status');
const logsContainer = document.getElementById('logs');

function addLog(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerText = `> ${message}`;
    logsContainer.appendChild(entry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

function generateRandomUsername() {
    const prefixes = ['user', 'client', 'buyer', 'partner', 'alpha', 'lucky', 'rich', 'shop'];
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${randomPrefix}_${randomNumber}`;
}

startBtn.addEventListener('click', () => {
    if (isRunning) {
        stopAutomation();
    } else {
        startAutomation();
    }
});

function startAutomation() {
    isRunning = true;
    startBtn.innerText = 'Остановить регистрацию';
    startBtn.style.backgroundColor = '#e74c3c';
    statusBox.innerText = 'Автомат запущен. Ожидание...';
    addLog('Запуск циклического робота.');
    runAutomationStep();
}

function stopAutomation() {
    isRunning = false;
    startBtn.innerText = 'Запустить регистрацию';
    startBtn.style.backgroundColor = '#3498db';
    statusBox.innerText = 'Автомат остановлен';
    addLog('Робот остановлен.');
    if (timerId) clearTimeout(timerId);
}

async function runAutomationStep() {
    if (!isRunning) return;

    const currentUsername = generateRandomUsername();
    statusBox.innerText = `Регистрация: ${currentUsername}...`;
    addLog(`Покупатель ${currentUsername} зашел на маркетплейс.`);

    try {
        const regResponse = await fetch(`${BACKEND_URL}/api/shop/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUsername })
        });

        const regData = await regResponse.json();

        if (!regResponse.ok) {
            addLog(`Ошибка регистрации: ${regData.error || 'Сбой'}`);
            timerId = setTimeout(runAutomationStep, 3000);
            return;
        }

        addLog(`Успех: ${currentUsername} зарегистрирован. Выбирает товар...`);
        statusBox.innerText = `Выбор товара (3 сек...)`;

        timerId = setTimeout(async () => {
            if (!isRunning) return;

            statusBox.innerText = `Оплата товара: ${currentUsername}...`;
            addLog(`Покупатель ${currentUsername} оплачивает товар...`);

            try {
                const payResponse = await fetch(`${BACKEND_URL}/api/shop/pay`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: currentUsername, amount: 10000 })
                });

                const payData = await payResponse.json();

                if (!payResponse.ok) {
                    addLog(`Ошибка оплаты: ${payData.error || 'Сбой'}`);
                } else {
                    addLog(`💰 Успешная оплата! Ник ${currentUsername} тайно улетел в матрицу.`);
                }
            } catch (payError) {
                addLog(`Сбой сети при оплати: ${payError.message}`);
            }

            statusBox.innerText = 'Ожидание следующего покупателя...';
            timerId = setTimeout(runAutomationStep, 3000);

        }, 3000);

    } catch (regError) {
        addLog(`Сбой сети: ${regError.message}`);
        timerId = setTimeout(runAutomationStep, 3000);
    }
}
