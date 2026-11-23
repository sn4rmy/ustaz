# API

Контракт между frontend и backend для Milestone 2. Формат запросов и ответов меняется только через PR с правкой этого файла.

## Общее

- Базовый адрес при локальном запуске: `http://localhost:8000`. Все пути начинаются с `/api`.
- Запросы и ответы — JSON. Даты — ISO 8601 в UTC. Идентификаторы — целые числа.
- Авторизация: заголовок `Authorization: Bearer <access_token>`. Нужна везде, кроме регистрации, входа, обновления токена, webhook и `/api/health`.
- Ошибка всегда имеет вид `{"detail": "<код или текст>"}`.
- Значения полей: `language` — `kk`, `ru`, `en`; `role` — `student`, `admin`; `plan` — `free`, `premium`.
- Интерактивная документация: `http://localhost:8000/docs`.

| Код | Когда |
|---|---|
| 400 | Неверный запрос |
| 401 | Нет токена (`not_authenticated`), токен неверный или просрочен (`invalid_token`) |
| 403 | Нет прав: нужен администратор (`admin_required`) |
| 404 | Объект не найден |
| 409 | Конфликт: e-mail уже занят |
| 422 | Поля не прошли проверку |
| 429 | Дневной лимит сообщений: `{"detail": "daily_limit_reached"}` |

## Служебное

### GET /api/health

Ответ 200:

```json
{"status": "ok"}
```

## Авторизация

### POST /api/auth/register

Запрос:

```json
{"email": "student@example.com", "password": "secret123", "name": "Aliya", "language": "ru"}
```

Ответ 201:

```json
{"id": 1, "email": "student@example.com", "name": "Aliya", "language": "ru", "role": "student", "plan": "free"}
```

E-mail сохраняется в нижнем регистре: `Aliya@Mail.com` и `aliya@mail.com` — один аккаунт.

Ошибки: 409 — e-mail уже занят (`email_taken`); 422 — пароль короче 8 символов или длиннее 72 байт в UTF-8 (ограничение bcrypt; кириллицей это 36 символов), неверный e-mail.

### POST /api/auth/login

Запрос:

```json
{"email": "student@example.com", "password": "secret123"}
```

Ответ 200:

```json
{"access_token": "<jwt>", "refresh_token": "<jwt>", "token_type": "bearer"}
```

Ошибки: 401 — неверный e-mail или пароль (`invalid_credentials`).

### POST /api/auth/refresh

Запрос:

```json
{"refresh_token": "<jwt>"}
```

Ответ 200:

```json
{"access_token": "<jwt>", "token_type": "bearer"}
```

Ошибки: 401 — refresh-токен неверный или просрочен (`invalid_token`). Тогда frontend отправляет пользователя на страницу входа.

### GET /api/users/me

Ответ 200:

```json
{"id": 1, "email": "student@example.com", "name": "Aliya", "language": "ru", "role": "student", "plan": "free"}
```

### PATCH /api/users/me

Меняет имя и язык. Оба поля необязательные.

Запрос:

```json
{"name": "Aliya", "language": "kk"}
```

Ответ 200: пользователь в том же виде, что в `GET /api/users/me`.

## Курсы и материалы

### GET /api/courses

Ответ 200:

```json
[{"id": 1, "title": "Базы данных (SQL)", "language": "ru"}]
```

### GET /api/courses/{course_id}/topics

Ответ 200, темы по порядку (`position`). Курса нет — 404 `course_not_found`.

```json
[
  {"id": 1, "title": "SELECT и WHERE", "position": 1},
  {"id": 2, "title": "Сортировка и LIMIT", "position": 2}
]
```

### POST /api/courses

Только администратор.

Запрос:

```json
{"title": "Базы данных (SQL)", "language": "ru"}
```

Ответ 201: `{"id": 1, "title": "Базы данных (SQL)", "language": "ru"}`.

### POST /api/courses/{course_id}/topics

Только администратор.

Запрос:

```json
{"title": "JOIN", "position": 4}
```

Ответ 201: `{"id": 4, "title": "JOIN", "position": 4}`.

### POST /api/courses/{course_id}/materials

