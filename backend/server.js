const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Используем node-fetch для отправки запросов на Сайт 2
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// URL твоего второго сайта на Render, куда робот будет слать логины
const SITE_2_URL = 'https://site-2-tree.onrender.com/api/register';

// Эндпоинт, куда фронтенд Сайта 1 будет слать данные формы
app.post('/api/pay-and-register', async (req, res) => {
    const { login } = req.body;
    
    if (!login) {
        return res.status(400).json({ success: false, error: 'Логин обязателен' });
    }

    try {
        // Перенаправляем логин на Сайт 2 (в матричный движок)
        const response = await fetch(SITE_2_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login })
        });

        const result = await response.json();

        if (result.success) {
            return res.json({ 
                success: true, 
                message: `Робот успешно передал логин ${login} на Сайт 2!`,
                data: result.data 
            });
        } else {
            return res.status(500).json({ 
                success: false, 
                error: 'Сайт 2 отклонил регистрацию', 
                details: result.error 
            });
        }

    } catch (error) {
        console.error('Ошибка моста между сайтами:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Не удалось связаться с Сайтом 2 (Ошибка сети или деплоя)' 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Регистратор Сайта 1 запущен на порту ${PORT}`);
});
