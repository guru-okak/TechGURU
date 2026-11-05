> Актуализация 02.11.2026: серверные модули расширены, интерфейс подключён к API. Текущее состояние и запуск: [Подключение сайта к API](Подключение_сайта_к_API_2026-11-02.md). Ниже сохранено описание первоначального этапа.

# Этап 4: API заявок

## Запуск и проверка

```powershell
cd 'C:\Users\Alex\Desktop\Курсовая\Разработка\TechGURU'
npm run db:migrate
npm run db:seed
npm run db:check
npm run typecheck:server
npm run test:server
npm run test:d1
npm run dev:api
```

Перед запуском обновлённого сервера остановить старый через Ctrl+C. Повторный seed сохраняет существующие данные и добавляет окна на следующий день UTC; это позволяет проверить подтверждение и назначение на актуальную дату. Новые зависимости на этом этапе не добавлялись.

Во втором окне PowerShell готовый сценарий на Invoke-RestMethod:

```powershell
.\scripts\check-requests.ps1
```

Он входит клиентом и администратором, создаёт и назначает заявку, отдельно проверяет отмену, затем три недозвона. В основной демобазе остаются три созданные заявки; это демонстрация, не очистка данных. Скрипт выполняет logout для обеих сессий. Если окно 10:00 уже занято предыдущей демонстрацией, можно выбрать свободное:

```powershell
.\scripts\check-requests.ps1 -Hour 13
.\scripts\check-requests.ps1 -Base 'http://127.0.0.1:8788' -Hour 16
```

Параметры: Base, Hour (10/13/16), Day (YYYY-MM-DD), ServiceId (по умолчанию 1 — диагностика холодильника), MasterId (1 — выездной мастер). Назначение требует существующего свободного окна; произвольный Day не создаёт расписание автоматически. По умолчанию дата совпадает с генератором seed: следующий день относительно UTC, время 10:00/13:00/16:00 Europe/Moscow.

## Сверка с ТЗ и схемой

Исходники: `../../ТЗ/ТЗ_TechGURU_Лозинский_ИСП-049.docx`, `../../БД/Разработка_БД_TechGURU.docx`, уточнения пользователя 28–29.10.2026.

- Каноническая связь мастера — requests.master_id. Поле assigned_master_id в JSON является его псевдонимом, отдельная независимая связь не создавалась.
- Миграция 0003 добавляет request_number, assigned_at, cancel_reason, cancelled_by, внутреннюю version/last_operation_id и тип события истории. Первые миграции не переписывались, число предметных таблиц остаётся 21.
- Для onsite текущая согласованная БД требует service_district: Центральный/Северный/Южный. Адрес не используется для угадывания района. Помимо client_address передавать этот явный район.
- ТЗ разрешает ручное назначение только подходящему мастеру: навык с достаточным уровнем, активный пользователь-master, доступность, канал, район выезда, свободное расписание с полной длительностью услуги + 30 минут для onsite, дневной лимит. Проверка не ограничена существованием master_skills.
- Услуга должна быть активна, при подтверждении должно существовать подходящее по времени свободное окно соответствующего канала. До этапа 5 автоматический подбор/ранжирование не запускаются: confirmed получает needs_manual_review=1 и уведомление администраторам о ручном назначении. Успешное назначение снимает флаг.
- Переназначение разрешено из assigned до начала ремонта; старое окно освобождается, новый мастер и бронь сохраняются атомарно. Предыдущий мастер уведомляется о передаче.
- Клиент не редактирует заявку после создания и не может передавать user_id/status/master_id/request_number. Запрещённые поля отклоняются Zod с 422.

## Маршруты

| Метод | URL | Доступ |
|---|---|---|
| POST | /api/requests | client, создание своей заявки |
| GET | /api/requests | client, только свои |
| GET | /api/requests/:id | client, своя карточка, история и смета |
| PATCH | /api/requests/:id/cancel | client, своя из new/confirmed |
| GET | /api/admin/requests | admin, любые заявки |
| GET | /api/admin/requests/:id | admin, любая карточка |
| PATCH | /api/admin/requests/:id/confirm | admin, new → confirmed |
| PATCH | /api/admin/requests/:id/assign | admin, confirmed → assigned либо переназначение assigned |
| POST | /api/admin/requests/:id/no-answer | admin, комментарий без смены статуса |

