import { reactive } from 'vue'
import offerOnlineImage from '../assets/Клиент/Заявка_онлайн.jpg'
import offerVisitImage from '../assets/Клиент/Выезд_мастера.jpg'
import qualityWarrantyImage from '../assets/Клиент/Гарантия.jpg'
import qualityPartsImage from '../assets/Клиент/Оригинальные_запчасти.jpg'
import qualityMastersImage from '../assets/Клиент/Опытные_мастера.jpg'
import serviceDiagnosticsImage from '../assets/Гость/популярные_услуги/Диагностика_смартфона.png'
import serviceScreenImage from '../assets/Гость/популярные_услуги/замена_экрана_смартфона.png'
import serviceLaptopCleanImage from '../assets/Гость/популярные_услуги/чистка_ноутбука.png'

// Услуги (таблица services по схеме БД).
// Поля строго соответствуют SQL: id, name, equipment_category, base_price,
// average_duration_minutes, required_skill_level, is_active.
export const services = reactive([
  {
    id: 1,
    name: 'Диагностика смартфона',
    equipment_category: 'Смартфоны',
    base_price: 500,
    average_duration_minutes: 30,
    required_skill_level: 1,
    is_active: 1,
  },
  {
    id: 2,
    name: 'Замена экрана смартфона',
    equipment_category: 'Смартфоны',
    base_price: 2900,
    average_duration_minutes: 120,
    required_skill_level: 2,
    is_active: 1,
  },
  {
    id: 3,
    name: 'Замена аккумулятора смартфона',
    equipment_category: 'Смартфоны',
    base_price: 1500,
    average_duration_minutes: 40,
    required_skill_level: 1,
    is_active: 1,
  },
  {
    id: 4,
    name: 'Чистка ноутбука от пыли',
    equipment_category: 'Ноутбуки и ПК',
    base_price: 1200,
    average_duration_minutes: 60,
    required_skill_level: 1,
    is_active: 1,
  },
  {
    id: 5,
    name: 'Замена клавиатуры ноутбука',
    equipment_category: 'Ноутбуки и ПК',
    base_price: 2400,
    average_duration_minutes: 90,
    required_skill_level: 2,
    is_active: 1,
  },
  {
    id: 6,
    name: 'Установка Windows и ПО',
    equipment_category: 'Ноутбуки и ПК',
    base_price: 1000,
    average_duration_minutes: 60,
    required_skill_level: 1,
    is_active: 1,
  },
  {
    id: 7,
    name: 'Ремонт планшета (замена экрана)',
    equipment_category: 'Планшеты',
    base_price: 3500,
    average_duration_minutes: 120,
    required_skill_level: 2,
    is_active: 1,
  },
  {
    id: 8,
    name: 'Диагностика телевизора',
    equipment_category: 'Телевизоры',
    base_price: 700,
    average_duration_minutes: 40,
    required_skill_level: 1,
    is_active: 1,
  },
  {
    id: 9,
    name: 'Замена подсветки телевизора',
    equipment_category: 'Телевизоры',
    base_price: 4500,
    average_duration_minutes: 180,
    required_skill_level: 3,
    is_active: 1,
  },
  {
    id: 10,
    name: 'Ремонт стиральной машины',
    equipment_category: 'Бытовая техника',
    base_price: 2200,
    average_duration_minutes: 120,
    required_skill_level: 2,
    is_active: 1,
  },
  {
    id: 11,
    name: 'Ремонт холодильника',
    equipment_category: 'Бытовая техника',
    base_price: 2800,
    average_duration_minutes: 150,
    required_skill_level: 3,
    is_active: 1,
  },
  {
    id: 12,
    name: 'Ремонт принтера',
    equipment_category: 'Оргтехника',
    base_price: 1800,
    average_duration_minutes: 90,
    required_skill_level: 2,
    is_active: 1,
  },
  {
    id: 13,
    name: 'Ремонт монитора',
    equipment_category: 'Ноутбуки и ПК',
    base_price: 2500,
    average_duration_minutes: 120,
    required_skill_level: 2,
    is_active: 1,
  },
  {
    id: 14,
    name: 'Ремонт наушников',
    equipment_category: 'Аудио',
    base_price: 900,
    average_duration_minutes: 60,
    required_skill_level: 1,
    is_active: 1,
  },
  {
    id: 15,
    name: 'Ремонт умных часов',
    equipment_category: 'Гаджеты',
    base_price: 1900,
    average_duration_minutes: 90,
    required_skill_level: 2,
    is_active: 1,
  },
  {
    id: 16,
    name: 'Ремонт игровых приставок',
    equipment_category: 'Гаджеты',
    base_price: 2200,
    average_duration_minutes: 120,
    required_skill_level: 2,
    is_active: 1,
  },
  {
    id: 17,
    name: 'Ремонт фотоаппаратов',
    equipment_category: 'Гаджеты',
    base_price: 2800,
    average_duration_minutes: 150,
    required_skill_level: 3,
    is_active: 1,
  },
  {
    id: 18,
    name: 'Ремонт посудомоечных машин',
    equipment_category: 'Бытовая техника',
    base_price: 2400,
    average_duration_minutes: 120,
    required_skill_level: 2,
    is_active: 1,
  },
  {
    id: 19,
    name: 'Ремонт пылесосов',
    equipment_category: 'Бытовая техника',
    base_price: 1600,
    average_duration_minutes: 90,
    required_skill_level: 1,
    is_active: 1,
  },
  {
    id: 20,
    name: 'Ремонт микроволновых печей',
    equipment_category: 'Бытовая техника',
    base_price: 1700,
    average_duration_minutes: 90,
    required_skill_level: 2,
    is_active: 1,
  },
])

