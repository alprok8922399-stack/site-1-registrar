/**
 * Модуль финансовых расчетов и сплита средств (Сайт 1)
 * Базовая сумма покупки: 1000 M (эквивалент 130 USDT)
 */

function calculatePurchaseFinance(username, sponsor) {
    const TOTAL_AMOUNT = 1000; // 1000 M
    
    // 1. Покрытие себестоимости товара на внешнем маркетплейсе (45%)
    const supplierCost = 450; 
    
    // 2. Поступление в систему (55%) — 550 M
    const matrixReserve = 250;       // Постановка и резерв в бинарной матрице (Сайт 2)
    const referralReserve = 70;      // Заморозка на 31 день в Таблице (50M, 10M, 10M)
    const adminProfit = 230;         // Чистый мгновенный доход администратора

    return {
        success: true,
        username: username,
        sponsor: sponsor || 'System',
        totalMitrons: TOTAL_AMOUNT,
        distribution: {
            supplierCost: supplierCost,       // 450 M -> На сторонний маркетплейс
            matrixReserve: matrixReserve,     // 250 M -> В ячейку матрицы (Сайт 2)
            referralReserve: referralReserve, // 70 M  -> Резерв 31 день (50/10/10)
            adminProfit: adminProfit          // 230 M -> Чистый доход
        },
        paymentDate: new Date().toISOString(),
        timerDays: 31 // 31-дневный отказной период
    };
}

module.exports = {
    calculatePurchaseFinance
};
