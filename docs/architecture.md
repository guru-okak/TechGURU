> Актуализация 02.11.2026: серверные модули расширены, интерфейс подключён к API. Текущее состояние и запуск: [Подключение сайта к API](Подключение_сайта_к_API_2026-11-02.md). Ниже сохранено описание первоначального этапа.

# Архитектура TechGURU
Дата: 28.10.2026. Проект этапа 1. Модель v0.1 предварительная. Этап 2 реализован в db/migrations/0001_initial.sql; локальная D1 и запуск описаны в docs/backend-local.md.

## Структура
- src/api: HTTP-клиент, адаптеры ответов и обработка ошибок.
- src/stores: общее состояние; без SQL и бизнес-переходов.
- src/views, components, composables: сохраняем существующие экраны.
- src/data: старые моки; заменяем по мере подключения модулей.
- shared/contracts: DTO и схемы валидации.
- shared/domain: роли, статусы и действия.
- server/routes, middleware: HTTP, сессия, RBAC, CSRF, ошибки.
- server/services: заявки, подбор, склад, закупки.
- server/repositories: SQL и преобразования строк БД.
- server/jobs: эскалация, автозакрытие, проверка остатков.
- db/migrations: последовательные изменения схемы.
- db/seeds: отдельные демонстрационные данные.
- db/reference: исходный SQL из документа без исправлений.
- tests/domain, tests/integration: бизнес-инварианты и взаимодействие API/БД.

Поток: UI → API → route → service → repository → SQLite/D1. Репозитории локализуют изменения физической схемы. При изменении смысла данных могут измениться и DTO — полной независимости не обещаем. Второй JSON-бэкенд параллельно с SQLite не создаём.

## Работа с изменяемой БД
Рабочая схема v0 опирается на 21 сущность ТЗ и последние уточнения. Применённые общие миграции не переписываем: новые изменения отдельной миграцией, с переносом данных при необходимости. Проверяем создание пустой БД и обновление предыдущей версии. Seed запускается отдельной командой только в демосреде. Пересоздание локальной БД — отдельная явно обозначенная операция; рабочие данные автоматически не удаляются.

Начальный архив хранится отдельно. Папка проекта не находится в Git-репозитории. Исключения для .env, локальной БД, секретов, node_modules, dist добавлены в .gitignore. Исходная контрольная версия хранится отдельным проверенным ZIP; Git-коммиты пока не создавались. Демо-пароли хешировать реально, а не брать demo_hash из DOCX. Демоданные фиктивные; время тестов управляемое, приложение использует фактическое время.

## Предварительная модель 21 таблицы
Ключевые поля ниже — проект модели, не готовый DDL. PK — id; точные типы, дополнительные поля и индексы фиксируются в миграциях.

