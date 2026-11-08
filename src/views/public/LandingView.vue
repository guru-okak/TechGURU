<script setup>
import DeviceArt from '../../components/illustrations/DeviceArt.vue'
import {matchesSearch} from '../../api/searchText'
import { computed, ref } from 'vue'
import Button from '../../components/ui/Button.vue'
import Card from '../../components/ui/Card.vue'
import Input from '../../components/ui/Input.vue'
import Modal from '../../components/ui/Modal.vue'
import SvgIcon from '../../components/ui/SvgIcon.vue'
import YandexMapEmbed from '../../components/YandexMapEmbed.vue'
import { useSession } from '../../composables/useSession'
import { servicesView } from '../../data/services'
import { servicePoints } from '../../data/servicePoints'
import careTimeImage from '../../assets/Гость/care-time.webp'
import dropoffReceptionImage from '../../assets/Гость/dropoff-reception.webp'
import everydayImage from '../../assets/Гость/everyday-restored.webp'
import repairImage from '../../assets/Гость/Как_мы_работаем/Ремонт.jpg'
import diagnosticsImage from '../../assets/Гость/Как_мы_работаем/Диагностика.jpg'
import requestImage from '../../assets/Гость/Как_мы_работаем/Заявка.jpg'
import pickupImage from '../../assets/Гость/Как_мы_работаем/Выдача.jpg'
import visitImage from '../../assets/Клиент/Выезд_мастера.jpg'
import masterImage from '../../assets/Клиент/Опытные_мастера.jpg'
import partsImage from '../../assets/Клиент/Оригинальные_запчасти.jpg'
import onlineImage from '../../assets/Клиент/Заявка_онлайн.jpg'
const { role } = useSession()
const requestTarget = computed(() => role.value === 'client' ? '/client/requests/new' : '/login?redirect=/client/requests/new')
const catalogOpen = ref(false), search = ref(''), category = ref('Все')
const categories = ['Все', ...new Set(servicesView.filter(s => s.is_active).map(s => s.category))]
const catalog = computed(() => servicesView.filter(s => s.is_active && (category.value === 'Все' || s.category === category.value) && matchesSearch(`${s.name} ${s.category} ${s.description??''}`,search.value)))
const popular = computed(()=>servicesView.slice(0,3))
const devices = [{ icon: 'smartphone', name: 'Смартфоны' }, { icon: 'laptop', name: 'Ноутбуки и ПК' }, { icon: 'tablet', name: 'Планшеты' }, { icon: 'washer', name: 'Бытовая техника' }, { icon: 'tv', name: 'Телевизоры' }]
const benefits = [
 { image: masterImage, alt: 'Специалист диагностирует телевизор в мастерской', icon: 'users', title: 'Мастер под вашу задачу', text: 'Учитываем навыки специалиста, его загрузку и район обслуживания.' },
 { image: diagnosticsImage, alt: 'Проверка электронной платы перед согласованием ремонта', icon: 'clipboard', title: 'Стоимость до начала работ', text: 'После диагностики согласуем необходимые работы и итоговую стоимость.' },
 { image: onlineImage, alt: 'Клиент проверяет информацию на смартфоне', icon: 'bell', title: 'Каждый этап на виду', text: 'Статус заявки и уведомления о ремонте доступны в личном кабинете.' },
 { image: partsImage, alt: 'Мастер подготавливает деталь бытовой техники к установке', icon: 'box', title: 'Запчасти под контролем', text: 'Проверяем наличие деталей, а о необходимой поставке сообщаем в заявке.' },
]
const steps = [
 { image: requestImage, alt: 'Оформление обращения со смартфона рядом с ноутбуком', icon: 'clipboard', title: 'Расскажите о поломке', text: 'Выберите услугу, опишите проблему и укажите удобное время.' },
 { image: visitImage, alt: 'Мастер с инструментами встречается с клиентом', icon: 'users', title: 'Мы подберём мастера', text: 'Подтвердим детали обращения и назначим подходящего специалиста.' },
 { image: repairImage, alt: 'Аккуратный ремонт электроники на рабочем столе', icon: 'wrench', title: 'Согласуем и отремонтируем', text: 'Проведём диагностику, согласуем стоимость и выполним работы.' },
 { image: pickupImage, alt: 'Клиент пользуется ноутбуком после обслуживания', icon: 'checkCircle', title: 'Примите результат', text: 'Получите исправную технику и оцените работу мастера в кабинете.' },
]
const faqs = [
 { q: 'Как оставить заявку на ремонт?', a: 'Войдите в аккаунт или зарегистрируйтесь. В личном кабинете выберите услугу, формат обслуживания, опишите неисправность и укажите желаемую дату и временной слот.' },
 { q: 'Можно вызвать мастера на дом?', a: 'Да. Выберите выезд мастера и укажите адрес. Возможность выезда зависит от услуги, района обслуживания и свободного времени специалиста. Время подтвердим при обработке заявки.' },
 { q: 'Когда станет известна окончательная стоимость?', a: 'В каталоге указана базовая стоимость услуги. Окончательная сумма зависит от диагностики, согласованных работ и необходимых запчастей.' },
 { q: 'Где посмотреть, как идёт ремонт?', a: 'После входа в личный кабинет откройте свою заявку. В ней отображается текущий статус, а важные изменения приходят в уведомлениях.' },
]
const mapUrl = p => `https://yandex.ru/maps/?text=${encodeURIComponent(p.address)}`
const phoneUrl = phone => `tel:${phone.replace(/[^+\d]/g, '')}`
</script>