Каждый write требует csrf_token cookie и X-CSRF-Token. Аутентификация/роли — через requireRole, который вызывает requireAuth. Чужая клиентская карточка и чужая отмена возвращают 404. Без сессии — 401, неверная роль — 403, недопустимый переход/конкурентное изменение/неподходящий мастер — 409. Публичного просмотра статуса по номеру нет.

Списки возвращают `{ data: [...], pagination: { limit, offset, total } }`, одиночная запись — `{ data: request }`. Параметры limit=1..100, offset>=0, status — из десяти утверждённых кодов. Для администратора дополнительно search и needs_manual_review=0/1. Поиск по номеру, ФИО, телефону профиля или snapshot-телефону; русские буквы сопоставляются независимо от регистра. Символы шаблонов трактуются буквально, параметры передаются SQL bind.

## Тело создания

```json
{
  "service_id": 1,
  "service_mode": "onsite",
  "description": "Холодильник плохо охлаждает",
  "preferred_datetime": "2026-10-30T10:00:00+03:00",
  "preferred_slot": "10:00-12:00",
  "client_address": "Москва, Центральная улица, 10",
  "service_district": "Центральный",
  "photos": []
}
```

Для dropoff вместо адреса/района передаётся dropoff_point_id; услуга и точка должны быть активны. Пример: service_id=5, service_mode=dropoff, dropoff_point_id=1. У onsite поле точки отсутствует либо null, у dropoff адрес/район отсутствуют либо null.

Дата — ISO 8601 с Z или смещением, хранится UTC. При создании она обязана быть будущей; её часы и минуты в Europe/Moscow должны совпадать с началом двухчасового preferred_slot. Секунды и миллисекунды — нулевые. photos — до 5 HTTP/HTTPS URL, без загрузки файлов; contact_person опционален. Ограничение всего JSON — 4096 байт.

Телефон копируется из профиля в contact_phone в момент вставки и не меняется вместе с профилем. Начальная предварительная смета содержит базовую услугу (request_items), total_price равен её base_price. Пересчёт ремонта/деталей — этап 6.

Номер TGR-YYYY-XXXXX присваивает БД. Год берётся из даты создания в Europe/Moscow; суффикс — возрастающий пятизначный номер внутри года. Есть UNIQUE и запрет изменения номера. Старые заявки получили номера при миграции. При исчерпании 99999 номеров в одном году API вернёт 409 REQUEST_NUMBER_EXHAUSTED. Номер не зависит от желаемой даты обслуживания.

## История, уведомления и атомарность

Создание: история null → new, аудит request_created, уведомление клиенту и pending email-очередь при наличии email.

Отмена: cancel_reason (по умолчанию «Отменено клиентом»), cancelled_by=client, статус cancelled, история, аудит и уведомление. Повторная отмена — 409 без дублирования событий. Существующие невыданные резервы освобождаются на центральном складе; выданные детали при new/confirmed считаются конфликтом и требуют разбора, а не молчаливого удаления.

Подтверждение/назначение: история, аудит, клиентское уведомление, очередь email. При назначении дополнительно уведомляется мастер; при переназначении — и предыдущий мастер. Назначение сохраняет assigned_at. Запись выполняется D1 batch с проверкой исходной версии и актуальных условий внутри UPDATE. Зависимые записи вставляются только для успешно выполненной операции по last_operation_id. Проверка окна и бронирование входят в ту же транзакцию.

Недозвон: event_type=no_answer, комментарий «Недозвон» либо «Недозвон: <текст>», from_status=to_status. Допускается только для активных заявок. Третий такой комментарий за последние 48 часов выставляет needs_manual_review=1 и уведомляет всех активных администраторов. Четвёртый не дублирует уведомление. Заявка автоматически не отклоняется, status_changed_at не сбрасывается. Ответ содержит no_answer_count за последние 48 часов.

Карточка считывает текущую запись и связанные историю/смету одним batch. audit_log, IP/UA и внутренние version/last_operation_id в карточку не выдаются.

