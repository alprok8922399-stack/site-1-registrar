/**
 * Модуль финансовой логики и DAO-распределения (Сайт 1)
 * Обрабатывает покупку сертификата на 1000 Митронов:
 * - 450 Митронов (45%) — Администрации
 * - 550 Митронов (55%) — DAO Смарт-контракт (500 спонсору, по 100 в глубину)
 * - 450 Митронов — Реальная логистика товара
 */

/**
 * Расчет распределения средств при покупке сертификата
 */
function calculatePurchaseFinance(username, sponsor) {
    const totalAmount = 1000; // 1000 Митронов общая стоимость сертификата
    
    const adminShare = 450;    // 45% в кошелек администрации
    const logisticsShare = 450; // На оплату реального товара в маркетплейсе
    
    // DAO распределение маркетинга (550 Митронов)
    const directSponsorShare = 500; // Прямому спонсору
    const depthFirstShare = 100;     // Спонсору выше (в глубину)
    const depthSecondShare = 100;    // Спонсору еще выше (в глубину)

    return {
        success: true,
        username: username,
        sponsor: sponsor || 'System',
        totalMitrons: totalAmount,
        distribution: {
            adminWalletMitrons: adminShare,
            logisticsMitrons: logisticsShare,
            daoMarketing: {
                directSponsor: { recipient: sponsor || 'System', amount: directSponsorShare },
                depthLevel1: { amount: depthFirstShare },
                depthLevel2: { amount: depthSecondShare }
            }
        },
        paymentDate: new Date().toISOString(),
        timerDays: 31 // 31-дневный таймер выплат
    };
}

module.exports = {
    calculatePurchaseFinance
};
