> Актуализация 02.11.2026: серверные модули расширены, интерфейс подключён к API. Текущее состояние и запуск: [Подключение сайта к API](Подключение_сайта_к_API_2026-11-02.md). Ниже сохранено описание первоначального этапа.

# Этап 3: учётные записи и авторизация

## Реализованные маршруты

| Метод | URL | Результат |
|---|---|---|
| GET | /api/auth/csrf | Выдаёт csrf_token cookie и data.csrfToken |
| POST | /api/auth/register | Создаёт client, 201; вход выполняется отдельно |
| POST | /api/auth/login | Проверяет пароль, создаёт сессию и cookies |
| POST | /api/auth/refresh | Обновляет access и однократно ротирует refresh |
| POST | /api/auth/logout | Удаляет текущую сессию и очищает cookies |
| GET | /api/auth/me | Публичные поля текущего пользователя; иначе 401 |
| GET | /api/admin/auth-check | Проверка requireRole(['admin']): 200/401/403 |

Для всех auth POST нужен double-submit CSRF: cookie csrf_token и совпадающий X-CSRF-Token. Сначала вызвать GET /api/auth/csrf. Login/refresh меняют CSRF-cookie: перед следующим POST читать актуальный токен из cookie-сессии. При наличии Origin он обязан совпадать с origin API. На следующем этапе подключения фронтенда используем same-origin proxy, а не открытый CORS.

## Структура
- shared/contracts/auth.ts: Zod, нормализация email/телефона, публичная модель.
- server/security/passwords.ts: PBKDF2 через Web Crypto, проверка существующих seed-хешей.
- server/security/tokens.ts: jose HS256, issuer/audience/тип JWT, сроки, случайные refresh и SHA-256.
- server/security/cookies.ts: HttpOnly/SameSite/Secure и CSRF.
- server/repositories/auth.ts: SQL и атомарные D1 batch для регистрации, сессий, ротации и аудита.
- server/services/auth.ts: сценарии авторизации и ограничение входа.
- server/middleware/auth.ts: requireAuth и requireRole(roles).
- server/routes/auth.ts: HTTP-маршруты.
- db/migrations/0002_auth_sessions.sql: refresh_jti и индекс; число предметных таблиц остаётся 21.

Регистрация принимает только email/password/full_name/phone. Переданный role отвергается (422); роль в SQL всегда client. Email приводится к нижнему регистру, телефон к +<цифры>. Пароль: 8–128 символов, без trim; ФИО: 2–150 символов, телефон 10–15 цифр. Дубликат email/телефона — 409. PBKDF2-SHA256: 100000 итераций, соль >=16 байт, 32-байтовый результат в PHC-строке.

Access-JWT: 900 секунд, cookie access_token (HttpOnly, Path=/api). Refresh: 604800 секунд, cookie refresh_token (HttpOnly, Path=/api/auth), формат JTI + случайный 256-битный секрет. В sessions сохраняются refresh_jti и только SHA-256 полного refresh, не исходный токен. Cookies SameSite=Strict; Secure обязателен, исключение — явно локальный HTTP loopback. Access/refresh не выдаются в JSON; CSRF-токен доступен клиенту через отдельный bootstrap-маршрут.

requireAuth проверяет подпись/алгоритм/issuer/audience/сроки JWT и действительность связанной сессии, активность пользователя и актуальность роли. Поэтому выход немедленно делает непригодным даже ещё не истёкший JWT. Смена роли требует refresh либо нового входа. Несколько устройств имеют отдельные сессии; logout удаляет только текущую. При истёкшем/отсутствующем access выход может использовать действующий refresh. Refresh выполняет условную замену старого хеша/JTI; при параллельных запросах ровно один побеждает, повтор старого токена получает 401.

Пять неудачных входов с одного IP за 15 минут создают блокировку на 15 минут от пятой ошибки. Следующий вход — 429 и Retry-After. Ограничение хранится в audit_log, переживает перезапуск, не сбрасывается успешным входом. В Cloudflare IP берётся из CF-Connecting-IP, локально используется 127.0.0.1. JSON-поля не могут подменить IP/UA. Общий текст ошибки входа не раскрывает наличие аккаунта. Регистрация, вход, refresh и logout фиксируются в аудите без паролей/токенов.

Локальный JWT_SECRET автоматически генерируется в `.local/d1/auth-secret.json`, не попадает в Git и сохраняется при перезапусках. Не удалять файл, если нужно сохранить действительность cookies. Для будущего production-развёртывания JWT_SECRET должен быть задан как секрет Worker; общего ключа в исходниках нет. APP_ENV/локальные настройки не заменяют production-конфигурацию.

## Запуск

Остановить ранее запущенный API (Ctrl+C), затем:

```powershell
cd 'C:\Users\Alex\Desktop\Курсовая\Разработка\TechGURU'
npm ci --cache .cache/npm
npm run db:migrate
npm run db:check
npm run test:server
npm run typecheck:server
npm run test:d1
npm run dev:api
```

