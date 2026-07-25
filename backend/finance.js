/**
 * Модуль финансовой логики и движения потоков (Сайт 1)
 *
 * ЖЕЛЕЗНЫЕ ПРАВИЛА ТЗ ПРОЕКТА «MITRON»:
 * 1. 100% средств (1000 M за 1 ячейку) поступают в Кошелек Администрации на Сайте 1.
 * 2. Часть средств идет на авто-выкуп реального товара на внешнем маркетплейсе.
 * 3. На Сайте 2 резервируется:
 * - В Матрице: 250 M с каждой из 4 нижних ячеек (всего 1000 M на кешбэк вершине).
 * - В Таблице: 50 M (спонсор L1), 10 M (спонсор L2), 10 M (спонсор L3).
 * 4. 31-дневный таймер:
 * - При отказе (до 31 дня) — 100% возврат средств Покупателю, удаление с Сайта 1,
 * передача ячейки в Матрице и Таблице системному аккаунту Admin_System.
 * - По истечении 31 дня — каскадный перевод Кешбэка 1000 M Лидеру.
 */

const PAYOUT_TIMER_DAYS = 31;
const MITRON_CELL_PRICE = 1000;

/**
 * Расчет первичного зачисления 100% средств и резервов
 * @param {string} username - Логин Покупателя (DAO ID)
 * @param {string} sponsor - Логин Спонсора
 * @param {number} totalAmount - Сумма покупки в Митронах (например, 1000, 2000, 3000...)
 */
function calculatePurchaseFinance(username, sponsor, totalAmount = MITRON_CELL_PRICE) {
    const cellsCount = Math.round(totalAmount / MITRON_CELL_PRICE);

    // 1. 100% средств поступает в Кошелек Администрации
    const adminWalletShare = totalAmount;

    // 2. Расчет виртуального резервирования на Сайте 2 на одну ячейку (1000 M)
    const site2Reservations = {
        matrixReservePerCell: 250, // 250 M * 4 = 1000 M (на верхнюю ячейку)
        tableRefReserve: {
            sponsorL1: 50 * cellsCount, // Прямой спонсор (50 M)
            sponsorL2: 10 * cellsCount, // Спонсор 2 уровня (10 M)
            sponsorL3: 10 * cellsCount  // Спонсор 3 уровня (10 M)
        }
    };

    return {
        success: true,
        username: username,
        sponsor: sponsor || 'Admin_System',
        totalMitrons: totalAmount,
        cellsActivated: cellsCount,
        financialDistribution: {
            adminWalletMitrons: adminWalletShare, // 100% зачисление
            autoBuyoutBudget: adminWalletShare,   // Из этого баланса выкупается товар
            site2Reservations: site2Reservations
        },
        paymentDate: new Date().toISOString(),
        payoutTimerDays: PAYOUT_TIMER_DAYS
    };
}

/**
 * Расчет финансовой операции при отказе (до 31 дня)
 * @param {number} paidAmount - Сумма, уплаченная Покупателем
 */
function calculateRefundFinance(paidAmount = MITRON_CELL_PRICE) {
    return {
        success: true,
        refundToUser: paidAmount, // 100% возврат Покупателю
        deductFromAdminWallet: paidAmount,
        site2Action: {
            matrixCellState: 'GREY',
            transferredTo: 'Admin_System', // Переходит в дар проекту MITRON
            tableCellTransferredTo: 'Admin_System'
        },
        site1Action: {
            deleteUserAccount: true
        }
    };
}

/**
 * Формирование транзакции каскадной выплаты КЕШБЭКА 1000 M (по истечении 31 дня)
 * Цепочка: Кошелек Админа -> Выплатной кошелек -> Буферный кошелек (0) -> Лидер
 * @param {string} leaderUsername - Логин Лидера на вершине
 * @param {number} cashbackAmount - Сумма выплаты (по умолчанию 1000 M)
 */
function createCashbackCascadeTransaction(leaderUsername, cashbackAmount = MITRON_CELL_PRICE) {
    return {
        success: true,
        transactionId: `CASHBACK_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        leaderUsername: leaderUsername,
        amount: cashbackAmount,
        cascadeChain: [
            { step: 1, wallet: 'Admin_Wallet', action: 'DEBIT', amount: cashbackAmount },
            { step: 2, wallet: 'Payout_Gateway_Wallet', action: 'PASS_THROUGH', amount: cashbackAmount },
            { step: 3, wallet: 'Buffer_Wallet', action: 'CLEAR_TO_ZERO', amount: cashbackAmount },
            { step: 4, wallet: `User_Balance_${leaderUsername}`, action: 'CREDIT', amount: cashbackAmount }
        ],
        notificationMessage: `Получите Ваш КЕШБЭК 100% — ${cashbackAmount} Митронов, который Вы можете потратить на любимый товар, обменять на вашу валюту или вывести в USDT`,
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    calculatePurchaseFinance,
    calculateRefundFinance,
    createCashbackCascadeTransaction
};
