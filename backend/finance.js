/**
 * =========================================================
 * ПРОЕКТ MITRON — САЙТ 1 (site-1-registrar)
 * Файловый путь: site-1-registrar/backend/finance.js
 * Назначение: Модуль финансовой логики, отчислений и статистики
 * Соответствует новому окончательному ТЗ проекта «MITRON»
 * =========================================================
 */

// Хранилище логов отказов в памяти
const refundLogs = [];

/**
 * Расчет распределения средств при покупке (кратной 1000 Митронов):
 * -----------------------------------------------------
 * 1) Стоимость выкупа товара (X): макс. 450 M на каждые 1000 M
 * 2) Резерв в Матрицу (на верхнюю ячейку): 250 M
 * 3) Реферальные выплаты (50 + 10 + 10): 70 M
 * 4) Лидерский бонус ветки (если есть Лидер с 10+ личниками): 7 M
 * 5) Фонд DAO: 23 M
 * 6) Чистая прибыль Администратора: 200 M
 * -----------------------------------------------------
 * Итого по ТЗ: 450 + 250 + 70 + 7 + 23 + 200 = 1000 M
 */
function calculatePurchaseFinance(username, sponsor, totalMitronsInput = 1000, actualGoodsCostInput = null, hasLeader = false) {
    const totalAmount = Number(totalMitronsInput) || 1000;
    const unitsCount = Math.max(1, Math.round(totalAmount / 1000));
    
    // Максимальная цена товара из расчета 450 M на каждые 1000 M заказа
    const maxAllowedGoodsCost = 450 * unitsCount;
    const goodsCost = actualGoodsCostInput !== null ? Math.min(actualGoodsCostInput, maxAllowedGoodsCost) : maxAllowedGoodsCost;
    
    // 1. Фиксированные базовые обязательства по ТЗ (на 1000 M)
    const systemReserve = 250 * unitsCount;  // 250M на верхнюю ячейку в матрицу (на кешбэк через 33 дня)
    const refReserveTotal = 70 * unitsCount; // 50M (1 ур) + 10M (2 ур) + 10M (3 ур)
    const leaderBonus = (hasLeader ? 7 : 0) * unitsCount; // 7M Лидерский бонус ветки
    const daoFundShare = 23 * unitsCount;    // 23M Фонд DAO
    
    // 2. Расчет чистой прибыли Администратора (с учетом экономии на закупке товара)
    const savedOnGoods = maxAllowedGoodsCost - goodsCost;
    const adminNetProfit = (200 * unitsCount) + savedOnGoods; // Базово 200M + экономия при закупке < 450M

    // В Выплатной шлюз уходят: Закупка + Резерв + Рефералка + Лидерские + DAO
    const payoutWalletTotal = goodsCost + systemReserve + refReserveTotal + leaderBonus + daoFundShare;

    return {
        success: true,
        username: username,
        sponsor: sponsor || 'System',
        totalMitrons: totalAmount,
        unitsCount: unitsCount,
        distribution: {
            adminWalletMitrons: totalAmount,       // Первично 100% всей суммы заходит в Кошелек Админа
            payoutWalletMitrons: payoutWalletTotal, // Переводится в Выплатной шлюз
            logisticsMitrons: goodsCost,           // 450 M (или менее)
            systemReserve: systemReserve,          // 250 M
            refReserve: {
                level1: 50 * unitsCount,
                level2: 10 * unitsCount,
                level3: 10 * unitsCount,
                total: refReserveTotal             // 70 M
            },
            leaderBonus: leaderBonus,              // 7 M (или 0)
            daoPool: daoFundShare,                 // 23 M
            adminNetProfit: adminNetProfit         // 200 M (при закупке 450M)
        },
        paymentDate: new Date().toISOString(),
        timerDays: 33 // 33-дневный таймер отмена/кешбэк
    };
}

/**
 * Регистрация отказа от покупки в течение 33 дней
 */