Повторный seed для этого этапа не требуется, существующие аккаунты совместимы. Для новой базы перед тестами выполнить `npm run db:seed`. `db:check` теперь печатает явную сводку, включая `services: 5`, и завершится ошибкой при нарушении целостности.

По умолчанию порт 8787. При занятом порте в том же окне PowerShell:

```powershell
$env:API_PORT = '8788'
npm run dev:api
```

В этом случае заменить порт в $base ниже. Тесты сами выбирают свободный порт. Авторизация тестируется в отдельной временной D1; тестовые пользователи/блокировки не добавляются в демобазу. Исходный persistence smoke оставляет только одну диагностическую запись в основной базе.

## Демо-аккаунты

| Роль | Email | Пароль |
|---|---|---|
| Администратор | admin@techguru.example | AdminDemo2026! |
| Клиент | anna@techguru.example | ClientDemo2026! |
| Клиент | ivan@techguru.example | ClientDemo2026! |
| Выездной мастер | onsite@techguru.example | MasterDemo2026! |
| Мастер в сервисе | dropoff@techguru.example | MasterDemo2026! |

Это серверные аккаунты. Прежняя форма входа Vue пока остаётся демонстрационной и не подключена к API.

## PowerShell: вход, текущий пользователь, refresh и выход

В отдельном окне:

```powershell
$base = 'http://127.0.0.1:8787'
$session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
Invoke-RestMethod "$base/api/auth/csrf" -WebSession $session | Out-Null

function Get-CsrfHeaders {
    @{ 'X-CSRF-Token' = $session.Cookies.GetCookies([uri]$base)['csrf_token'].Value }
}

$login = @{ email='anna@techguru.example'; password='ClientDemo2026!' } | ConvertTo-Json
Invoke-RestMethod "$base/api/auth/login" -Method Post -WebSession $session `
    -Headers (Get-CsrfHeaders) -ContentType 'application/json; charset=utf-8' -Body $login

Invoke-RestMethod "$base/api/auth/me" -WebSession $session | ConvertTo-Json -Depth 5

Invoke-RestMethod "$base/api/auth/refresh" -Method Post -WebSession $session `
    -Headers (Get-CsrfHeaders)

# Под клиентом ожидается 403; исключение обработано, чтобы сценарий продолжился.
try {
    Invoke-RestMethod "$base/api/admin/auth-check" -WebSession $session
} catch { [int]$_.Exception.Response.StatusCode }

Invoke-RestMethod "$base/api/auth/logout" -Method Post -WebSession $session `
    -Headers (Get-CsrfHeaders)

# После выхода ожидается 401.
try {
    Invoke-RestMethod "$base/api/auth/me" -WebSession $session
} catch { [int]$_.Exception.Response.StatusCode }
```

Для проверки доступа администратора создать новую $session, получить CSRF и войти с admin@techguru.example / AdminDemo2026!: GET /api/admin/auth-check должен вернуть 200.

## PowerShell: регистрация

Создаёт пользователя в основной демобазе. Повтор тех же email/телефона вернёт 409. Для повторной проверки выбрать новые значения.

```powershell
$base = 'http://127.0.0.1:8787'
$registerSession = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$csrf = Invoke-RestMethod "$base/api/auth/csrf" -WebSession $registerSession
$registration = @{
    email = 'new.client@example.test'
    password = 'NewClient2026!'
    full_name = 'Новый Клиент'
    phone = '+79991234567'
} | ConvertTo-Json
$bytes = [System.Text.Encoding]::UTF8.GetBytes($registration)
Invoke-RestMethod "$base/api/auth/register" -Method Post -WebSession $registerSession `
    -Headers @{ 'X-CSRF-Token'=$csrf.data.csrfToken } `
    -ContentType 'application/json; charset=utf-8' -Body $bytes
```

Проверка записи (не выводит password_hash):

```powershell
npm run db:sql -- "SELECT id,email,phone,role FROM users WHERE email='new.client@example.test';"
```

## Тесты

`npm run test:d1` включает успешную регистрацию/вход, 401 без JWT, 403 неверной роли, admin 200, валидацию, дубликаты, CSRF, сроки и атрибуты cookies, сохранение JTI/хеша, поддельный/истёкший JWT, отключённого пользователя, ротацию и конкурентный refresh, restart, logout/replay и блокировку после пяти ошибок. Все auth-действия выполняются HTTP-запросами к настоящему workerd/D1; проверка записей/подготовка специальных состояний выполняется через SQLite-файл изолированной D1, поскольку Node RPC getD1Database у используемой beta Miniflare неисправен. Тестовая папка удаляется после закрытия соединений с проверкой её границ.

Официальные API библиотеки JWT: https://github.com/panva/jose/blob/main/docs/jwt/sign/classes/SignJWT.md и https://github.com/panva/jose/blob/main/src/jwt/verify.ts .