## Команды Invoke-RestMethod вручную

После запуска API:

```powershell
$base = 'http://127.0.0.1:8787'
function Open-Session($email,$password) {
    $s = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    Invoke-RestMethod "$base/api/auth/csrf" -WebSession $s | Out-Null
    $headers = @{ 'X-CSRF-Token'=$s.Cookies.GetCookies([uri]$base)['csrf_token'].Value }
    $body = @{email=$email;password=$password} | ConvertTo-Json
    Invoke-RestMethod "$base/api/auth/login" -Method POST -WebSession $s `
        -Headers $headers -ContentType 'application/json' -Body $body | Out-Null
    return $s
}
function Csrf($s) { @{ 'X-CSRF-Token'=$s.Cookies.GetCookies([uri]$base)['csrf_token'].Value } }
$client = Open-Session 'anna@techguru.example' 'ClientDemo2026!'
$admin = Open-Session 'admin@techguru.example' 'AdminDemo2026!'
$day = [DateTime]::UtcNow.AddDays(1).ToString('yyyy-MM-dd')
$body = @{
    service_id=1; service_mode='onsite'; description='Холодильник плохо охлаждает'
    preferred_datetime="${day}T10:00:00+03:00"; preferred_slot='10:00-12:00'
    client_address='Москва, Центральная улица, 10'; service_district='Центральный'
} | ConvertTo-Json
$created = Invoke-RestMethod "$base/api/requests" -Method POST -WebSession $client `
    -Headers (Csrf $client) -ContentType 'application/json; charset=utf-8' `
    -Body ([Text.Encoding]::UTF8.GetBytes($body))
$id = $created.data.id
$created.data.request_number

Invoke-RestMethod "$base/api/requests?status=new" -WebSession $client
Invoke-RestMethod "$base/api/requests/$id" -WebSession $client | ConvertTo-Json -Depth 8
Invoke-RestMethod "$base/api/admin/requests?search=$($created.data.request_number)" -WebSession $admin

Invoke-RestMethod "$base/api/admin/requests/$id/confirm" -Method PATCH `
    -WebSession $admin -Headers (Csrf $admin)
Invoke-RestMethod "$base/api/admin/requests/$id/assign" -Method PATCH `
    -WebSession $admin -Headers (Csrf $admin) -ContentType 'application/json' -Body '{"master_id":1}'
```

Отменять нужно отдельную new/confirmed заявку. Для assigned ожидается 409:

```powershell
Invoke-RestMethod "$base/api/requests/$id/cancel" -Method PATCH `
    -WebSession $client -Headers (Csrf $client) -ContentType 'application/json' `
    -Body '{"cancel_reason":"Demo cancellation"}'
```

Недозвон для выбранной активной заявки:

```powershell
1..3 | ForEach-Object {
    Invoke-RestMethod "$base/api/admin/requests/$id/no-answer" -Method POST `
        -WebSession $admin -Headers (Csrf $admin)
}
```

Чужая карточка: войти ivan@techguru.example / ClientDemo2026! и запросить созданный Анной id — ожидается 404.

## Проверки

`test:d1`: 16 групп авторизации и 18 групп заявок в изолированных D1. Создание, валидация, уникальные номера под нагрузкой, snapshot, фильтры, чужие данные, отмена обоих разрешённых статусов, освобождение резервов, подтверждение, все ограничения назначения, переназначение, конкурентные назначения/отмена, rolling-window недозвонов, атомарный откат и перезапуск. Созданные тестовые пользователи/заявки не попадают в основную демобазу.

Три сообщения INTERNAL_ERROR при тестах заявок ожидаемы: тесты намеренно вызывают ошибки вставки уведомлений, чтобы доказать откат всей операции. Итог должен быть ok=true. Дополнительно сохранены 11 серверных проверок и TypeScript typecheck. PowerShell-сценарий check-requests.ps1 отдельно проверен через настоящие Invoke-RestMethod в изолированной D1.

Документация о транзакционном batch: https://developers.cloudflare.com/d1/worker-api/d1-database/ ; особенности RETURNING после AFTER-триггеров: https://www.sqlite.org/lang_returning.html .
