const payBtn = document.getElementById('payBtn');
const message = document.getElementById('message');

payBtn.addEventListener('click', async () => {
    const userName = document.getElementById('userInput').value;
    message.textContent = "Робот обрабатывает оплату...";
    
    // Робот генерирует случайный логин
    const randomLogin = `User_${Math.floor(Math.random() * 9000) + 1000}`;
    
    // Имитация задержки оплаты
    await new Promise(r => setTimeout(r, 2000));
    
    // Отправка на Сайт №2
    const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ realName: userName, login: randomLogin })
    });
    
    const result = await response.json();
    message.textContent = result.success ? `Успех! Ячейка: ${result.cell}` : "Ошибка оплаты";
});
