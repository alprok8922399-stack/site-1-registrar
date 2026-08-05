/**
 * =========================================================
 * ПРОЕКТ MITRON — САЙТ 1 (site-1-registrar)
 * Файловый путь: site-1-registrar/backend/finance.js
 * Назначение: Модуль финансовой логики, отчислений и статистики
 * Соответствует новому регламенту ТЗ проекта «MITRON»
 * =========================================================
 */

// Хранилище логов отказов в памяти
const refundLogs = [];

/**
 * Расчет распределения средств при покупке (кратной 1000 Митронов):
 * - Максимальная стоимость товара на внешнем МП: 450 M за каждые 1000 M
 * - Системный резерв под кешбэк 100%: 250 M за каждые 1000 M
 * - Замороженные реферальные вознаграждения: 70 M (50+10+10) за каждые 1000 M
 * - Бонус Лидеру ветки: 7 M за каждые 1000 M
 * -----------------------------------------------------
 * Фиксированные обязательства = 450 + 250 + 70 + 7 = 777 M
 * Базовый остаток = 1000 M - 777 M = 223 M
 * Фонд DAO (10% от базового остатка): 23 M
 * Чистая прибыль Администратора: 223 M - 23 M = 200 M (Ровно)
 */
function calculatePurchaseFinance(username, sponsor, totalMitronsInput = 1000, actualGoodsCostInput = null) {
    const totalAmount = Number(totalMitronsInput) || 1000;
    const unitsCount = Math.max(1, Math.round(totalAmount / 1000));
    
    // Максимальная цена товара из расчета 450 M на каждые 1000 M заказа
    const maxAllowedGoodsCost = 450 * unitsCount;
    const goodsCost = actualGoodsCostInput !== null ? Math.min(actualGoodsCostInput, maxAllowedGoodsCost) : maxAllowedGoodsCost;
    
    // 1. Обязательства платформы
    const systemReserve = 250 * unitsCount;                // Системный резерв под 100% кешбэк
    const refReserveTotal = 70 * unitsCount;               // 50M (1 ур) + 10M (2 ур) + 10M (3 ур) резерв на 33 дня
    const leaderBonusTotal = 7 * unitsCount;               // Бонус лидеру ветки (7 M за каждые 1000 M)
    
    const totalObligations = goodsCost + systemReserve + refReserveTotal + leaderBonusTotal;
    
    // 2. Расчет базового остатка (включая экономию при дешевом закупе товара)
    const baseRemainder = Math.max(0, totalAmount - totalObligations);
    
    // 3. Распределения из базового остатка (DAO и Прибыль Админа)
    // При максимальной цене товара 450M: базовый остаток = 223M -> DAO = 23M, Админ = 200M
    const daoFundShare = Math.round(baseRemainder * 0.10); // 10% в DAO (23 M)
    const adminNetProfit = baseRemainder - daoFundShare;   // Остаток Админу (200 M)

    // В Выплатной кошелек уходит: Товары + Резерв + Реферальные + Лидерские + DAO (800 M при макс. цене товара)
    const payoutWalletTotal = goodsCost + systemReserve + refReserveTotal + leaderBonusTotal + daoFundShare;

    return {
        success: true,
        username: username,
        sponsor: sponsor || 'System',
        totalMitrons: totalAmount,
        unitsCount: unitsCount,
        distribution: {
            adminWalletMitrons: totalAmount,      // Первично 100% всей суммы заходит в Кошелек Админа
            payoutWalletMitrons: payoutWalletTotal, // Переводится в Выплатной шлюз (800 M)
            logisticsMitrons: goodsCost,
            systemReserve: systemReserve,
            refReserve: {
                level1: 50 * unitsCount,
                level2: 10 * unitsCount,
                level3: 10 * unitsCount,
                total: refReserveTotal
            },
            leaderBonus: leaderBonusTotal,
            daoPool: daoFundShare,
            adminNetProfit: adminNetProfit       // Ровно 200 M
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
 * Перерасчет глобальной финансовой аналитики карточки с учетом вычета отмененных заказов
 */
function calculateGlobalAnalytics(allPurchases = [], allUsers = []) {
    // Отфильтровываем отмененные покупки
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
        const finData = calculatePurchaseFinance(p.username, p.sponsor, p.totalMitrons, p.actualGoodsCost);
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

    // Считаем уникальных покупателей, у которых есть ХОТЯ БЫ ОДИН активный заказ
    const activeBuyersSet = new Set(activePurchases.map(p => p.username));

    return {
        totalMitrons: totalMitrons,                                 // Чистый приход (минус отмены)
        logisticsTotal: logisticsTotal,                             // Затраты на товары MP
        buyersCount: activeBuyersSet.size,                          // Только реальные активные покупатели
        refusedTodayText: `${refundStats.refusedTodayUsers} чел. (${refundStats.refusedTodayUnits} яч.)`,
        refusedTotalText: `${refundStats.totalUsersRefused} чел. (${refundStats.totalUnitsRefused} яч.)`,
        cashbackPaid: 0,                                            // Кешбэк
        refReserveTotal: refReserveTotal,                           // Замороженный резерв реферальных (на 33 дня)
        systemReserveTotal: systemReserveTotal,                     // Замороженный системный резерв под кешбэк
        leaderBonusTotal: leaderBonusTotal,                         // Выплаты/резерв Лидерам ветки
        daoPoolTotal: daoPoolTotal,                                 // Фонд DAO (10%)
        adminNetProfitTotal: adminNetProfitTotal,                   // Чистая прибыль Админа (ровно 200M с 1000M)
        totalMatrixSlots: totalActiveUnits + refundStats.totalUnitsRefused, // Всего ячеек в структуре
        adminLoginsCount: 1,                                        // Логин системного админа
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
