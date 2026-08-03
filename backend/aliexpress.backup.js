/**
 * =========================================================
 * ПРОЕКТ MITRON — СAЙТ 1 (site-1-registrar)
 * Файловый путь: site-1-registrar/backend/services/aliexpress.js
 * Назначение: Модуль расчета цен и взаимодействия с AliExpress
 * =========================================================
 */

// Курс конвертации: 1000 M = 130 USD (1 M ≈ 0.13 USD)
const USD_TO_MITRON_RATE = 1000 / 130; 

/**
 * Расчет цены товара для витрины по формуле MITRON (Потолок / x2.2)
 * @param {Array<number>} prices - Массив найденных цен на AliExpress (в USD)
 * @returns {Object} Результат расчета стоимости в Митронах и USD
 */
function calculateMitronPrice(prices) {
    if (!prices || !Array.isArray(prices) || prices.length < 3) {
        throw new Error("Для корректного расчёта по ТЗ нужно минимум 3 предложения товара");
    }

    // Сортируем цены от меньшей к большей
    const sortedPrices = [...prices].sort((a, b) => a - b);

    // 1. Фиксируем минимальные (2-3 позиции) и максимальные (5-7 позиций) цены
    const minCount = Math.min(3, Math.floor(sortedPrices.length / 2)) || 1;
    const ceilingCount = Math.min(7, Math.ceil(sortedPrices.length / 2)) || 1;

    const minPrices = sortedPrices.slice(0, minCount);
    const ceilingPrices = sortedPrices.slice(-ceilingCount);

    // 2. Вычисляем средние значения (Min_avg и Ceiling_avg)
    const minAvgUSD = minPrices.reduce((sum, val) => sum + val, 0) / minPrices.length;
    const ceilingAvgUSD = ceilingPrices.reduce((sum, val) => sum + val, 0) / ceilingPrices.length;

    // 3. Проверяем разрыв (Ceiling_avg / Min_avg >= 2.2)
    const ratio = ceilingAvgUSD / minAvgUSD;
    let finalPriceUSD = 0;

    if (ratio >= 2.2) {
        finalPriceUSD = ceilingAvgUSD; // Выставляем по "Потолку"
    } else {
        finalPriceUSD = minAvgUSD * 2.2; // Гарантированный нижний порог x2.2
    }

    // 4. Переводим в Митроны (с округлением в большую сторону)
    const priceInMitrons = Math.ceil(finalPriceUSD * USD_TO_MITRON_RATE);

    return {
        originalMinUSD: Number(minAvgUSD.toFixed(2)),
        originalCeilingUSD: Number(ceilingAvgUSD.toFixed(2)),
        ratio: Number(ratio.toFixed(2)),
        finalPriceUSD: Number(finalPriceUSD.toFixed(2)),
        priceInMitrons: priceInMitrons, // Итоговая цена в M
        hasStar: true                   // Пометка '*'
    };
}

module.exports = { calculateMitronPrice };
