# syntax=docker.io/docker/dockerfile:1.7-labs

# Этап 1: Установка зависимостей
FROM node:22-alpine3.22 AS deps

# Установка необходимых инструментов для сборки нативных модулей
RUN apk add --no-cache make gcc g++ python3 libstdc++

WORKDIR /app

# Копируем зависимости и Prisma-схему
COPY package.json yarn.lock ./
COPY prisma ./prisma

# Устанавливаем все зависимости (включая devDependencies для сборки)
RUN yarn install

# Генерация Prisma клиентских файлов
RUN npx prisma generate


# Этап 2: Сборка приложения
FROM node:22-alpine3.22 AS builder

# Установка необходимых инструментов для сборки нативных модулей
RUN apk add --no-cache make gcc g++ python3 libstdc++

WORKDIR /app

# Копируем node_modules из предыдущего этапа
COPY --from=deps /app/node_modules ./node_modules

# Копируем все файлы проекта (кроме исключенных через .dockerignore)
COPY . .

# Отключаем телеметрию Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Генерация Prisma клиента (так как скопировали исходники)
RUN npx prisma generate

# Собираем Next.js приложение
RUN yarn build



# Этап 3: Финальный образ для запуска
FROM node:22-alpine3.22 AS runner

WORKDIR /app

# Установка необходимых инструментов для запуска
RUN apk add --no-cache libstdc++ sqlite && \ 
    addgroup --system --gid 1001 nodejs && \ 
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/data && chown nextjs:nodejs /app/data

# Копируем standalone сборку Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Копируем Prisma схему и сгенерированный клиент
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Переключаемся на непривилегированного пользователя
RUN useradd --uid 9999 app
USER app

EXPOSE 3003

ENV PORT=3003
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/dev.db"

# Запуск приложения
CMD ["node", "server.js"]
