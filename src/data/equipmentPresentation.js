// UI category illustrations; no extra database columns.
export const equipmentIllustrations={
 'Смартфоны':'smartphone','Ноутбуки и ПК':'laptop','Планшеты':'tablet',
 'Телевизоры':'tv','Бытовая техника':'washer','Оргтехника':'printer',
 'Аудио':'headphones','Гаджеты':'watch',
}
export function equipmentArt(category){return ({'Мобильные телефоны':'smartphone','Ноутбуки':'laptop','Холодильники':'fridge','Стиральные машины':'washer','Плиты и варочные панели':'hob'}[category]??equipmentIllustrations[category])??'box'}
