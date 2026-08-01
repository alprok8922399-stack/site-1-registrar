/**
 * Модуль финансовой логики, отчислений и статистики (Сайт 1)
 * Соответствует регламенту ТЗ проекта «MITRON»
 */

// Временное хранилище отказов в памяти (для работы статистики)
const refundLogs = [];

/**
 * Расчет распределения средств при покупке (кратной 1000 Митронов):
 * - Максимальная стоимость товара на внешнем МП: 450 M за каждые 1000 M
 * - Системный резерв: 250 M за каждые 1000 M
 * - Реферальные вознаграждения: 70 M (50+10+10) за каждые 1000 M
 * -----------------------------------------------------
 * Базовый остаток = Входящая сумма - Обязательства
 * Фонд DAO (10% от базового остатка)
 * Чистая прибыль Администратора (90% от базового остатка)
 */
function calculatePurchaseFinance(username, sponsor, totalMitronsInput = 1000, actualGoodsCostInput = null) {
    const totalAmount = Number(totalMitronsInput) || 1000;
    const unitsCount = Math.max(1, Math.round(totalAmount / 1000));
    
    // Максимальная цена товара берется из расчета 450 M на каждые 1000 M заказа
    const maxAllowedGoodsCost = 450 * unitsCount;
    const goodsCost = actualGoodsCostInput !== null ? Math.min(actualGoodsCostInput, maxAllowedGoodsCost) : maxAllowedGoodsCost;
    
    // 1. Обязательства
    const systemReserve = 250 * unitsCount;                     // Системный резерв
    const refReserveTotal = 70 * unitsCount;                    // 50M (1 ур) + 10M (2 ур) + 10M (3 ур) на каждую единицу
    
    const totalObligations = goodsCost + systemReserve + refReserveTotal;
    
    // 2. Расчет базового остатка
    const baseRemainder = Math.max(0, totalAmount - totalObligations);
    
    // 3. Распределения из остатка
    const daoFundShare = Math.round(baseRemainder * 0.10);  // 10% в DAO
    const adminNetProfit = baseRemainder - daoFundShare;     // 90% Админу
    
    // В Выплатной кошелек уходит: Товары + Резерв + Реферальные + DAO
    const payoutWalletTotal = goodsCost + systemReserve + refReserveTotal + daoFundShare;

    return {
        success: true,
        username: username,
        sponsor: sponsor || 'System',
        totalMitrons: totalAmount,
        unitsCount: unitsCount,
        distribution: {
            adminWalletMitrons: totalAmount, // Первично 100% всей суммы заходит в Кошелек Админа
            payoutWalletMitrons: payoutWalletTotal, // Переводится в Выплатной шлюз
            logisticsMitrons: goodsCost,
            systemReserve: systemReserve,
            refReserve: {
                level1: 50 * unitsCount,
                level2: 10 * unitsCount,
                level3: 10 * unitsCount,
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
