# OTTO A1 — точки подключения интеграций

Этот файл описывает подготовленные точки для следующего разработчика. Реальные платёжные ключи и секреты в репозиторий не добавлять.

## Онлайн-касса

Цена продукта: **1000 RUB / 30 дней**.

Frontend:
- `src/lib/paymentClient.ts`
- UI подписки вызывает только `createPayment()` и не знает конкретного провайдера.

Backend endpoint:
- `netlify/functions/create-payment.js`
- здесь формируется платёж: 1000 RUB, описание, внутренний `user_id`, return URL и provider payment ID.

Provider adapter:
- `netlify/lib/payment-provider.js`
- сюда подключить SDK/API выбранной кассы.
- ожидаемые методы: `createPayment()`, `verifyPayment()`, `getPaymentStatus()`.

Webhook:
- `netlify/functions/payment-webhook.js`
- проверить подпись/секрет провайдера и server-to-server статус платежа.
- браузерный return URL никогда не выдаёт подписку.
- только подтверждённый webhook может обновить Supabase.

После подтверждения платежа обновить серверное `subscription_until`:
`max(текущее subscription_until, server_now) + 30 дней`.
Для этого требуется заранее согласованное поле/таблица Supabase и серверная функция обновления доступа.

Нейтральные ENV-имена для будущего подключения:
- `PAYMENT_PROVIDER_SECRET`
- `PAYMENT_PROVIDER_SHOP_ID`
- `PAYMENT_WEBHOOK_SECRET`

Существующий Telegram Stars backend не является новым пользовательским платёжным flow и не должен использоваться новой кнопкой оплаты. Не удалять его историю без отдельной миграционной задачи.

## Поддержка — подключено

Frontend:
- `src/lib/supportClient.ts` — список тикетов, диалог, создание, ответы, отметка прочитанного и закрытие.
- `src/components/SupportPage.tsx` — пользовательский интерфейс поддержки.
- `src/admin/AdminApp.tsx` — закрытая админ-панель `/admin`.

Backend endpoints:
- `netlify/functions/support-ticket.js` — операции пользователя только по его server-side session.
- `netlify/functions/admin-auth.js` — отдельная admin-session по логину/паролю из Netlify ENV.
- `netlify/functions/admin-support.js` — статистика, очередь, ответы и закрытие тикетов.

Supabase storage:
- `netlify/lib/support-storage.js`
- миграция/схема: `database/otto-support-schema.sql`
- таблицы: `support_tickets`, `support_messages`.

Правила:
- до 5 новых тикетов на пользователя за московские сутки;
- ответы внутри существующего тикета в этот лимит не входят;
- закрытый тикет не открывается повторно;
- история закрытых тикетов сохраняется без автоматического срока удаления;
- пользователь видит непрочитанные ответы поддержки в интерфейсе OTTO;
- admin login сохраняется в сообщениях/закрытии как служебная отметка автора;
- не сохранять cookies, session tokens, OTP, Telegram initData, API keys, Supabase tokens или любые другие секреты.

Admin ENV:
- `OTTO_ADMIN_LOGIN`
- `OTTO_ADMIN_PASSWORD`
- `OTTO_ADMIN_SESSION_SECRET`

## Единый аккаунт

Текущая идентичность строится вокруг одного внутреннего `user_id`.
Email выдаёт доступ только после успешного OTP. Telegram выдаёт существующую сессию только после серверной проверки подписанного initData и поиска связанной Telegram identity.

Ключевые файлы:
- `netlify/functions/email-otp-request.js`
- `netlify/functions/email-otp-verify.js`
- `netlify/functions/session.js`
- `netlify/lib/otto-supabase.js`
- `src/lib/accessClient.ts`

Не добавлять пароль, Google/Apple login или отдельный auth-provider без решения владельца.

## Supabase-схема, которая требует отдельного согласования

Обязательное будущее изменение, которое нельзя придумывать в коде без миграции:
1. `subscription_until` (или эквивалентный серверный entitlement) для 30-дневной подписки.

Точный показатель «Пройдено» уже реализован без новой таблицы: стабильные ID завершённых заданий хранятся в существующем серверно-синхронизируемом `user_state` под ключом `otto-module-task-completion-v1`. Повтор одного и того же задания не увеличивает счётчик. Отдельная таблица выполненных заданий может быть добавлена позже только как отдельная согласованная нормализация, но для текущего расчёта она не требуется.

До согласования платёжной схемы никакие фиктивные оплаты, обращения или даты платной подписки не создавать.

## Identity conflict

Если сервер возвращает `identity_conflict`, не объединять аккаунты автоматически и не переносить данные. Пользователю показывается сообщение о необходимости обратиться в поддержку. В серверный лог пишется только факт конфликта без e-mail, Telegram ID, OTP, initData или других идентификаторов/секретов. После подключения реального support storage такие случаи можно связывать с обращением пользователя на серверной стороне.
