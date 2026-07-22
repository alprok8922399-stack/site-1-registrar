/**
 * Модуль каталога товаров Маркетплейса (Сайт 1)
 * Формула ценообразования: Себестоимость * 2.2
 */

const COEFFICIENT = 2.2;

// Базовый список товаров (себестоимость указана в баллах/рублях)
const initialProducts = [
    {
        id: 1,
        title: "Сертификат MITRON 1000",
        category: "Сертификаты",
        costPrice: 1000,
        image: "https://via.placeholder.com/300x200?text=Certificate+1000"
    },
    {
        id: 2,
        title: "Смарт-часы MITRON Watch Pro",
        category: "Электроника",
        costPrice: 5000,
        image: "https://via.placeholder.com/300x200?text=Mitron+Watch"
    },
    {
        id: 3,
        title: "Фирменное худи MITRON DAO",
        category: "Одежда",
        costPrice: 2500,
        image: "https://via.placeholder.com/300x200?text=Mitron+Hoodie"
    }
];

// Функция расчета цены с коэффициентом 2.2
function calculateRetailPrice(costPrice) {
    return Math.round(costPrice * COEFFICIENT);
}

// Получить каталог товаров с уже рассчитанной конечной ценой
function getProductsCatalog() {
    return initialProducts.map(product => {
        const finalPrice = calculateRetailPrice(product.costPrice);
        return {
            ...product,
            priceMitrons: finalPrice,
            coefficient: COEFFICIENT,
            description: `Себестоимость: ${product.costPrice} | Коэффициент: x${COEFFICIENT} | Итого: ${finalPrice} M`
        };
    });
}

module.exports = {
    getProductsCatalog,
    calculateRetailPrice
};