services.push({ id:21, name:'Ремонт плит и варочных панелей', equipment_category:'Бытовая техника', base_price:2400, average_duration_minutes:120, required_skill_level:3, is_active:1 })

// Презентационные данные, не входящие в таблицу services.
// Хранятся отдельно, чтобы не смешивать БД-поля с UI-полями.
export const servicePresentation = {
  21: { icon: 'wrench', image: offerVisitImage, description: 'Диагностика и ремонт электрических плит и варочных панелей', features: ['Проверка нагрева','Диагностика управления','Согласование стоимости'] },
  1: {
    icon: 'smartphone',
    image: serviceDiagnosticsImage,
    description: 'Точное определение неисправности за 30 минут',
    features: ['Бесплатно при ремонте', 'Проверка платы и разъёмов', 'Занимает ~30 минут'],
  },
  2: {
    icon: 'smartphone',
    image: serviceScreenImage,
    description: 'Оригинальные дисплеи для популярных моделей',
    features: ['Оригинальные дисплеи', 'Калибровка сенсора', 'Замена за 1–2 часа'],
  },
  3: {
    icon: 'smartphone',
    description: 'Новая батарея с гарантией 6 месяцев',
    features: ['Новые аккумуляторы', 'Калибровка ёмкости батареи', 'Замена за 40 минут'],
  },
  4: {
    icon: 'laptop',
    image: serviceLaptopCleanImage,
    description: 'Замена термопасты и профилактика перегрева',
    features: ['Замена термопасты', 'Чистка системы охлаждения', 'Проверка оборотов вентилятора'],
  },
  5: {
    icon: 'laptop',
    description: 'Подбор и установка совместимой клавиатуры',
    features: ['Подбор клавиатуры', 'Проверка шлейфа клавиатуры', 'Замена за 1 день'],
  },
  6: {
    icon: 'laptop',
    description: 'Чистая установка системы, драйверов и программ',
    features: ['Лицензионная система', 'Установка драйверов', 'Базовый набор программ'],
  },
  7: {
    icon: 'tablet',
    description: 'Замена тачскрина и дисплея в сборе',
    features: ['Дисплей в сборе', 'Перенос камеры и датчиков', 'Калибровка сенсора'],
  },
  8: {
    icon: 'tv',
    description: 'Поиск неисправности блока питания и матрицы',
    features: ['Проверка блока питания', 'Диагностика матрицы', 'Проверка подсветки и инвертора'],
  },
  9: {
    icon: 'tv',
    description: 'Устранение тёмных пятен и полос на экране',
    features: ['Устранение полос и пятен', 'Оригинальные LED-планки', 'Проверка драйвера подсветки'],
  },
  10: {
    icon: 'washer',
    description: 'Замена насосов, подшипников и электроники',
    features: ['Выезд в день обращения', 'Замена насосов и подшипников', 'Проверка двигателя и датчиков'],
  },
  11: {
    icon: 'fridge',
    description: 'Заправка фреоном, замена компрессора',
    features: ['Выезд в день обращения', 'Поиск утечки хладагента', 'Проверка термостата и датчиков'],
  },
  12: {
    icon: 'printer',
    description: 'Устранение замятий и чистка печатающего узла',
    features: ['Чистка печатающего узла', 'Устранение замятий', 'Замена роликов подачи бумаги'],
  },
  13: {
    icon: 'monitor',
    description: 'Замена подсветки, блока питания и матрицы',
    features: ['Замена матрицы и подсветки', 'Ремонт блока питания', 'Проверка шлейфов и разъёмов'],
  },
  14: {
    icon: 'headphones',
    description: 'Замена динамиков, разъёмов и аккумулятора',
    features: ['Замена динамиков', 'Ремонт разъёмов', 'Пайка сигнальных контактов'],
  },
  15: {
    icon: 'watch',
    description: 'Замена экрана, батареи и ремешка',
    features: ['Замена дисплея', 'Замена аккумулятора', 'Проверка влагозащиты корпуса'],
  },
  16: {
    icon: 'console',
    description: 'Чистка, замена термопасты и ремонт разъёмов',
    features: ['Чистка от пыли', 'Замена термопасты', 'Ремонт консолей и геймпадов'],
  },
  17: {
    icon: 'camera',
    description: 'Чистка оптики и замена затвора',
    features: ['Чистка объектива и сенсора', 'Замена затвора', 'Калибровка автофокуса'],
  },
  18: {
    icon: 'dishwasher',
    description: 'Замена насосов, датчиков и устранение протечек',
    features: ['Выезд в день обращения', 'Замена насосов и датчиков', 'Устранение протечек'],
  },
  19: {
    icon: 'vacuum',
    description: 'Ремонт роботов-пылесосов и классических моделей',
    features: ['Замена аккумулятора', 'Ремонт двигателя', 'Замена фильтров и щёток'],
  },
  20: {
    icon: 'microwave',
    description: 'Замена магнетрона и устранение неисправностей',
    features: ['Замена магнетрона', 'Ремонт блока управления', 'Проверка высоковольтного предохранителя'],
  },
}