function logRefund(username, amount = 1000) {
    const unitsCount = Math.max(1, Math.round(amount / 1000));
    refundLogs.push({
        username: username,
        amount: amount,
        unitsCount: unitsCount,
        timestamp: Date.now(),
        date: new Date().toISOString()
    });
}

/**
 * Получение количества отказов (ячеек и пользователей) за последние 24 часа (СЕГОДНЯ)
 */
function getRefusedTodayCount() {
    const now = Date.now();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    const todayLogs = refundLogs.filter(log => log.timestamp >= twentyFourHoursAgo);
    
    const unitsToday = todayLogs.reduce((sum, item) => sum + item.unitsCount, 0);
    const uniqueUsersToday = new Set(todayLogs.map(item => item.username)).size;

    return {
        usersCount: uniqueUsersToday,
        unitsCount: unitsToday
    };
}

/**
 * Получение полной сводной статистики по отказам
 */
function getRefundStats() {
    const totalUnitsRefused = refundLogs.reduce((sum, item) => sum + item.unitsCount, 0);
    const totalAmountRefused = refundLogs.reduce((sum, item) => sum + item.amount, 0);
    const uniqueUsersRefused = new Set(refundLogs.map(item => item.username)).size;
    
    const todayData = getRefusedTodayCount();

    return {
        totalUsersRefused: uniqueUsersRefused,
        totalUnitsRefused: totalUnitsRefused,
        totalAmountRefused: totalAmountRefused,
        refusedTodayUsers: todayData.usersCount,
        refusedTodayUnits: todayData.unitsCount
    };
}

/**
 * Перерасчет глобальной финансовой аналитики карточки
 */
function calculateGlobalAnalytics(allPurchases = [], allUsers = []) {
    const activePurchases = allPurchases.filter(p => !p.isRefunded);
    
    let totalMitrons = 0;
    let logisticsTotal = 0;
    let systemReserveTotal = 0;
    let refReserveTotal = 0;
    let leaderBonusTotal = 0;
    let daoPoolTotal = 0;
    let adminNetProfitTotal = 0;
    let totalActiveUnits = 0;

    activePurchases.forEach(p => {
        const finData = calculatePurchaseFinance(p.username, p.sponsor, p.totalMitrons, p.actualGoodsCost, p.hasLeader);
        totalMitrons += finData.totalMitrons;
        logisticsTotal += finData.distribution.logisticsMitrons;
        systemReserveTotal += finData.distribution.systemReserve;
        refReserveTotal += finData.distribution.refReserve.total;
        leaderBonusTotal += finData.distribution.leaderBonus;
        daoPoolTotal += finData.distribution.daoPool;
        adminNetProfitTotal += finData.distribution.adminNetProfit;
        totalActiveUnits += finData.unitsCount;
    });

    const refundStats = getRefundStats();
    const activeBuyersSet = new Set(activePurchases.map(p => p.username));

    return {
        totalMitrons: totalMitrons,
        logisticsTotal: logisticsTotal,
        buyersCount: activeBuyersSet.size,
        refusedTodayText: `${refundStats.refusedTodayUsers} чел. (${refundStats.refusedTodayUnits} яч.)`,
        refusedTotalText: `${refundStats.totalUsersRefused} чел. (${refundStats.totalUnitsRefused} яч.)`,
        cashbackPaid: 0,
        refReserveTotal: refReserveTotal,
        leaderBonusTotal: leaderBonusTotal,
        systemReserveTotal: systemReserveTotal,
        daoPoolTotal: daoPoolTotal,
        adminNetProfitTotal: adminNetProfitTotal,
        totalMatrixSlots: totalActiveUnits + refundStats.totalUnitsRefused,
        adminLoginsCount: 1,
        buyerLoginsCount: activeBuyersSet.size
    };
}

module.exports = {
    calculatePurchaseFinance,
    logRefund,
    getRefusedTodayCount,
    getRefundStats,
    calculateGlobalAnalytics
};
