/**
 * Модуль каталога товаров Маркетплейса (Сайт 1)
 * * ЖЕЛЕЗНЫЕ ПРАВИЛА ТЗ ПРОЕКТА «MITRON»:
 * 1. Картинка, название и описание берутся строго от ДЕШЕВОГО аналога.
 * 2. Робот считает среднее арифметическое 2–3 наименьших цен (Min_avg) 
 * и 5–7 наивысших цен (Ceiling_avg / «Потолок»).
 * 3. Если соотношение (Ceiling_avg / Min_avg) >= 2.2, цена на витрине выставляется 
 * по «Потолку» (Ceiling_avg) с обязательной пометкой "*".
 * 4. Если разрыв меньше 2.2, цена рассчитывается строго как (Min_avg * 2.2).
 * 5. Нижний порог: Наценке запрещено быть ниже коэффициента 2.2.
 * 6. Курс: 1 000 Mitron = 130 USD (1 Mitron = 0.13 USD, т.е. ~7.6923 M за $1).
 */

const MITRON_PER_USD = 1000 / 130; // ~7.69230769 M за $1
const MIN_COEFFICIENT = 2.2;

// База аналитики товаров с внешних маркетплейсов (Amazon, AliExpress, eBay и др.)
const marketParseDatabase = [
    {
        id: 1,
        title: "Сертификат MITRON 1000",
        category: "Сертификаты",
        image: "https://via.placeholder.com/300x200?text=Certificate+1000",
        description: "Официальный подарочный сертификат экосистемы MITRON номиналом 1000 Митронов",
        parsedLowPrices: [130, 130, 130],          // 2-3 дешевые позиции ($130)
        parsedHighPrices: [300, 310, 290, 305, 295] // 5-7 высоких цен («Потолок» ~ $300)
    },
    {
        id: 2,
        title: "Утюг паровой MITRON Steam Pro",
        category: "Бытовая техника",
        image: "https://via.placeholder.com/300x200?text=Mitron+Steam+Pro",
        description: "Утюг с мощным паровым ударом и керамической подошвой (описание дешевого товара)",
        parsedLowPrices: [48, 50, 52],             // Средняя Min = $50
        parsedHighPrices: [135, 140, 138, 142, 135] // Средний Ceiling = $138 (138 / 50 = 2.76 >= 2.2 -> «Потолок» с "*")
    },
    {
        id: 3,
        title: "Смарт-часы MITRON Watch Pro",
        category: "Электроника",
        image: "https://via.placeholder.com/300x200?text=Mitron+Watch+Pro",
        description: "Умные часы с мониторингом пульса и водозащитой (описание дешевого товара)",
        parsedLowPrices: [65, 70, 68],             // Средняя Min = $67.67
        parsedHighPrices: [120, 125, 122, 118, 120] // Средний Ceiling = $121 (121 / 67.67 = 1.78 < 2.2 -> сработает x2.2)
    },
    {
        id: 4,
        title: "Беспроводные наушники MITRON Sound Air",
        category: "Электроника",
        image: "https://via.placeholder.com/300x200?text=Mitron+Sound+Air",
        description: "Наушники с активным шумоподавлением и глубоким басом",
        parsedLowPrices: [38, 40, 42],             // Средняя Min = $40
        parsedHighPrices: [85, 88, 90, 86, 91]     // Средний Ceiling = $88 (88 / 40 = 2.2 -> «Потолок» с "*")
    }
];

/**
 * Вспомогательная функция вычисления среднего арифметического массива чисел
 */
function calculateAverage(arr = []) {
    const valid = arr.filter(p => typeof p === 'number' && p > 0);
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, val) => acc + val, 0);
    return sum / valid.length;
}

/**
 * Расчет цены товара по алгоритму «Потолок» / x2.2
 */
function calculateProductPrice(parsedLowPrices = [], parsedHighPrices = []) {
    // 1. Вычисляем среднее арифметическое наименьших (2-3) и наибольших (5-7) цен
    const minAvgUsd = calculateAverage(parsedLowPrices) || 100;
    const ceilingAvgUsd = calculateAverage(parsedHighPrices) || (minAvgUsd * MIN_COEFFICIENT);

    // 2. Вычисляем отношение «Потолка» к минимальной средней цене
    const ratio = minAvgUsd > 0 ? (ceilingAvgUsd / minAvgUsd) : MIN_COEFFICIENT;

    let finalPriceUsd = 0;
    let hasAsterisk = false;
    let actualCoeff = ratio;

    // 3. Главная вилка алгоритма ценообразования:
    if (ratio >= MIN_COEFFICIENT) {
        // Если соотношение >= 2.2 -> выставляем по «Потолку» с обязательной пометкой "*"
        finalPriceUsd = ceilingAvgUsd;
        hasAsterisk = true;
    } else {
        // Если разрыв меньше 2.2 -> выставляем strictly Min_avg * 2.2 (без звезд)
        finalPriceUsd = minAvgUsd * MIN_COEFFICIENT;
        actualCoeff = MIN_COEFFICIENT;
        hasAsterisk = false;
    }

    // 4. Перевод цены в Митроны (1 M = $0.13, 1000 M = $130)
    const finalPriceMitrons = Math.round(finalPriceUsd * MITRON_PER_USD);

    return {
        baseMinUsd: Math.round(minAvgUsd * 100) / 100,
        ceilingAvgUsd: Math.round(ceilingAvgUsd * 100) / 100,
        finalPriceUsd: Math.round(finalPriceUsd * 100) / 100,
        priceMitrons: finalPriceMitrons,
        hasAsterisk: hasAsterisk,
        coefficient: Math.round(actualCoeff * 100) / 100
    };
}

/**
 * Формирование финального каталога витрины Маркетплейса (Сайт 1)
 */
function getProductsCatalog() {
    return marketParseDatabase.map(product => {
        const priceInfo = calculateProductPrice(product.parsedLowPrices, product.parsedHighPrices);
        const asteriskLabel = priceInfo.hasAsterisk ? ' *' : '';

        return {
            id: product.id,
            title: `${product.title}${asteriskLabel}`,
            category: product.category,
            image: product.image,       // Картинка дешевого товара
            description: product.description, // Описание дешевого товара
            baseMinUsd: priceInfo.baseMinUsd,
            ceilingAvgUsd: priceInfo.ceilingAvgUsd,
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
