/**
 * Модуль финансовой логики, отчислений и статистики (Сайт 1)
 * Соответствует регламенту ТЗ проекта «MITRON»
 */

// Временное хранилище отказов в памяти (для работы статистики)
const refundLogs = [];

/**
 * Расчет распределения средств при покупке на 1000 Митронов (1 ячейка):
 * - Максимальная стоимость товара на внешнем МП: 450 M
 * - Резерв Лидеру в Матрицу (1/4 от 1000 M): 250 M
 * - Реферальные вознаграждения (50 + 10 + 10 M): 70 M
 * -----------------------------------------------------
 * Базовый остаток: 1000 - (450 + 250 + 70) = 230 M
 * Фонд DAO (10% от базового остатка): 23 M
 * Чистая прибыль Администратора (90% от базового остатка): 207 M
 */
function calculatePurchaseFinance(username, sponsor, actualGoodsCost = 450) {
    const totalAmount = 1000;
    
    // 1. Обязательства
    const goodsCost = Math.min(actualGoodsCost, 450); // Не более 450 M
    const leaderReserve = 250;                        // Резерв в Матрицу
    const refReserveTotal = 70;                       // 50M (1 ур) + 10M (2 ур) + 10M (3 ур)
    
    const totalObligations = goodsCost + leaderReserve + refReserveTotal;
    
    // 2. Расчет базового остатка
    const baseRemainder = totalAmount - totalObligations; // При 450 M = 230 M
    
    // 3. Распределения из остатка
    const daoFundShare = Math.round(baseRemainder * 0.10);  // 10% в DAO (23 M)
    const adminNetProfit = baseRemainder - daoFundShare;     // 90% Админу (207 M)
    
    // В Выплатной кошелек уходит: 450 + 250 + 70 + 23 = 793 M
    const payoutWalletTotal = goodsCost + leaderReserve + refReserveTotal + daoFundShare;

    return {
        success: true,
        username: username,
        sponsor: sponsor || 'System',
        totalMitrons: totalAmount,
        distribution: {
            adminWalletMitrons: totalAmount, // Первично 100% (1000 M) заходит в Кошелек Админа
            payoutWalletMitrons: payoutWalletTotal, // Переводится в Выплатной шлюз (793 M)
            logisticsMitrons: goodsCost,
            matrixLeaderReserve: leaderReserve,
            refReserve: {
                level1: 50,
                level2: 10,
                level3: 10,
                total: refReserveTotal
            },
            daoPool: daoFundShare,
            adminNetProfit: adminNetProfit
        },
        paymentDate: new Date().toISOString(),
        timerDays: 31 // 31-дневный таймер отмена/кешбэк
    };
}

/**
 * Регистрация отказа от покупки в течение 31 дня
 */
function logRefund(username, amount = 1000) {
    refundLogs.push({
        username: username,
        amount: amount,
        timestamp: Date.now(),
        date: new Date().toISOString()
    });
}

/**
 * Получение количества отказов за последние 24 часа (СЕГОДНЯ)
 */
function getRefusedTodayCount() {
    const now = Date.now();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    
    return refundLogs.filter(log => log.timestamp >= twentyFourHoursAgo).length;
}

/**
 * Получение общей статистики по отказам
 */
function getRefundStats() {
    return {
        totalRefused: refundLogs.length,
        refusedToday: getRefusedTodayCount()
    };
}

module.exports = {
    calculatePurchaseFinance,
    logRefund,
    getRefusedTodayCount,
    getRefundStats
};
