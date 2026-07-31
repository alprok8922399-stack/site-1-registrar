/**
 * Модуль финансовой логики, отчислений и статистики (Сайт 1)
 * Соответствует регламенту ТЗ проекта «MITRON»
 */

// Временное хранилище отказов в памяти (для работы статистики)
const refundLogs = [];

/**
 * Расчет распределения средств при покупке (кратной 1000 Митронов):
 * - Максимальная стоимость товара на внешнем МП: 450 M за каждые 1000 M
 * - Резерв Лидеру в Матрицу: 250 M за каждые 1000 M
 * - Реферальные вознаграждения: 70 M (50+10+10) за каждые 1000 M
 * -----------------------------------------------------
 * Базовый остаток = Входящая сумма - Обязательства
 * Фонд DAO (10% от базового остатка)
 * Чистая прибыль Администратора (90% от базового остатка)
 */
function calculatePurchaseFinance(username, sponsor, totalMitronsInput = 1000, actualGoodsCostInput = null) {
    const totalAmount = Number(totalMitronsInput) || 1000;
    const cellsCount = Math.max(1, Math.round(totalAmount / 1000));
    
    // Максимальная цена товара берется из расчета 450 M на каждую ячейку в 1000 M
    const maxAllowedGoodsCost = 450 * cellsCount;
    const goodsCost = actualGoodsCostInput !== null ? Math.min(actualGoodsCostInput, maxAllowedGoodsCost) : maxAllowedGoodsCost;
    
    // 1. Обязательства
    const leaderReserve = 250 * cellsCount;                     // Резерв в Матрицу
    const refReserveTotal = 70 * cellsCount;                   // 50M (1 ур) + 10M (2 ур) + 10M (3 ур) на каждую ячейку
    
    const totalObligations = goodsCost + leaderReserve + refReserveTotal;
    
    // 2. Расчет базового остатка
    const baseRemainder = Math.max(0, totalAmount - totalObligations);
    
    // 3. Распределения из остатка
    const daoFundShare = Math.round(baseRemainder * 0.10);  // 10% в DAO
    const adminNetProfit = baseRemainder - daoFundShare;     // 90% Админу
    
    // В Выплатной кошелек уходит: Товары + Матрица + Реферальные + DAO
    const payoutWalletTotal = goodsCost + leaderReserve + refReserveTotal + daoFundShare;

    return {
        success: true,
        username: username,
        sponsor: sponsor || 'System',
        totalMitrons: totalAmount,
        cellsCount: cellsCount,
        distribution: {
            adminWalletMitrons: totalAmount, // Первично 100% всей суммы заходит в Кошелек Админа
            payoutWalletMitrons: payoutWalletTotal, // Переводится в Выплатной шлюз
            logisticsMitrons: goodsCost,
            matrixLeaderReserve: leaderReserve,
            refReserve: {
                level1: 50 * cellsCount,
                level2: 10 * cellsCount,
                level3: 10 * cellsCount,
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