<template>
 <div class="guest-page">
  <section class="guest-hero">
   <div class="guest-container hero-grid">
    <div class="hero-copy">
     <span class="eyebrow"><span class="status-dot"></span>Умный сервис для вашей техники</span>
     <h1>Техника снова<br>в деле.<br><span>Вы — спокойны.</span></h1>
     <p class="hero-description">Ремонт электроники и бытовой техники без лишних хлопот. Мастер приедет к вам или примет устройство в сервисе. А весь путь ремонта будет в личном кабинете.</p>
     <div class="hero-actions"><Button :to="requestTarget" variant="primary" size="lg">Оставить заявку<template #iconRight><SvgIcon name="arrowRight" :size="19" /></template></Button><Button variant="outline" size="lg" @click="catalogOpen = true">Услуги и цены</Button></div>
     <div class="hero-assurances"><span><SvgIcon name="checkCircle" :size="17" />Согласование стоимости</span><span><SvgIcon name="checkCircle" :size="17" />Статус ремонта онлайн</span></div>
    </div>
    <div class="hero-visual">
     <div class="visual-orbit" aria-hidden="true"></div>
     <div class="repair-photo"><img :src="repairImage" alt="Мастер ремонтирует электронное устройство на оборудованном рабочем месте" fetchpriority="high"><div class="photo-caption"><span><SvgIcon name="wrench" :size="17" />Точная работа. Понятный процесс.</span><small>TECHGURU / SERVICE</small></div></div>
     <Card padding="none" class="portal-preview">
      <div class="preview-heading"><span class="preview-logo"><SvgIcon name="grid" :size="18" /></span><div><strong>Ваш ремонт — на виду</strong><span>Возможности личного кабинета</span></div><span class="preview-dots" aria-hidden="true">•••</span></div>
      <div class="preview-content"><div class="preview-device"><span class="device-icon"><SvgIcon name="smartphone" :size="25" /></span><div><strong>От заявки до готового устройства</strong><p>Всё важное — в одном месте</p></div></div><div class="repair-progress" aria-label="Этапы ремонта"><span class="done"><SvgIcon name="check" :size="13" /></span><i></i><span class="done"><SvgIcon name="check" :size="13" /></span><i></i><span class="current"><SvgIcon name="wrench" :size="13" /></span><i class="remaining"></i><span>4</span></div><div class="progress-labels"><span>Заявка</span><span>Диагностика</span><span>Ремонт</span><span>Готово</span></div><div class="preview-note"><SvgIcon name="bell" :size="16" /><span>Уведомим, когда статус изменится</span><SvgIcon name="checkCircle" :size="15" /></div></div>
     </Card>
     <div class="floating-chip"><span><SvgIcon name="shield" :size="19" /></span><div><strong>Без неизвестности</strong><small>Работы и стоимость согласуем с вами</small></div></div>
    </div>
   </div>
   <div class="guest-container equipment-strip"><span>Знакомая техника.<br><strong>Профессиональный подход.</strong></span><div v-for="d in devices" :key="d.name"><DeviceArt :name="d.icon" class="equipment-art" /><span>{{ d.name }}</span></div></div>
  </section>
  <section id="services" class="guest-section guest-container">
   <div class="section-heading"><div><p class="section-kicker">УСЛУГИ И СТОИМОСТЬ</p><h2>Дадим технике<br>второе дыхание.</h2></div><div class="section-aside"><p>От диагностики смартфона до ремонта бытовой техники. Выберите, с чем нужна помощь.</p><Button variant="outline" @click="catalogOpen = true">Смотреть все услуги<template #iconRight><SvgIcon name="arrowRight" :size="17" /></template></Button></div></div>
   <div class="service-grid"><Card v-for="(s, index) in popular" :key="s.id" padding="none" class="service-card"><div class="service-image"><img :src="s.image" :alt="s.name" loading="lazy"><span class="service-tag">{{ index === 0 ? 'Начните с диагностики' : s.category }}</span><span class="service-image-icon"><SvgIcon :name="s.icon" :size="22" /></span></div><div class="service-body"><h3>{{ s.name }}</h3><p>{{ s.description }}</p><div class="service-meta"><span><SvgIcon name="clock" :size="15" />{{ s.average_duration_minutes }} мин</span><span>Базовая стоимость</span></div><div class="service-bottom"><strong>{{ s.price }}</strong><Button :to="requestTarget" variant="outline" size="sm" :aria-label="`Оставить заявку: ${s.name}`">Выбрать<SvgIcon name="arrowRight" :size="16" /></Button></div></div></Card></div>
   <p class="price-note"><SvgIcon name="infoCircle" :size="16" />Окончательную стоимость определим после диагностики и согласуем до начала ремонта.</p>
  </section>
  <section class="guest-section channel-section"><div class="guest-container">
   <div class="section-heading"><div><p class="section-kicker">ДВА СПОСОБА ПОЧИНИТЬ</p><h2>Сервис там,<br>где удобно вам.</h2></div><p class="section-aside">Не нужно подстраивать весь день под ремонт. Выберите подходящий формат при создании заявки.</p></div>
   <div class="channel-grid">
    <article class="channel-card onsite-card"><div class="channel-photo"><img :src="visitImage" alt="Выездной мастер с инструментами встречает клиента дома" loading="lazy" decoding="async"><span class="channel-photo-tag"><SvgIcon name="mapPin" :size="14" />Сервис у вас дома</span></div><div class="channel-copy"><div class="channel-top"><span class="channel-icon"><SvgIcon name="home" :size="28" /></span><span class="channel-label">01 / ВЫЕЗД МАСТЕРА</span></div><h3>Останьтесь дома.<br>Мы приедем.</h3><p>Для техники, которую сложно привезти. Укажите адрес и желаемое время — подберём специалиста с учётом вашего района.</p><div class="channel-features"><span><SvgIcon name="mapPin" :size="16" />Ваш адрес</span><span><SvgIcon name="calendar" :size="16" />Согласованный слот</span></div><Button :to="requestTarget" variant="primary">Вызвать мастера<template #iconRight><SvgIcon name="arrowRight" :size="17" /></template></Button><SvgIcon name="home" :size="180" class="channel-decoration" /></div></article>
    <article class="channel-card dropoff-card"><div class="channel-photo"><img :src="dropoffReceptionImage" alt="Клиент передаёт ноутбук сотруднице пункта приёма" loading="lazy" decoding="async"><span class="channel-photo-tag"><SvgIcon name="store" :size="14" />Внимание вашему устройству</span></div><div class="channel-copy"><div class="channel-top"><span class="channel-icon"><SvgIcon name="store" :size="28" /></span><span class="channel-label">02 / ПРИЁМ В СЕРВИСЕ</span></div><h3>Привезите устройство.<br>Остальное — на нас.</h3><p>Для диагностики и ремонта в оборудованной мастерской. Выберите точку приёма и следите за готовностью устройства в кабинете.</p><div class="channel-features"><span><SvgIcon name="wrench" :size="16" />Оборудованная мастерская</span><span><SvgIcon name="bell" :size="16" />Уведомление о готовности</span></div><Button href="#contacts" variant="outline">Выбрать точку приёма<template #iconRight><SvgIcon name="arrowRight" :size="17" /></template></Button><SvgIcon name="store" :size="180" class="channel-decoration" /></div></article>
   </div>
  </div></section>
  <section id="advantages" class="guest-section guest-container"><div class="benefits-layout"><div class="benefits-intro"><p class="section-kicker">ПРОДУМАНО ДО ДЕТАЛЕЙ</p><h2>Хороший сервис —<br>это когда<br><span class="text-brand">всё понятно.</span></h2><p class="section-description">Кто чинит устройство, что с ним происходит и сколько это стоит. Мы собрали ответы в одном процессе.</p><div class="diagnostics-photo"><img :src="careTimeImage" alt="Клиентка проверяет запись на ремонт в спокойной домашней обстановке" loading="lazy"><span><SvgIcon name="shield" :size="18" />С заботой о вашем времени</span></div></div><div class="benefits-grid"><Card v-for="(b, i) in benefits" :key="b.title" padding="none" class="benefit-card"><div class="benefit-photo"><img :src="b.image" :alt="b.alt" loading="lazy" decoding="async"><span class="benefit-photo-index">0{{ i + 1 }}</span></div><div class="benefit-copy"><div class="benefit-top"><span class="benefit-icon"><SvgIcon :name="b.icon" :size="22" /></span></div><h3>{{ b.title }}</h3><p>{{ b.text }}</p></div></Card></div></div></section>
  <section id="how-it-works" class="guest-section process-section"><div class="guest-container"><div class="section-heading"><div><p class="section-kicker">ОТ ПОЛОМКИ К РЕШЕНИЮ</p><h2>Четыре шага.<br>Никакой путаницы.</h2></div><p class="section-aside">Мы берём на себя организацию ремонта. Вы выбираете удобный формат и принимаете результат.</p></div><ol class="steps-grid"><li v-for="(s, i) in steps" :key="s.title"><div class="step-photo"><img :src="s.image" :alt="s.alt" loading="lazy" decoding="async"><span class="step-number">0{{ i + 1 }}</span><span class="step-photo-icon"><SvgIcon :name="s.icon" :size="20" /></span></div><div class="step-copy"><h3>{{ s.title }}</h3><p>{{ s.text }}</p></div></li></ol></div></section>
  <section class="guest-section guest-container faq-layout"><div><p class="section-kicker">ПЕРЕД ПЕРВОЙ ЗАЯВКОЙ</p><h2>Есть вопросы?<br>Разберёмся.</h2><p class="section-description">Самое важное о том, как устроен ремонт в TechGURU.</p><a :href="phoneUrl((servicePoints[0]?.phone??'+7 800 123-45-67'))" class="contact-phone"><SvgIcon name="phone" :size="20" />{{ (servicePoints[0]?.phone??'+7 800 123-45-67') }}</a></div><div class="faq-list"><details v-for="f in faqs" :key="f.q"><summary>{{ f.q }}<span class="faq-toggle" aria-hidden="true"><span class="faq-glyph"></span></span></summary><p>{{ f.a }}</p></details></div></section>
  <section id="contacts" class="guest-section contact-section"><div class="guest-container"><div class="section-heading"><div><p class="section-kicker">РЯДОМ С ВАМИ</p><h2>Заходите.<br>Поможем с техникой.</h2></div><p class="section-aside">Выберите удобную точку приёма. Адреса и режим работы — здесь, статус вашего ремонта — в кабинете.</p></div><div class="contacts-layout"><div class="points-list"><Card v-for="point in servicePoints.filter(p => p.is_active)" :key="point.id" padding="lg" class="point-card"><div class="point-heading"><span class="benefit-icon"><SvgIcon name="store" :size="22" /></span><h3>{{ point.name }}</h3></div><p><SvgIcon name="mapPin" :size="17" />{{ point.address }}</p><a :href="phoneUrl(point.phone??'+7 800 123-45-67')"><SvgIcon name="phone" :size="17" />{{ point.phone??'+7 800 123-45-67' }}</a><div class="point-bottom"><span><SvgIcon name="clock" :size="15" />{{ point.working_hours }}</span><a :href="mapUrl(point)" target="_blank" rel="noopener noreferrer" :aria-label="`Маршрут: ${point.name}`">Маршрут<SvgIcon name="arrowRight" :size="16" /></a></div></Card></div><div class="contact-map"><YandexMapEmbed :points="servicePoints" :zoom="11" /></div></div></div></section>
  <section class="guest-container closing-section"><div class="closing-card"><div class="closing-orbit" aria-hidden="true"></div><div class="closing-copy"><p class="section-kicker">TECHGURU — СЕРВИС БЕЗ ЛИШНИХ ХЛОПОТ</p><h2>Вернём технику<br>в ваш ритм жизни.</h2><p>Расскажите, что случилось. Мы поможем с остальным.</p><Button :to="requestTarget" variant="inverse" size="lg">Оставить заявку<template #iconRight><SvgIcon name="arrowRight" :size="19" /></template></Button><span class="closing-hint">Для оформления потребуется вход или регистрация</span></div><div class="closing-photo"><img :src="everydayImage" alt="Мужчина работает за ноутбуком в домашнем кабинете" loading="lazy" decoding="async"><div class="closing-photo-caption"><span><SvgIcon name="checkCircle" :size="19" /></span><div><strong>Снова работать. Снова создавать.</strong><small>А заботу о технике оставить нам.</small></div></div></div></div></section>
  <Modal v-model="catalogOpen" title="Услуги и цены" description="Базовая стоимость работ. Запчасти и итоговая сумма согласуются после диагностики." size="xl"><div class="catalog-controls"><Input v-model="search" label="Поиск услуги или техники" icon-left="search" placeholder="Например, смартфон или диагностика" type="search" /><div class="catalog-categories" aria-label="Категории услуг"><button v-for="c in categories" :key="c" :aria-pressed="category === c" :class="{ active: category === c }" @click="category = category === c ? 'Все' : c">{{ c }}</button></div><p class="text-xs text-muted">Найдено: {{ catalog.length }}</p></div><div v-if="catalog.length" class="catalog-list"><article v-for="s in catalog" :key="s.id"><span class="benefit-icon"><DeviceArt :name="s.icon" class="catalog-device-art" /></span><div><h3>{{ s.name }}</h3><p>{{ s.category }} · {{ s.average_duration_minutes }} мин</p></div><strong>{{ s.price }}</strong><Button :to="requestTarget" size="sm" variant="outline" :aria-label="`Выбрать услугу: ${s.name}`">Выбрать</Button></article></div><div v-else class="catalog-empty"><SvgIcon name="search" :size="32" /><h3>Услуги не найдены</h3><p>Попробуйте другой запрос или выберите другую категорию.</p><Button variant="outline" @click="search = ''; category = 'Все'">Сбросить поиск</Button></div></Modal>
 </div>
</template>
<style scoped src="../../assets/guest.css"></style>

<style scoped>.equipment-art{width:48px;height:48px;flex-shrink:0}.catalog-device-art{width:42px;height:42px}.equipment-strip>div{gap:12px;padding:12px 16px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}.equipment-strip{gap:12px;flex-wrap:wrap}.catalog-list .benefit-icon{width:54px;height:54px;flex-shrink:0}@media(max-width:600px){.equipment-strip>div{flex:1 1 140px}.equipment-art{width:38px;height:38px}.catalog-list article{min-width:0;flex-wrap:wrap}.catalog-list article>div{min-width:0;flex:1}.catalog-list h3{overflow-wrap:anywhere}}</style>