| Таблица | Данные / ограничения |
|---|---|
| users | full_name, phone UNIQUE, email UNIQUE nullable, role, address, password_hash, is_active, created_at |
| sessions | user_id, хеш refresh UNIQUE, сроки, отзыв; исходный токен не хранить |
| masters | user_id UNIQUE, experience_years, service_area JSON районов, max_daily_requests, rating, is_available, is_onsite, is_dropoff |
| master_skills | master_id, service_id, skill_level; уникальная пара |
| master_schedule | master_id, начало/конец окна, is_booked, связь брони с заявкой |
| services | name, equipment_category, base_price, average_duration_minutes, required_skill_level, is_active |
| service_points | name, address, is_active |
| requests | user_id, service_id, master_id nullable, service_mode, client_address, dropoff_point_id, preferred_datetime, preferred_slot, description, comment, contact_phone snapshot, contact_person, photos JSON, status, needs_manual_review, total_price, created_at, updated_at; время входа в статус |
| request_items | request_id, работа, количество, цена snapshot; стоимость деталей не дублировать |
| request_parts | request_id, part_id, quantity, status, unit_price, used_quantity, returned_quantity, changed_by_user_id, changed_by_role; время потребности, фактические резерв/выдача для частичной нехватки |
| request_status_history | request_id, предыдущий/новый статус, инициатор, comment, created_at; недозвон без перехода допустим |
| ratings | request_id UNIQUE, master_id, user_id, оценка 1–5, comment, created_at |
| suppliers | наименование, контакты, is_active |
| parts | name, sku UNIQUE, description, unit_price, is_active, supplier_id, min_stock |
| warehouses | name, type central/master, master_id nullable; мобильный склад уникален для мастера |
| stock | warehouse_id, part_id, quantity, reserved_quantity; уникальная пара; 0 <= reserved_quantity <= quantity |
| purchase_orders | supplier_id, номер UNIQUE PO-YYYY-NNNN, status draft/pending/sent/received, даты |
| purchase_order_items | purchase_order_id, part_id, quantity, unit_price |
| notifications | user_id, request_id nullable, тип, текст, прочитано, created_at |
| notification_queue | user_id, request_id nullable, channel, recipient snapshot, subject, message, status, error, created_at, sent_at |
| audit_log | user_id, role, action, entity_type, entity_id, details JSON, ip_address, user_agent, created_at |

Переименования только для requests: desired_datetime → preferred_datetime; address → client_address; service_point_id → dropoff_point_id; issue_description → description. Исходный SQL неполон: дополнения не выдавать за утверждённую схему.

Частичный резерв/расход требует количеств, а не единственного строкового статуса. Точные имена полей резерва и выдачи закрепляем в v0. Изменение нескольких связанных записей выполняется атомарно; механизм реализации необходимо проверить для целевой D1, не предполагая поддержку обычного BEGIN внутри Worker.

Деньги рассчитываем целыми копейками с явным преобразованием к рублям на границе. Время храним UTC, показываем Europe/Moscow. Район заявки выбирается явно, способ хранения закрепляется в v0; район из произвольного адреса не угадываем. completed_count рассчитывается по завершённым заявкам либо обновляется согласованно.

## Переходы и права
| Действие | Переход | Исполнитель / условие |
|---|---|---|
| confirm | new → confirmed | система/admin; активная услуга, допустимый слот |
| assign | confirmed → assigned | система/admin; подходящий мастер, атомарная бронь |
| cancel | new/confirmed → cancelled | владелец-client/admin; освобождение ресурсов |
| decline | assigned → confirmed | назначенный master; комментарий, освобождение брони/резервов, повторный подбор |
| start | assigned → in_progress | назначенный master |
| request_parts | in_progress → waiting_parts | master; нехватка, частичный резерв и закупочная потребность |
| supply_received | waiting_parts → in_progress | система при полном обеспечении после поставки |
| complete | in_progress → completed | master, onsite; обязательный расход |
| complete | in_progress → ready_for_pickup | master, dropoff; обязательный расход |
| confirm_pickup | ready_for_pickup → completed | владелец-client/admin |
| auto_close | completed → closed | система через 3 дня |
| reject | активный → rejected | admin; обязательный комментарий |

Активные: new/confirmed/assigned/in_progress/waiting_parts/ready_for_pickup. Матрица ТЗ даёт админу отмену без отдельного расширенного перехода: рабочее правило cancel также ограничено new/confirmed; остальные активные отклоняются через reject. Это проектное толкование.

Гость читает публичный каталог/точки/контакты. Клиент работает только со своими заявками, профилем и уведомлениями. Мастер — с назначенными заявками, своим профилем и мобильным складом; выдачу клиенту не подтверждает. Администратор управляет справочниками, заявками, ресурсами, закупками, читает аудит/аналитику. Fallback администратора по запчастям предусмотрен ТЗ. Рейтинг — одна оценка владельца после completed/closed, итоговый рейтинг мастера рассчитывается сервером.

