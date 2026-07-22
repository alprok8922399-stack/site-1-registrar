/**
 * Модуль каталога товаров Маркетплейса (Сайт 1)
 * Базовая валюта себестоимости: USDT ($)
 * Курс: 1000 Mitron (M) = 130 USDT (1 M = 0.13 USDT)
 * * Правило выбора себестоимости:
 * 1. Ищем предложения товара от поставщиков/продавцов.
 * 2. Приоритет: Акции, дешевые остатки, специальные скидки.
 * 3. Если акций нет — берем наименьшую цену из первых 2-3 самых дешевых предложений.
 * 4. Формула ценообразования: (Выбранная себестоимость USDT / 0.13) * 2.2
 */

const COEFFICIENT = 2.2;
const MITRON_PER_USDT = 1000 / 130; // ~7.692 M за 1 USDT

// Пример товаров с несколькими предложениями поставщиков
const initialProducts = [
    {
        id: 1,
        title: "Сертификат MITRON 1000",
        category: "Сертификаты",
        image: "https://via.placeholder.com/300x200?text=Certificate+1000",
        // Предложения от поставщиков
        supplierOffers: [
            { provider: "Поставщик A", costUsdt: 130, isPromo: false, isClearance: false },
            { provider: "Поставщик B (Акция)", costUsdt: 110, isPromo: true, isClearance: false },
            { provider: "Поставщик C", costUsdt: 125, isPromo: false, isClearance: false }
        ]
    },
    {
        id: 2,
        title: "Смарт-часы MITRON Watch Pro",
        category: "Электроника",
        image: "https://via.placeholder.com/300x200?text=Mitron+Watch",
        supplierOffers: [
            { provider: "Склад (Остатки)", costUsdt: 50, isPromo: false, isClearance: true },
            { provider: "Поставщик 1", costUsdt: 65, isPromo: false, isClearance: false },
            { provider: "Поставщик 2", costUsdt: 60, isPromo: false, isClearance: false }
        ]
    },
    {
        id: 3,
        title: "Фирменное худи MITRON DAO",
        category: "Одежда",
        image: "https://via.placeholder.com/300x200?text=Mitron+Hoodie",
        supplierOffers: [
            { provider: "Фабрика 1", costUsdt: 35, isPromo: false, isClearance: false },
            { provider: "Фабрика 2", costUsdt: 32.5, isPromo: false, isClearance: false },
            { provider: "Фабрика 3", costUsdt: 38, isPromo: false, isClearance: false }
        ]
    }
];

/**
 * Выбор наилучшей себестоимости по правилу приоритета
 */
function selectBestCostUsdt(offers) {
    if (!offers || offers.length === 0) return 0;

    // 1. ПРИОРИТЕТ: Ищем предложения по акциям или распродажам остатков
    const promoOffers = offers.filter(o => o.isPromo || o.isClearance);
    if (promoOffers.length > 0) {
        // Берем самую дешёвую акционную цену
        promoOffers.sort((a, b) => a.costUsdt - b.costUsdt);
        return promoOffers[0].costUsdt;
    }

    // 2. Если акций нет: берем 2-3 самых дешевых предложения и выбираем наименьшую
    const sortedOffers = [...offers].sort((a, b) => a.costUsdt - b.costUsdt);
    const topCheapest = sortedOffers.slice(0, 3); // 2-3 наименьшие цены
    return topCheapest[0].costUsdt; // Наименьшая из них
}

// Расчет цены в Митронах с коэффициентом 2.2
function calculateRetailPriceMitrons(costUsdt) {
    const costInMitrons = costUsdt * MITRON_PER_USDT;
    return Math.round(costInMitrons * COEFFICIENT);
}

// Получить каталог товаров
function getProductsCatalog() {
    return initialProducts.map(product => {
        const bestCostUsdt = selectBestCostUsdt(product.supplierOffers);
        const finalPriceMitrons = calculateRetailPriceMitrons(bestCostUsdt);
        
        return {
            ...product,
            selectedCostUsdt: bestCostUsdt,
            priceMitrons: finalPriceMitrons,
            coefficient: COEFFICIENT,
            description: `Себестоимость (Мин/Акция): ${bestCostUsdt} USDT | Коэффициент: x${COEFFICIENT} | Итого: ${finalPriceMitrons} M`
        };
    });
}

module.exports = {
    getProductsCatalog,
    selectBestCostUsdt,
    calculateRetailPriceMitrons
};
