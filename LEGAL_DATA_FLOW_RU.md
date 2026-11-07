# OTTO A1 — data-flow / legal release checkpoint

Дата аудита: 2026-09-23

## Статусы доказательств

- **CONFIRMED BY CODE** — видно непосредственно в репозитории.
- **CONFIRMED BY DEPLOY METADATA** — подтверждено Netlify metadata.
- **OWNER-REPORTED / NOT INDEPENDENTLY VERIFIED** — сообщил владелец, независимого доступа к инфраструктуре нет.
- **UNKNOWN** — текущими инструментами не подтверждено.

## Primary account / learning storage

**OWNER-REPORTED / NOT INDEPENDENTLY VERIFIED:** владелец сообщил, что основная база персональных данных OTTO размещена на локальном сервере в Российской Федерации.

Код подтверждает server-side account/progress/state storage через Supabase-compatible REST API и схему `otto_a1`, но фактический адрес/регион `OTTO_SUPABASE_URL` в репозитории не раскрыт.

## Подтверждённые внешние потоки

### Email OTP
**CONFIRMED BY CODE:** raw e-mail передаётся API UniSender для отправки одноразового кода. Challenge/rate-limit используют Netlify Blobs; в challenge хранится digest e-mail, а rate-limit использует digest e-mail/IP.

### Schreiben
**CONFIRMED BY CODE:** текст пользователя и при наличии фото передаются серверной функции проверки, которая вызывает внешний AI endpoint из `OPENAI_BASE_URL`.

Фактический поставщик/география этого endpoint — **UNKNOWN** без runtime env/config.

### Sprechen / voice
**CONFIRMED BY CODE:** аудио пользователя передаётся функции проверки/распознавания, которая использует Google Gemini API-compatible endpoint из `GOOGLE_GEMINI_BASE_URL`.

Фактический маршрут/страна endpoint — **UNKNOWN** без runtime env/config.

### Netlify
**CONFIRMED BY DEPLOY METADATA для Preview перед legal-блоком:** serverless/functions region = `cmh`, Netlify Blobs region = `us-east-2`.

Это не подтверждает регион основной базы OTTO, но означает, что часть технической обработки Preview выполняется вне РФ.

### Поддержка
**CONFIRMED BY CODE:** обращения пользователя проходят через server-side session и сохраняются в Supabase-compatible схеме `otto_a1` в таблицах `support_tickets` и `support_messages`. Для первого сообщения могут сохраняться URL страницы и user-agent; cookies, session token, OTP, Telegram initData и API/Supabase secrets в тикет не передаются.

**CONFIRMED BY CODE:** ответы администратора выполняются через отдельную HttpOnly admin-session. В сообщении сохраняется служебный `admin_login`, а закрытый тикет остаётся доступен только для чтения. Автоматический срок удаления истории поддержки кодом не задан.

## Legal-consent storage

Legal acceptance версии `2026-09-23-v1` сохраняется server-side в существующем `user_state` отдельным ключом `otto-legal-acceptance:<version>`.

Клиентский endpoint `/api/state` не разрешает PUT/DELETE этого ключа, поэтому обычная синхронизация прогресса не может удалить или подменить запись о согласии.

Фиксируются:
- user_id через server-side session;
- версия документов;
- server timestamp;
- способ подтверждения;
- channel (web / pwa / telegram);
- источник фиксации.

## Release compliance gate

Локализация основной базы в РФ и трансграничная передача — разные требования.

Даже если primary storage находится в РФ, передача e-mail, текста, изображения или аудио иностранному юридическому лицу или на иностранную инфраструктуру может образовывать трансграничную передачу.

До production организационно подтвердить применимость и выполнение требований статьи 12 152-ФЗ для реально используемых маршрутов/providers.

Код legal-блока НЕ является доказательством подачи уведомления Роскомнадзору и НЕ должен описываться как полное юридическое соответствие сам по себе.
