# Sunqar

Закрытое приложение на `Next.js App Router` с авторизацией через `login + password`, хранением пользователей и сессий в `SQLite`.

## Requirements

- `Node.js 22+`
- `npm`

## Environment

Создайте локальный `.env` на основе [.env.example](/home/rushad/work/sunqar/.env.example):

```env
AUTH_SECRET=change-me-in-production
DATABASE_PATH=./data/sunqar.db
```

- `AUTH_SECRET` обязателен в production
- `DATABASE_PATH` по умолчанию указывает на `data/sunqar.db`

## Install

```bash
npm install
```

## First Run

1. Примените миграции к локальной базе:

```bash
npm run db:migrate
```

2. Создайте первого администратора:

```bash
npm run db:seed-admin -- admin password123 "Administrator"
```

Можно использовать и переменные окружения:

```bash
ADMIN_LOGIN=admin ADMIN_PASSWORD=password123 ADMIN_DISPLAY_NAME="Administrator" npm run db:seed-admin
```

3. Запустите dev-сервер:

```bash
npm run dev
```

После этого вход выполняется на `/login`.

## Database Commands

### `npm run db:migrate`

Применяет уже существующие SQL-миграции к текущей SQLite-базе.

Используйте:
- при первом запуске проекта
- после получения новых миграций из репозитория
- после смены `DATABASE_PATH`, если нужно инициализировать новую БД

### `npm run db:seed-admin -- <login> <password> [display-name]`

Создает пользователя с ролью `admin`.

Особенности:
- если пользователь с таким `login` уже существует, скрипт завершится с ошибкой
- перед запуском таблицы уже должны быть созданы через `npm run db:migrate`

### `npm run db:seed-ai-models`

Создает или обновляет справочник AI-моделей.

Особенности:
- скрипт можно запускать повторно
- существующие модели ищутся по паре `provider + model_id`
- для существующих моделей обновляются `display_name`, `is_active` и `updated_at`
- перед запуском таблицы уже должны быть созданы через `npm run db:migrate`

### `npm run db:generate`

Генерирует новую миграцию из изменений в [src/lib/db/schema.ts](/home/rushad/work/sunqar/src/lib/db/schema.ts).

Используйте только когда меняется структура БД:
- таблицы
- колонки
- индексы
- foreign keys
- unique constraints

Обычный workflow:

1. Изменить схему в `src/lib/db/schema.ts`
2. Запустить `npm run db:generate`
3. Закоммитить новые файлы из `drizzle/`
4. Запустить `npm run db:migrate` на нужной среде

Если схема не менялась, `db:generate` запускать не нужно.

## Checks

```bash
npm run lint
npm run typecheck
```

`next build` в этом репозитории запускать не нужно.
