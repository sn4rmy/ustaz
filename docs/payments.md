# Оплата: Paddle sandbox

Premium оплачивается через Paddle Billing в режиме sandbox: работают только тестовые карты, реальных денег нет. Если sandbox недоступен, backend работает с `PAYMENT_PROVIDER=mock` — тот же поток без Paddle (см. [риски](risks.md), риск 2).

Формат запросов и ответов — в [api.md](api.md), раздел «Оплата».

## Как проходит оплата

1. Frontend вызывает `POST /api/billing/checkout` и получает `client_token`, `price_id` и `custom_data` с `user_id`.
2. Paddle.js открывает окно оплаты. Данные карты вводятся только у Paddle и к нам не попадают.
3. После оплаты Paddle создаёт подписку и отправляет webhook на `POST /api/billing/webhook`. `custom_data` из оплаты Paddle копирует в подписку.
4. Backend проверяет подпись, находит пользователя по `custom_data.user_id` и обновляет его строку в `subscriptions`.

## Аккаунт

- Кабинет: https://sandbox-vendors.paddle.com, регистрация: https://sandbox-vendors.paddle.com/signup.
- Владелец аккаунта — Абылайхан. Остальным участникам — приглашение в кабинете, а не общий пароль.
- Sandbox и боевой аккаунт Paddle полностью раздельны: свои данные и свои ключи.

## Продукт и цена

Раздел кабинета: Catalog → Products.

| Поле | Значение |
|---|---|
| Продукт | Ustaz Premium |
| Налоговая категория | Standard digital goods |
| Цена | 4.99 USD в месяц, без пробного периода |

Цена предварительная, окончательную обосновываем в экономической части диплома.

## Адрес оплаты

Раздел кабинета: Checkout → Checkout settings → Default payment link.

Без этого адреса окно оплаты не открывается (`checkout.error`). Указываем адрес frontend, локально — `http://localhost:5173`. В sandbox подходит любой домен, подтверждать его не нужно.

## Переменные окружения

| Переменная | Пример | Секрет | Где взять |
|---|---|---|---|
| `PAYMENT_PROVIDER` | `paddle` или `mock` | нет | — |
| `PADDLE_ENVIRONMENT` | `sandbox` | нет | — |
| `PADDLE_CLIENT_TOKEN` | `test_…` | нет: этот токен уходит во frontend | Settings → Authentication → Client-side tokens |
| `PADDLE_PRICE_ID` | `pri_…` | нет | Catalog → Products → Ustaz Premium → цена |
| `PADDLE_WEBHOOK_SECRET` | `pdl_ntfset_…` | да | Events → Notifications → destination → Edit destination |

- Значения хранятся только в `backend/.env`, в git они не попадают. Секрет передаём лично, не в общие чаты.
- API-ключ Paddle сейчас не нужен: backend не обращается к API Paddle, а только принимает webhook.
- Тесты и CI работают с `PAYMENT_PROVIDER=mock`, ключи Paddle им не нужны.

## Webhook

Раздел кабинета: Events → Notifications → New destination.

| Поле | Значение |
|---|---|
| Тип | URL |
| Адрес | `https://<публичный адрес backend>/api/billing/webhook` |
| События | `subscription.created`, `subscription.updated` |

- Отмена, пауза и продление приходят как `subscription.updated` с новым `status`, отдельные события для них не нужны.
- Локально backend не виден из интернета, поэтому для проверки webhook нужен туннель с HTTPS-адресом.
- В sandbox Paddle делает только 3 попытки доставки за пару минут — во время проверки backend должен быть запущен.
- Подписка без `custom_data.user_id` или с несуществующим пользователем пропускается с ответом 200, чтобы Paddle не повторял отправку.
- Порядок доставки событий Paddle не гарантирует, а backend применяет их в порядке получения. Для sandbox этого достаточно; для боевого режима нужно хранить время последнего события и отбрасывать более старые.

### Проверка подписи

Заголовок `Paddle-Signature` выглядит так: `ts=1671552777;h1=eb4d0dc8…`.

1. Собрать строку `ts + ":" + сырое тело запроса`. Тело берётся байт в байт, до разбора JSON.
2. Посчитать HMAC-SHA256 этой строки с ключом `PADDLE_WEBHOOK_SECRET`.
3. Сравнить результат в hex с `h1`. При смене ключа `h1` может быть несколько — подходит любой.
4. Отклонить запрос, если `ts` отличается от текущего времени больше чем на 5 секунд (значение по умолчанию у Paddle): это защита от повторной отправки старого запроса.

Неверная подпись — ответ 400 `invalid_signature`, данные не меняются.

### Статус подписки и план

| `status` в Paddle | План в Ustaz |
|---|---|
| `active`, `trialing`, `past_due` | Premium |
| `paused`, `canceled` | Free |

Если у отменённой подписки `scheduled_change.effective_at` в будущем, Premium остаётся до этой даты.

## Тестовая оплата

| Карта | Номер |
|---|---|
| Успешная, без 3DS | `4242 4242 4242 4242` |
| Успешная, с 3DS | `4000 0038 0000 0446` |
| Отклонённая | `4000 0000 0000 0002` |

Имя владельца — любое, срок действия — любой в будущем, CVC — `100`.

- На окне оплаты в sandbox есть пометка «Test Mode».
- Письма sandbox отправляет только на адреса домена аккаунта, остальные пересылаются на основной e-mail владельца.
- Оплата видна в кабинете: Transactions и Subscriptions.
