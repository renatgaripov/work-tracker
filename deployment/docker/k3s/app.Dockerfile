# syntax=docker.io/docker/dockerfile:1.7-labs

# Этап 1: Установка зависимостей
FROM node:22-alpine3.22 AS deps

# Установка необходимых инструментов для сборки нативных модулей (better-sqlite3)
RUN apk add --no-cache make gcc g++ python3

WORKDIR /app

# Копируем зависимости и Prisma-схему
COPY package.json yarn.lock ./
COPY prisma ./prisma

# Копируем файлы для установки зависимостей
COPY package.json yarn.lock ./

# Устанавливаем все зависимости (включая devDependencies для сборки)
RUN yarn install

# Генерация Prisma клиентских файлов
RUN npx prisma generate


# Этап 2: Сборка приложения
FROM node:22-alpine3.22 AS builder

WORKDIR /app

# Копируем node_modules из предыдущего этапа
COPY --from=deps /app/node_modules ./node_modules

# Копируем все файлы проекта
COPY --exclude=deployment . .

# Отключаем телеметрию Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Собираем Next.js приложение
RUN yarn build



# Этап 3: Финальный образ для запуска
FROM node:22-alpine3.22 AS runner

WORKDIR /app

# Установка необходимых инструментов для запуска (better-sqlite3 требует нативные либы)
RUN apk add --no-cache libstdc++ sqlite && \ 
    addgroup --system --gid 1001 nodejs && \ 
# Создаем пользователя nextjs
    adduser --system --uid 1001 nextjs && \
# Создаем директорию для БД с правильными правами
    mkdir -p /app/data && chown nextjs:nodejs /app/data

# Копируем только необходимые файлы для production
# Standalone уже содержит минимальный набор зависимостей
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Копируем скрипты для инициализации БД
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib

# Переключаемся на непривилегированного пользователя
USER nextjs

EXPOSE 3003

ENV PORT=3003
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# Запуск приложения
CMD ["node", "server.js"]
