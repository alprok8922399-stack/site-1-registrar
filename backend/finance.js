/**
 * Модуль финансовой логики и DAO-распределения (Сайт 1)
 * Обрабатывает покупку сертификата на 1000 Митронов:
 * - 450 Митронов (45%) — Администрации / На оплату реального товара в маркетплейсе
 * - 550 Митронов (55%) — DAO Смарт-контракт:
 * - 500 Митронов (Прямому спонсору)
 * - 100 Митронов (Вышестоящему спонсору в глубину)
 * - 100 Митронов (Спонсору еще выше в глубину)
 * - 31 день — Выход на выплату вознаграждения в матрице (1 000 Митронов)
 */

/**
 * Расчет распределения средств при покупке сертификата
 */
function calculatePurchaseFinance(username, sponsor) {
    const totalAmount = 1000; // 1000 Митронов — общая стоимость сертификата

    // 1. Доля Администрации и Логистики
    const adminShare = 450;    // 45% (450 Митронов)
    const logisticsShare = 450; // На автоматический выкуп товара в международном маркетплейсе

    // 2. Доля DAO смарт-контракта (Маркетинг)
    const totalDaoBudget = 550; // 55% (550 Митронов)
    
    const directSponsorShare = 500; // Прямому спонсору (50%)
    const depthFirstShare = 100;    // Спонсору выше (10%)
    const depthSecondShare = 100;   // Спонсору еще выше (10%)

    return {
        success: true,
        username: username,
        sponsor: sponsor || 'System',
        totalMitrons: totalAmount,
        distribution: {
            adminWalletMitrons: adminShare,
            logisticsMitrons: logisticsShare,
            daoBudgetMitrons: totalDaoBudget,
            daoMarketing: {
                directSponsor: { recipient: sponsor || 'System', amount: directSponsorShare },
                depthLevel1: { amount: depthFirstShare },
                depthLevel2: { amount: depthSecondShare }
            }
        },
        paymentDate: new Date().toISOString(),
        payoutTimerDays: 31 // 31-дневный период до выхода на выплату (1000 Митронов)
    };
}

module.exports = {
    calculatePurchaseFinance
};
