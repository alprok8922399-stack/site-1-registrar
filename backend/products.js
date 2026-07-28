/**
 * Модуль каталога товаров Маркетплейса (Сайт 1)
 * Базовая валюта себестоимости: USDT ($)
 * Курс: 1000 Mitron (M) = 130 USDT (1 M = 0.13 USDT)
 * Формула ценообразования: (Cost Price USDT / 0.13) * 2.2
 */

const COEFFICIENT = 2.2;
const MITRON_PER_USDT = 1000 / 130; // ~7.692 M за 1 USDT (или 1M = 0.13$)

// Базовый список товаров (себестоимость указана в USDT)
const initialProducts = [
    {
        id: 1,
        title: "Сертификат MITRON 1000",
        category: "Сертификаты",
        costUsdt: 130, // 130$ себестоимость
        image: "https://via.placeholder.com/300x200?text=Certificate+1000"
    },
    {
        id: 2,
        title: "Смарт-часы MITRON Watch Pro",
        category: "Электроника",
        costUsdt: 65, // 65$ себестоимость
        image: "https://via.placeholder.com/300x200?text=Mitron+Watch"
    },
    {
        id: 3,
        title: "Фирменное худи MITRON DAO",
        category: "Одежда",
        costUsdt: 32.5, // 32.5$ себестоимость
        image: "https://via.placeholder.com/300x200?text=Mitron+Hoodie"
    }
];

// Расчет цены в Митронах с коэффициентом 2.2
function calculateRetailPriceMitrons(costUsdt) {
    const costInMitrons = costUsdt * MITRON_PER_USDT;
    return Math.round(costInMitrons * COEFFICIENT);
}

// Получить каталог товаров
function getProductsCatalog() {
    return initialProducts.map(product => {
        const finalPriceMitrons = calculateRetailPriceMitrons(product.costUsdt);
        return {
            ...product,
            priceMitrons: finalPriceMitrons,
            coefficient: COEFFICIENT,
            description: `Себестоимость: ${product.costUsdt} USDT | Коэффициент: x${COEFFICIENT} | Итого: ${finalPriceMitrons} M`
        };
    });
}

module.exports = {
    getProductsCatalog,
    calculateRetailPriceMitrons
};
