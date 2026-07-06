const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path'); // Добавили модуль для работы с путями
const app = express();

app.use(cors());
app.use(express.json());

// Железобетонная раздача фронтенда: показываем index.html при заходе на корень сайта "/"
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 4000;
const SITE_2_URL = 'https://site-2-tree.onrender.com/api/register';

app.post('/api/pay-and-register', async (req, res) => {
    const { login } = req.body;
    if (!login) return res.status(400).json({ success: false, error: 'Логин обязателен' });

    try {
        const response = await fetch(SITE_2_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login })
        });
        const result = await response.json();
        if (result.success) {
            return res.json({ success: true, message: `Передано!`, data: result.data });
        } else {
            return res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Ошибка сети до Сайта 2' });
    }
});

// На всякий случай, если основной статик промахнется на мобилке
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => console.log(`Регистратор запущен на порту ${PORT}`));
