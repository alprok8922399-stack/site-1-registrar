/**
 * Модуль каталога товаров Маркетплейса (Сайт 1)
 * Базовая валюта себестоимости: USDT ($)
 * Курс: 1000 Mitron (M) = 130 USDT (1 M = 0.13 USDT)
 * Коэффициент наценки: не менее 2.2 + подтяжка к "потолку" цен
 */

const MIN_COEFFICIENT = 2.2;
const MITRON_PER_USDT = 1000 / 130; // ~7.692 M за 1 USDT

// Базовый список товаров (с указанием себестоимости и "потолка" розничной цены в USDT)
const initialProducts = [
    {
        id: 1,
        title: "Сертификат MITRON 1000",
        category: "Сертификаты",
        costUsdt: 130, 
        ceilingPriceUsdt: 130, // Для сертификата ровно 1000 M
        image: "https://via.placeholder.com/300x200?text=Certificate+1000"
    },
    {
        id: 2,
        title: "Смарт-часы MITRON Watch Pro",
        category: "Электроника",
        costUsdt: 65, 
        ceilingPriceUsdt: 160, // Потолок цен по рынку
        image: "https://via.placeholder.com/300x200?text=Mitron+Watch"
    },
    {
        id: 3,
        title: "Фирменное худи MITRON DAO",
        category: "Одежда",
        costUsdt: 32.5, 
        ceilingPriceUsdt: 85, // Потолок цен по рынку
        image: "https://via.placeholder.com/300x200?text=Mitron+Hoodie"
    }
];

/**
 * Расчет розничной цены в Митронах:
 * Берется нижний порог (себестоимость * 2.2).
 * Если ceilingPriceUsdt дает цену выше нижнего порога, подтягивается к потолку.
 */
function calculateRetailPriceMitrons(product) {
    const minPriceUsdt = product.costUsdt * MIN_COEFFICIENT;
    const finalUsdt = Math.max(minPriceUsdt, product.ceilingPriceUsdt || minPriceUsdt);
    return Math.round(finalUsdt * MITRON_PER_USDT);
}

// Получить каталог товаров
function getProductsCatalog() {
    return initialProducts.map(product => {
        const finalPriceMitrons = calculateRetailPriceMitrons(product);
        const effectiveCoeff = (finalPriceMitrons / (product.costUsdt * MITRON_PER_USDT)).toFixed(2);
        return {
            ...product,
            priceMitrons: finalPriceMitrons,
            coefficient: effectiveCoeff,
            description: `Себестоимость: ${product.costUsdt} USDT | Наценка: x${effectiveCoeff} | Итого: ${finalPriceMitrons} M`
        };
    });
}

/**
 * Проверка допустимости корзины (990-1000 M, 1990-2000 M, 2990-3000 M, 3990-4000 M, 4990-5000 M)
 */
function validateCartTotal(totalMitrons) {
    if (totalMitrons <= 0) {
        return { valid: false, message: "Корзина пуста", targetBracket: 1000, needed: 1000 };
    }
    if (totalMitrons > 5000) {
        return { valid: false, message: "Максимальный объем одной покупки — 5000 Митронов", targetBracket: 5000, needed: 0 };
    }

    const targetBracket = Math.ceil(totalMitrons / 1000) * 1000;
    const minAllowed = targetBracket - 10; // Диапазон от X990 до X000

    if (totalMitrons >= minAllowed && totalMitrons <= targetBracket) {
        const cellsCount = targetBracket / 1000;
        return { valid: true, cellsCount, totalMitrons, targetBracket };
    } else {
        const needed = minAllowed - totalMitrons;
        return { 
            valid: false, 
            message: `Вам необходимо заполнить корзину ещё на ${needed > 0 ? needed : 0} Митронов (цель: ${minAllowed}-${targetBracket} M)`,
            targetBracket,
            needed: needed > 0 ? needed : 0
        };
    }
}

module.exports = {
    getProductsCatalog,
    calculateRetailPriceMitrons,
    validateCartTotal
};