Только администратор. Запрос `multipart/form-data`: поле `title` и поле `file` (PDF, Markdown или TXT).

Ответ 201:

```json
{"id": 3, "title": "Конспект: JOIN", "chunks_count": 12}
```

Ошибки: 400 `unsupported_file_type` (не PDF, `.md` или `.txt`), `unreadable_file` (повреждённый PDF или текст не в UTF-8), `empty_material` (в файле нет текста); 404 `course_not_found`; 503 `llm_unavailable` (не удалось посчитать эмбеддинги, материал не сохранён).

## Чат

Одно сообщение студента — один ответ ассистента. Ответ приходит целиком, без стриминга.

### POST /api/sessions

Запрос:

```json
{"course_id": 1}
```

Ответ 201:

```json
{"id": 10, "course_id": 1, "created_at": "2026-11-16T09:00:00Z"}
```

Ошибки: 404 `course_not_found`.

### GET /api/sessions/{session_id}

Ответ 200 — та же сессия, что в `POST /api/sessions`:

```json
{"id": 10, "course_id": 1, "created_at": "2026-11-16T09:00:00Z"}
```

Ошибки: 404 `session_not_found` — сессии нет или она другого пользователя. Так же отвечают остальные эндпоинты с `{session_id}`.

### GET /api/sessions/{session_id}/messages

Ответ 200, сообщения от старых к новым:

```json
[
  {"id": 100, "role": "user", "agent": null, "content": "Что делает GROUP BY?", "citations": [], "ai_generated": false, "created_at": "2026-11-16T09:01:00Z"},
  {"id": 101, "role": "assistant", "agent": "teacher", "content": "GROUP BY объединяет строки...", "citations": [{"material_id": 3, "material_title": "Конспект: агрегаты и GROUP BY", "chunk_id": 41}], "ai_generated": true, "created_at": "2026-11-16T09:01:06Z"}
]
```

### POST /api/sessions/{session_id}/messages

Запрос. `content` — от 1 до 4000 символов. `topic_id` и `action` необязательные. `action` — `explain` (объяснение) или `hint` (наводящий вопрос), по умолчанию `explain`. Если у студента есть задание без попытки, backend сам отвечает в режиме `hint`. Указанная тема запоминается в сессии для следующих сообщений. Ответ — на языке из профиля пользователя.

```json
{"content": "Что делает GROUP BY?", "topic_id": 3, "action": "explain"}
```

Ответ 201 — сообщение ассистента:

```json
{
  "id": 101,
  "role": "assistant",
  "agent": "teacher",
  "content": "GROUP BY объединяет строки с одинаковым значением...",
  "citations": [{"material_id": 3, "material_title": "Конспект: агрегаты и GROUP BY", "chunk_id": 41}],
  "ai_generated": true,
  "created_at": "2026-11-16T09:01:06Z"
}
```

Если в материалах курса ответа нет, `citations` пустой, а в `content` об этом сказано прямо.

Ошибки: 404 `session_not_found`, `topic_not_found` (темы нет или она из другого курса); 429 `daily_limit_reached` — исчерпан дневной лимит плана Free; 503 `llm_unavailable` — модель не ответила, сообщение не сохранено и в лимит не засчитано.

Сообщения с `ai_generated: true` frontend показывает с пометкой «Сгенерировано ИИ».

## Задания

Эталонный запрос (`answer_key`) не возвращается ни в одном ответе. Задания и попытки не засчитываются в дневной лимит сообщений: модель при проверке не вызывается.

### POST /api/sessions/{session_id}/items/next

Выдаёт следующее задание по теме: нерешённое, сначала самое лёгкое. Если решены все — любое задание темы. Пока задание не решено верно, оно выдаётся снова. Задание становится открытым в сессии: пока по нему нет попытки, Teacher в чате даёт только наводящий вопрос.

Запрос:

```json
{"topic_id": 4}
```

Ответ 200:

```json
{
  "id": 10,
  "topic_id": 4,
  "type": "sql_query",
  "prompt": "Выведите имя каждого сотрудника и название его отдела. Сотрудников без отдела не выводите. Столбцы: имя сотрудника, название отдела.",
  "schema": [
    {"table": "departments", "columns": ["id INTEGER", "name TEXT"]},
    {"table": "employees", "columns": ["id INTEGER", "name TEXT", "department_id INTEGER", "salary INTEGER", "hire_date TEXT"]}
  ],
  "difficulty": 1
}
```

