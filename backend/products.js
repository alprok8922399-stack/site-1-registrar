/**
 * Модуль каталога товаров Маркетплейса (Сайт 1)
 * Проект: MITRON
 * Базовая валюта себестоимости: USDT ($)
 * Курс: 1000 Mitron (M) = 130 USDT (1 M = 0.13 USDT)
 * Правило цен: Минимальный коэффициент x2.2 с автоматической подтяжкой к "Потолку" цен
 */

const MIN_COEFFICIENT = 2.2;
const MITRON_PER_USDT = 1000 / 130; // ~7.6923 M за 1 USDT

// Каталог товаров с парсинг-параметрами (минимальная себестоимость и потолок цен по рынку)
const initialProducts = [
    {
        id: 1,
        title: "Сертификат MITRON 1000",
        category: "Сертификаты",
        costUsdt: 130, 
        ceilingPriceUsdt: 130, // Для чистого сертификата строго 1000 M
        isCeilingApplied: false,
        image: "https://via.placeholder.com/300x200?text=Certificate+1000"
    },
    {
        id: 2,
        title: "Смарт-часы MITRON Watch Pro",
        category: "Электроника",
        costUsdt: 65, 
        ceilingPriceUsdt: 160, // Потолок цен по рынку (превышает 65 * 2.2 = 143 USDT)
        isCeilingApplied: true,
        image: "https://via.placeholder.com/300x200?text=Mitron+Watch"
    },
    {
        id: 3,
        title: "Фирменное худи MITRON DAO",
        category: "Одежда",
        costUsdt: 32.5, 
        ceilingPriceUsdt: 85, // Потолок цен по рынку (превышает 32.5 * 2.2 = 71.5 USDT)
        isCeilingApplied: true,
        image: "https://via.placeholder.com/300x200?text=Mitron+Hoodie"
    }
];

/**
 * Расчет розничной цены в Митронах по правилу x2.2 и Потолка цен:
 * 1. Нижний порог = себестоимость * 2.2
 * 2. Если Потолок цен выше нижнего порога, подтягиваем к Потолку цен.
 */
function calculateRetailPriceMitrons(product) {
    const minPriceUsdt = product.costUsdt * MIN_COEFFICIENT;
    const finalUsdt = Math.max(minPriceUsdt, product.ceilingPriceUsdt || minPriceUsdt);
    const finalMitrons = Math.round(finalUsdt * MITRON_PER_USDT);
    
    // Флаг подтяжки к потолку (разрыв больше 2.2)
    const hasCeilingGap = (product.ceilingPriceUsdt / product.costUsdt) >= MIN_COEFFICIENT;

    return {
        priceMitrons: finalMitrons,
        finalUsdt: finalUsdt,
        hasCeilingGap: hasCeilingGap
    };
}

/**
 * Получить каталог товаров с обработанной экономикой
 */
function getProductsCatalog() {
    return initialProducts.map(product => {
        const priceData = calculateRetailPriceMitrons(product);
        const effectiveCoeff = (priceData.priceMitrons / (product.costUsdt * MITRON_PER_USDT)).toFixed(2);
        
        // Пометка '*' если цена подтянута к Потолку (разрыв >= 2.2)
        const displayTitle = priceData.hasCeilingGap ? `${product.title} *` : product.title;

        return {
            ...product,
            title: displayTitle,
            priceMitrons: priceData.priceMitrons,
            coefficient: effectiveCoeff,
            hasStarMark: priceData.hasCeilingGap,
            description: `Себестоимость: ${product.costUsdt} USDT | Наценка: x${effectiveCoeff} | Итого: ${priceData.priceMitrons} M`
        };
    });
}

/**
 * Валидатор Корзины Сайта 1 (Диапазоны 990-1000, 1990-2000, 2990-3000, 3990-4000, 4990-5000)
 */
function validateCartTotal(totalMitrons) {
    if (totalMitrons <= 0) {
        return { 
            valid: false, 
            message: "Корзина пуста. Добавьте товары.", 
            targetBracket: 1000, 
            needed: 1000 
        };
    }

    if (totalMitrons > 5000) {
        return { 
            valid: false, 
            message: "Максимальный объем одной покупки за один раз — 5000 Митронов!", 
            targetBracket: 5000, 
            needed: 0 
        };
    }

    // Определяем целевой диапазон (1000, 2000, 3000, 4000 или 5000)
    const targetBracket = Math.ceil(totalMitrons / 1000) * 1000;
    const minAllowed = targetBracket - 10; // Погрешность в минус 10 Митронов (например, 2990 M)

    if (totalMitrons >= minAllowed && totalMitrons <= targetBracket) {
        const cellsCount = targetBracket / 1000;
        return { 
            valid: true, 
            cellsCount: cellsCount, 
            totalMitrons: totalMitrons, 
            targetBracket: targetBracket 
        };
    } else {
        const needed = Math.round(minAllowed - totalMitrons);
        return { 
            valid: false, 
            message: `Вам необходимо заполнить корзину ещё на ${needed > 0 ? needed : 0} Митронов`, 
            targetBracket: targetBracket,
            needed: needed > 0 ? needed : 0
        };
    }
}

module.exports = {
    getProductsCatalog,
    calculateRetailPriceMitrons,
    validateCartTotal
};
