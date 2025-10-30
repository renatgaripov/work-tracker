import { NextRequest, NextResponse } from 'next/server';
// @ts-expect-error: тадо
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma, getUserRateForDate } from '@/lib/prisma';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        // Проверка прав при явном запросе конкретного пользователя
        if (
            userId &&
            session.user.role !== 'admin' &&
            session.user.role !== 'moderator' &&
            parseInt(userId) !== parseInt(session.user.id)
        ) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Определяем целевые пользователи
        let targetUserIds: number[] = [];
        if (userId) {
            targetUserIds = [parseInt(userId)];
        } else if (session.user.role === 'admin' || session.user.role === 'moderator') {
            // По умолчанию для админа/руководителя — все сотрудники (role = 'user')
            const employees = await prisma.user.findMany({
                where: { role: 'user' },
                select: { id: true },
            });
            targetUserIds = employees.map((u) => u.id);
        } else {
            targetUserIds = [parseInt(session.user.id)];
        }

        // Карта ставок по пользователям (для корректного вычисления ставок на дату записи)
        const usersWithRates = await prisma.user.findMany({
            where: { id: { in: targetUserIds } },
            include: { rates: true },
        });
        const userIdToRates = new Map<number, (typeof usersWithRates)[number]['rates']>();
        usersWithRates.forEach((u) => userIdToRates.set(u.id, u.rates));

        // Получаем данные за последние 12 месяцев
        const now = new Date();
        const startDate = subMonths(now, 12);
        const months = eachMonthOfInterval({ start: startDate, end: now });

        const monthlyStats = [];

        for (const month of months) {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);
            const monthKey = format(month, 'yyyy-MM');

            // Получаем все треки за месяц по целевым пользователям
            const timeTracks = await prisma.timeTrack.findMany({
                where: {
                    user_id: { in: targetUserIds },
                    date: {
                        gte: monthStart,
                        lt: monthEnd,
                    },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            position: true,
                        },
                    },
                },
                orderBy: { date: 'desc' },
            });

            // Группируем данные по пользователям
            const users: {
                [userId: string]: {
                    name: string;
                    position: string;
                    totalMinutes: number;
                    paidMinutes: number;
                    unpaidMinutes: number;
                    totalEarnings: number;
                    paidEarnings: number;
                    unpaidEarnings: number;
                    rate: number;
                    tracks: typeof timeTracks;
                };
            } = {};
            let totalMinutes = 0;
            let paidMinutes = 0;
            let unpaidMinutes = 0;
            const totalTracks = timeTracks.length;
            let paidTracks = 0;
            let totalEarnings = 0;
            let paidEarnings = 0;
            let unpaidEarnings = 0;

            timeTracks.forEach((track) => {
                const uid = track.user_id.toString();
                if (!users[uid]) {
                    const baseRate = getUserRateForDate(userIdToRates.get(track.user_id) || []) ?? 0;
                    users[uid] = {
                        name: track.user.name,
                        position: track.user.position,
                        totalMinutes: 0,
                        paidMinutes: 0,
                        unpaidMinutes: 0,
                        totalEarnings: 0,
                        paidEarnings: 0,
                        unpaidEarnings: 0,
                        rate: baseRate,
                        tracks: [],
                    };
                }

                const trackRate = getUserRateForDate(userIdToRates.get(track.user_id) || [], new Date(track.date)) ?? 0;
                const trackEarnings = trackRate > 0 ? (track.time / 60) * trackRate : 0;

                const trackWithRate = track as typeof track & { rate: number };
                trackWithRate.rate = trackRate;

                users[uid].totalMinutes += track.time;
                users[uid].totalEarnings += trackEarnings;
                users[uid].tracks.push(trackWithRate);

                if (track.was_paid) {
                    users[uid].paidMinutes += track.time;
                    users[uid].paidEarnings += trackEarnings;
                    paidMinutes += track.time;
                    paidEarnings += trackEarnings;
                    paidTracks++;
                } else {
                    users[uid].unpaidMinutes += track.time;
                    users[uid].unpaidEarnings += trackEarnings;
                    unpaidMinutes += track.time;
                    unpaidEarnings += trackEarnings;
                }

                totalMinutes += track.time;
                totalEarnings += trackEarnings;
            });

            monthlyStats.push({
                month: monthKey,
                totalMinutes,
                paidMinutes,
                unpaidMinutes,
                totalTracks,
                paidTracks,
                totalEarnings,
                paidEarnings,
                unpaidEarnings,
                users,
            });
        }

        return NextResponse.json(monthlyStats.reverse()); // Сортируем от старых к новым
    } catch (error) {
        console.error('Error fetching monthly statistics:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
