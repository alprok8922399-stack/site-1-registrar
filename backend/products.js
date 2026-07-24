/**
 * Модуль каталога товаров Маркетплейса (Сайт 1)
 * Точная логика ценообразования:
 * - Картинка, название и описание берутся у ДЕШЕВОГО товара.
 * - Если (Макс_Цена / Мин_Цена) >= 2.2, выставляется Макс_Цена с пометкой "*".
 * - Если разница меньше 2.2, цена рассчитывается строго как (Мин_Цена * 2.2).
 * - Курс: 1 000 Mitron = 130 USD (1 Mitron = 0.13 USD).
 */

const MITRON_PER_USD = 1000 / 130; // ~7.69230769 M за $1
const MIN_COEFFICIENT = 2.2;

// База аналитики товаров с партнерского маркетплейса
const marketParseDatabase = [
    {
        id: 1,
        title: "Сертификат MITRON 1000",
        category: "Сертификаты",
        image: "https://via.placeholder.com/300x200?text=Certificate+1000",
        description: "Официальный подарочный сертификат экосистемы MITRON",
        parsedLowPrices: [130, 135],       // Дешевые позиции (по акции/остатки)
        parsedHighPrices: [290, 300, 310]  // Дорогие аналоги на маркетплейсе
    },
    {
        id: 2,
        title: "Утюг паровой MITRON Steam Pro",
        category: "Бытовая техника",
        image: "https://via.placeholder.com/300x200?text=Mitron+Iron",
        description: "Утюг с мощным паровым ударом и керамической подошвой",
        parsedLowPrices: [50],             // Пример: 50 единиц
        parsedHighPrices: [135, 140]       // Пример: 135 единиц (135 / 50 = 2.7 >= 2.2)
    },
    {
        id: 3,
        title: "Смарт-часы MITRON Watch Pro",
        category: "Электроника",
        image: "https://via.placeholder.com/300x200?text=Mitron+Watch",
        description: "Умные часы с мониторингом пульса и водозащитой",
        parsedLowPrices: [65, 70],
        parsedHighPrices: [120, 125]       // 125 / 65 = 1.92 (< 2.2 -> сработает x2.2)
    }
];

/**
 * Расчет цены по правилу "Пример с Утюгом"
 */
function calculateProductPrice(parsedLowPrices = [], parsedHighPrices = []) {
    const validLow = parsedLowPrices.filter(p => typeof p === 'number' && p > 0);
    const validHigh = parsedHighPrices.filter(p => typeof p === 'number' && p > 0);

    const minPrice = validLow.length > 0 ? Math.min(...validLow) : 100;
    const maxPrice = validHigh.length > 0 ? Math.max(...validHigh) : minPrice * MIN_COEFFICIENT;

    const ratio = minPrice > 0 ? maxPrice / minPrice : MIN_COEFFICIENT;
    let finalPriceUsd = 0;
    let hasAsterisk = false;
    let actualCoeff = ratio;

    // Если разница больше или равна 2.2 -> берем наивысшую цену и ставим "*"
    if (ratio >= MIN_COEFFICIENT) {
        finalPriceUsd = maxPrice;
        hasAsterisk = true;
    } else {
        // Если меньше 2.2 -> строго Мин_Цена * 2.2
        finalPriceUsd = minPrice * MIN_COEFFICIENT;
        actualCoeff = MIN_COEFFICIENT;
        hasAsterisk = false;
    }

    // Перевод в Митроны
    const finalPriceMitrons = Math.round(finalPriceUsd * MITRON_PER_USD);

    return {
        baseMinUsd: minPrice,
        finalPriceUsd: Math.round(finalPriceUsd * 100) / 100,
        priceMitrons: finalPriceMitrons,
        hasAsterisk: hasAsterisk,
        coefficient: Math.round(actualCoeff * 100) / 100
    };
}

/**
 * Формирование каталога для витрины
 */
function getProductsCatalog() {
    return marketParseDatabase.map(product => {
        const priceInfo = calculateProductPrice(product.parsedLowPrices, product.parsedHighPrices);
        const asteriskLabel = priceInfo.hasAsterisk ? ' *' : '';

        return {
            id: product.id,
            title: `${product.title}${asteriskLabel}`,
            category: product.category,
            image: product.image, // Картинка дешевого товара
            description: product.description, // Описание дешевого товара
            baseMinUsd: priceInfo.baseMinUsd,
            finalPriceUsd: priceInfo.finalPriceUsd,
            priceMitrons: priceInfo.priceMitrons,
            hasAsterisk: priceInfo.hasAsterisk,
            coefficient: priceInfo.coefficient,
            priceTag: `${priceInfo.priceMitrons} M${asteriskLabel} ($${priceInfo.finalPriceUsd})`
        };
    });
}

module.exports = {
    getProductsCatalog,
    calculateProductPrice
};
