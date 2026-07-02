const express = require('express');
const path = require('path');
const app = express();

// Указываем порт, который нам выдаст Render (или 3000 для локальных тестов)
const PORT = process.env.PORT || 3000;

// Говорим серверу отдавать статические файлы (HTML, CSS, JS) из папки frontend
// Используем '..', чтобы выйти из папки backend и заглянуть в соседнюю frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// При заходе на главный URL — отдаем наш index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер раздачи запущен на порту ${PORT}`);
});