export function formatPrice(value) {
  return `от ${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

// View-модель для существующих экранов: БД-поля + презентация.
export const servicesView = reactive(services.map((service) => ({
  ...service,
  ...(servicePresentation[service.id] ?? {}),
  category: service.equipment_category,
  price: formatPrice(service.base_price),
})))

export const serviceCategories = [
  'Все',
  ...Array.from(new Set(services.map((s) => s.equipment_category))),
]

export function getServiceById(id) {
  return services.find((s) => s.id === id) ?? null
}

// Акции для блока «Специальные предложения» (маркетинговый контент, не БД).

export const offers = [
  {
    id: 'offer-diagnostic',
    badge: '−10%',
    icon: 'bolt',
    tone: 'blue',
    title: 'Скидка 10% на диагностику',
    text: 'До конца месяца при оформлении заявки онлайн.',
    image: offerOnlineImage,
  },
  {
    id: 'offer-visit',
    badge: '0 ₽',
    icon: 'truck',
    tone: 'green',
    title: 'Бесплатный выезд мастера',
    text: 'При заказе ремонта на сумму от 5 000 ₽.',
    image: offerVisitImage,
  },
]

// Блок «Гарантия и качество».
export const quality = [
  {
    title: 'Гарантия до 12 месяцев',
    text: 'На все выполненные работы и установленные детали.',
    icon: 'shield',
    image: qualityWarrantyImage,
  },
  {
    title: 'Оригинальные запчасти',
    text: 'Используем только сертифицированные комплектующие.',
    icon: 'gear',
    image: qualityPartsImage,
  },
  {
    title: 'Опытные мастера',
    text: 'Средний стаж специалистов — более 5 лет.',
    icon: 'star',
    image: qualityMastersImage,
  },
]