Ошибки: 404 `session_not_found`, `topic_not_found` (темы нет или она из другого курса), `no_items` (в теме нет заданий).

### POST /api/sessions/{session_id}/attempts

Проверяет запрос студента исполнением в учебной базе SQLite и сравнивает результат с результатом эталона.

Запрос:

```json
{"item_id": 10, "answer": "SELECT e.name, d.name FROM employees e JOIN departments d ON d.id = e.department_id"}
```

`answer` — от 1 до 4000 символов, пробелы по краям обрезаются.

Ответ 201:

```json
{
  "attempt_id": 45,
  "correct": true,
  "score": 1.0,
  "feedback_code": "correct",
  "columns": ["name", "name"],
  "rows": [["Айгерим Садыкова", "Разработка"], ["Ержан Мукашев", "Разработка"]],
  "error": null
}
```

- `feedback_code` — `correct`, `wrong_result` или `sql_error`. Текст для пользователя frontend берёт из переводов.
- Сравниваются число и порядок столбцов и строки результата. Имена столбцов не важны: `COUNT(*)` и `COUNT(*) AS total` — одно и то же. Порядок строк важен, только если задание требует сортировку.
- `columns` и `rows` — результат запроса студента, не больше 50 строк. При `sql_error` оба пустые.
- `error` — при `sql_error` текст ошибки на английском, иначе `null`. Обычно это текст SQLite (`no such table: staff`), а также:
  - `only SELECT and WITH queries are allowed` — запрос меняет данные или настройки (INSERT, UPDATE, DELETE, DROP, ATTACH, PRAGMA и т. п.);
  - `the query took longer than 2 seconds`;
  - `the result has more than 1000 rows`;
  - `the query returned no result` — пустой запрос или только комментарий.
- После верной попытки задание закрывается; после неверной остаётся открытым, можно пробовать снова.

Ошибки: 404 `session_not_found`, `item_not_found` (задания нет или оно из другого курса); 422 — пустой или слишком длинный `answer`.

## Оплата

### GET /api/billing/plans

Ответ 200. Сумма в примере условная.

```json
[
  {"code": "free", "daily_message_limit": 20, "price": null},
  {"code": "premium", "daily_message_limit": null, "price": {"amount": "4.99", "currency": "USD", "interval": "month"}}
]
```

### GET /api/billing/subscription

Ответ 200:

```json
{"plan": "free", "status": "active", "current_period_end": null, "messages_used_today": 7, "daily_message_limit": 20}
```

Для Premium `daily_message_limit` равен `null`, `current_period_end` — дата конца оплаченного периода.

### POST /api/billing/checkout

Возвращает данные, по которым frontend открывает оплату. Тело запроса пустое.

Ответ 200, провайдер Paddle:

```json
{
  "provider": "paddle",
  "environment": "sandbox",
  "client_token": "test_xxxxxxxx",
  "price_id": "pri_xxxxxxxx",
  "custom_data": {"user_id": "1"}
}
```

Frontend инициализирует Paddle.js значениями `environment` и `client_token` и открывает Paddle Checkout с `price_id`, e-mail пользователя и `custom_data`.

Ответ 200, тестовый провайдер:

```json
{"provider": "mock"}
```

В этом случае frontend вызывает `POST /api/billing/mock/complete`.

### POST /api/billing/mock/complete

Работает только с тестовым провайдером. Включает Premium текущему пользователю.

Ответ 200: подписка в том же виде, что в `GET /api/billing/subscription`. Если провайдер не тестовый — 404.

### POST /api/billing/webhook

Вызывает Paddle, не frontend. Авторизация — подпись в заголовке `Paddle-Signature`, токен не нужен.

Ответ 200: `{"received": true}`. Неверная подпись — 400 `{"detail": "invalid_signature"}`, данные не меняются.

После успешной оплаты подписка меняется не мгновенно: frontend несколько секунд опрашивает `GET /api/billing/subscription`.
