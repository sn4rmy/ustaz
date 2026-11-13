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
| 401 | Нет токена, токен неверный или просрочен |
| 403 | Нет прав: нужен администратор |
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

Ошибки: 409 — e-mail уже занят; 422 — пароль короче 8 символов или неверный e-mail.

### POST /api/auth/login

Запрос:

```json
{"email": "student@example.com", "password": "secret123"}
```

Ответ 200:

```json
{"access_token": "<jwt>", "refresh_token": "<jwt>", "token_type": "bearer"}
```

Ошибки: 401 — неверный e-mail или пароль.

### POST /api/auth/refresh

Запрос:

```json
{"refresh_token": "<jwt>"}
```

Ответ 200:

```json
{"access_token": "<jwt>", "token_type": "bearer"}
```

Ошибки: 401 — refresh-токен неверный или просрочен. Тогда frontend отправляет пользователя на страницу входа.

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

Ответ 200, темы по порядку:

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

### GET /api/sessions/{session_id}/messages

Ответ 200, сообщения от старых к новым:

```json
[
  {"id": 100, "role": "user", "agent": null, "content": "Что делает GROUP BY?", "citations": [], "ai_generated": false, "created_at": "2026-11-16T09:01:00Z"},
  {"id": 101, "role": "assistant", "agent": "teacher", "content": "GROUP BY объединяет строки...", "citations": [{"material_id": 3, "material_title": "Конспект: агрегаты и GROUP BY", "chunk_id": 41}], "ai_generated": true, "created_at": "2026-11-16T09:01:06Z"}
]
```

### POST /api/sessions/{session_id}/messages

Запрос. `topic_id` и `action` необязательные. `action` — `explain` (объяснение) или `hint` (наводящий вопрос). Если у студента есть задание без попытки, backend сам отвечает в режиме `hint`.

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

Ошибки: 429 `daily_limit_reached` — исчерпан дневной лимит плана Free.

Сообщения с `ai_generated: true` frontend показывает с пометкой «Сгенерировано ИИ».

## Задания

Эталонный запрос (`answer_key`) не возвращается ни в одном ответе.

### POST /api/sessions/{session_id}/items/next

Выдаёт следующее задание по теме.

Запрос:

```json
{"topic_id": 3}
```

Ответ 200:

```json
{
  "id": 12,
  "topic_id": 3,
  "type": "sql_query",
  "prompt": "Выведите количество студентов в каждой группе.",
  "schema": [
    {"table": "students", "columns": ["id INTEGER", "name TEXT", "group_name TEXT"]},
    {"table": "grades", "columns": ["student_id INTEGER", "course TEXT", "grade INTEGER"]}
  ],
  "difficulty": 1
}
```

Ошибки: 404 — в теме нет заданий.

### POST /api/sessions/{session_id}/attempts

Проверяет запрос студента исполнением в учебной базе.

Запрос:

```json
{"item_id": 12, "answer": "SELECT group_name, COUNT(*) FROM students GROUP BY group_name"}
```

Ответ 201:

```json
{
  "attempt_id": 45,
  "correct": true,
  "score": 1.0,
  "feedback_code": "correct",
  "columns": ["group_name", "COUNT(*)"],
  "rows": [["IT-2401", 12], ["IT-2402", 9]],
  "error": null
}
```

- `feedback_code` — `correct`, `wrong_result` или `sql_error`. Текст для пользователя frontend берёт из переводов.
- `columns` и `rows` — результат запроса студента, не больше 50 строк.
- `error` — текст ошибки SQLite при `sql_error`, иначе `null`. Запрос, который меняет данные, тоже возвращает `sql_error`.

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