user_id/role исполнителя берём из серверной сессии, не из тела запроса. Нет сессии — 401; запрещённая роль — 403; чужой персональный ресурс — 404; неверный переход — 409; ошибки полей — 422. Состояние повторно проверяется при записи.

## API /api (проект и реализуемые контракты)
- POST /auth/register, /auth/login, /auth/refresh, /auth/logout; GET /auth/me; GET/PATCH /profile.
- GET /services, /service-points; защищённое административное управление каталогами.
- GET/POST /requests; GET /requests/:id; POST /requests/:id/actions/:action.
- PATCH /requests/:id для admin с allowlist полей и проверкой состояния; POST /requests/:id/comments.
- GET /requests/:id/items и админское изменение сметы; POST /requests/:id/rating.
- GET/POST /requests/:id/parts; явные действия выдачи/возврата; complete принимает подтверждённый расход.
- /masters, /masters/:id/skills, /masters/:id/schedule, /masters/:id/availability; кандидаты для ручного назначения.
- /warehouses, /stock, /suppliers, /parts, /purchase-orders; действия переходов заказа отдельными POST.
- GET /notifications; изменение прочитанности своих уведомлений. Админский GET /notification-queue.
- /admin/dashboard, /admin/users, /admin/audit, /admin/reports/:type.

Пагинация и ограничение размера списков, разрешённые сортировки, фильтры. Ошибка: { error: { code, message, fields? } }. Ответы по DTO, без password_hash и токенов. Создание возвращает сохранённую сущность. Повтор received/complete/Cron не дублирует движения и события. CSV: UTF-8 BOM, точка с запятой, экранирование и защита от формул в пользовательских данных.

## Складские инварианты
Доступно = quantity − reserved_quantity. Выдача <= резерв. Расход + возврат при завершении = выданное количество; невыданный резерв отдельно освобождается. При выдаче резерв центрального уменьшается сразу, при возврате повторно его не уменьшаем.

FIFO по времени необеспеченной потребности, затем id. Учитываем уже существующие резервы и весь недостающий комплект заявки. Если обеспечить нельзя — заявка ждёт; последующие заявки проверяются по порядку. Это обход с проверкой каждой заявки, без блокировки всей очереди одной крупной потребностью. Заказы учитывают уже заказанное, чтобы почасовая задача не создавала дубликаты.

## Приёмка этапов
1. Источники, расхождения, модель v0, права, переходы, структура, API зафиксированы.
2. Локальный запуск, пустая БД и обновление предыдущей, отдельный seed, ограничения и единые ошибки проверены.
3. Реальный вход/сессии, refresh, RBAC, CSRF, ограничение попыток проверены.
4. Заявка сохраняется после перезагрузки; детали, отмена и обработка администратором работают.
5. Фильтры/ранжирование, отсутствие кандидатов, отказ и конкурентная бронь проверены.
6. Частичный резерв, выдача, расход/возврат, смета и завершение двух каналов проверены.
7. received однократно, FIFO, закупки без дубликатов, уведомления и повторный Cron проверены.
8. Справочники, выдача, одна оценка, аудит, агрегаты и отчёты работают.
9. Сквозные сценарии, ошибки, мобильные экраны, документация и развёртывание проверены.

## Оставшиеся технические детали
15 таблиц не имеют DDL в документе: их определения предварительные. Двухчасовой слот — интервал записи, работа занимает реальную длительность и буфер, возможно больше 2 часов. Перечень районов и часы работы задаются демоконфигурацией. R2 и отправка внешних сообщений вне MVP. Точные DDL и DTO реализуются и проверяются на этапе 2.


## Актуализация этапа 4 (29.10.2026)
API запросов реализован по docs/requests-api.md, миграция 0003. Канонический master_id сохранён, assigned_master_id — API-псевдоним. Контракт использует PATCH-действия по последнему запросу пользователя. Автоподбор/ранжирование остаётся этапом 5. Ветки API, не перечисленные в инструкции этапа 4, остаются проектом.

