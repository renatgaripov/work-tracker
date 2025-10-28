import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Получает актуальную ставку пользователя на указанную дату
 * @param rates - массив ставок пользователя
 * @param targetDate - дата, на которую нужна ставка (по умолчанию текущая)
 * @returns Актуальная ставка или null
 */
export function getUserRateForDate(
    rates: { rate: number; valid_from: Date }[],
    targetDate: Date = new Date(),
): number | null {
    if (!rates || rates.length === 0) {
        return null;
    }

    // Сортируем ставки по дате начала действия (от более поздних к более ранним)
    const sortedRates = [...rates].sort((a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime());

    // Находим первую ставку, которая действует на указанную дату или раньше
    for (const rate of sortedRates) {
        if (new Date(rate.valid_from) <= targetDate) {
            return rate.rate;
        }
    }

    return null;
}
