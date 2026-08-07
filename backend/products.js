/**
 * Модуль каталога товаров Маркетплейса (Сайт 1)
 * Проект: MITRON
 * Базовая валюта себестоимости: USDT ($)
 * Курс: 1000 Mitron (M) = 130 USDT (1 M = 0.13 USDT)
 * Правило цен: Минимальный коэффициент x2.2 с автоматической подтяжкой к "Потолку" цен
 */

const MIN_COEFFICIENT = 2.2;
const MITRON_PER_USDT = 1000 / 130; // ~7.6923 M за 1 USDT

// Базовый каталог товаров (Расширенный список)
const initialProducts = [
    {
        id: 1,
        title: "Сертификат MITRON 1000",
        category: "Сертификаты",
        costUsdt: 130, 
        ceilingPriceUsdt: 130,
        isCertificate: true,
        image: "https://via.placeholder.com/300x200?text=Certificate+1000"
    },
    {
        id: 2,
        title: "Смарт-часы MITRON Watch Pro",
        category: "Электроника",
        costUsdt: 65, 
        ceilingPriceUsdt: 160,
        isCertificate: false,
        image: "https://via.placeholder.com/300x200?text=Mitron+Watch"
    },
    {
        id: 3,
        title: "Фирменное худи MITRON DAO",
        category: "Одежда",
        costUsdt: 32.5, 
        ceilingPriceUsdt: 85,
        isCertificate: false,
        image: "https://via.placeholder.com/300x200?text=Mitron+Hoodie"
    },
    {
        id: 4,
        title: "Беспроводные наушники MITRON Sound",
        category: "Электроника",
        costUsdt: 25, 
        ceilingPriceUsdt: 65,
        isCertificate: false,
        image: "https://via.placeholder.com/300x200?text=Mitron+Sound"
    },
    {
        id: 5,
        title: "Кожаный портмоне MITRON Leather",
        category: "Аксессуары",
        costUsdt: 15, 
        ceilingPriceUsdt: 45,
        isCertificate: false,
        image: "https://via.placeholder.com/300x200?text=Mitron+Wallet"
    },
    {
        id: 6,
        title: "Умная бутылка для воды MITRON Hydro",
        category: "Спорт",
        costUsdt: 18, 
        ceilingPriceUsdt: 42,
        isCertificate: false,
        image: "https://via.placeholder.com/300x200?text=Mitron+Bottle"
    },
    {
        id: 7,
        title: "Фирменная кепка MITRON Cap",
        category: "Одежда",
        costUsdt: 10, 
        ceilingPriceUsdt: 28,
        isCertificate: false,
        image: "https://via.placeholder.com/300x200?text=Mitron+Cap"
    },
    {
        id: 8,
        title: "Портативный PowerBank 20000 mAh",
        category: "Электроника",
        costUsdt: 22, 
        ceilingPriceUsdt: 58,
        isCertificate: false,
        image: "https://via.placeholder.com/300x200?text=Mitron+PowerBank"
    }
];

/**
 * Расчет розничной цены в Митронах по правилу x2.2 и Потолка цен
 */
function calculateRetailPriceMitrons(product) {
    if (product.isCertificate) {
        return {
            priceMitrons: 1000,
            finalUsdt: 130,
            hasCeilingGap: false
        };
    }

    const minPriceUsdt = product.costUsdt * MIN_COEFFICIENT;
    const finalUsdt = Math.max(minPriceUsdt, product.ceilingPriceUsdt || minPriceUsdt);
    const finalMitrons = Math.round(finalUsdt * MITRON_PER_USDT);
    
    // Пометка '*', если цена установлена по Потолку
    const hasCeilingGap = (product.ceilingPriceUsdt / product.costUsdt) >= MIN_COEFFICIENT;

    return {
        priceMitrons: finalMitrons,
        finalUsdt: finalUsdt,
        hasCeilingGap: hasCeilingGap
    };
}

/**
 * Получить полный каталог товаров с просчитанной экономикой
 */
function getProductsCatalog() {
    return initialProducts.map(product => {
        const priceData = calculateRetailPriceMitrons(product);
        
        let effectiveCoeff = 1.0;
        let description = `Номинал: 1000 M | Стоимость: 130 USDT`;

        if (!product.isCertificate) {
            effectiveCoeff = (priceData.priceMitrons / (product.costUsdt * MITRON_PER_USDT)).toFixed(2);
            description = `Себестоимость: ${product.costUsdt} USDT | Наценка: x${effectiveCoeff} | Итого: ${priceData.priceMitrons} M`;
        }

        const displayTitle = priceData.hasCeilingGap ? `${product.title} *` : product.title;

        return {
            ...product,
            title: displayTitle,
            priceMitrons: priceData.priceMitrons,
            coefficient: effectiveCoeff,
            hasStarMark: priceData.hasCeilingGap,
            description: description
        };
    });
}

/**
 * Модуль подбора доборных товаров для закрытия нехватки до ближайшей 1000 М
 */
function suggestAddonProducts(neededMitrons) {
    const catalog = getProductsCatalog();
    return catalog.filter(p => p.priceMitrons <= neededMitrons + 50);
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
            neededMin: 990,
            neededMax: 1000
        };
    }

    if (totalMitrons > 5000) {
        return { 
            valid: false, 
            message: "Максимальный объем одной покупки за один раз — 5000 Митронов!", 
            targetBracket: 5000, 
            neededMin: 0,
            neededMax: 0
        };
    }

    const targetBracket = Math.ceil(totalMitrons / 1000) * 1000;
    const minAllowed = targetBracket - 10;

    if (totalMitrons >= minAllowed && totalMitrons <= targetBracket) {
        const unitsCount = targetBracket / 1000;
        return { 
            valid: true, 
            unitsCount: unitsCount,
            cellsCount: unitsCount, // Сохраняем совместимость
            totalMitrons: totalMitrons, 
            targetBracket: targetBracket 
        };
    } else if (totalMitrons > targetBracket) {
        // Защита от переполнения
        const nextBracket = targetBracket + 1000;
        const neededMin = nextBracket - 10 - totalMitrons;
        const neededMax = nextBracket - totalMitrons;
        return {
            valid: false,
            message: `Вам необходимо заполнить корзину ещё на ${neededMin}-${neededMax} Митронов`,
            targetBracket: nextBracket,
            neededMin,
            neededMax,
            addons: suggestAddonProducts(neededMax)
        };
    } else {
        const neededMin = minAllowed - totalMitrons;
        const neededMax = targetBracket - totalMitrons;
        const addons = suggestAddonProducts(neededMax);
        return { 
            valid: false, 
            message: `Вам необходимо заполнить корзину ещё на ${neededMin}-${neededMax} Митронов`, 
            targetBracket: targetBracket,
            neededMin,
            neededMax,
            addons: addons
        };
    }
}

module.exports = {
    getProductsCatalog,
    calculateRetailPriceMitrons,
    validateCartTotal,
    suggestAddonProducts
};
