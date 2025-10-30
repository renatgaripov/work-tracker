import { NextRequest, NextResponse } from 'next/server';
// @ts-expect-error: тадо
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma, getUserRateForDate } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'today';
        const userId = searchParams.get('userId');
        const isAllStaff = !userId || userId === 'null';

        const now = new Date();
        let startDate: Date;
        let endDate: Date = new Date();

        // Проверяем, переданы ли конкретные даты
        const customStartDate = searchParams.get('startDate');
        const customEndDate = searchParams.get('endDate');

        if (customStartDate && customEndDate) {
            startDate = new Date(customStartDate);
            endDate = new Date(customEndDate);
        } else {
            switch (period) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 1);
                    break;
                case 'week':
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - now.getDay());
                    startOfWeek.setHours(0, 0, 0, 0);
                    startDate = startOfWeek;
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 7);
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 1);
            }
        }

        console.log('Statistics request:', { period, userId, isAllStaff, startDate, endDate });

        // Получаем пользователя со ставками (только если не все сотрудники)
        let user = null;
        if (!isAllStaff) {
            user = await prisma.user.findUnique({
                where: { id: parseInt(userId || session.user.id) },
                include: { rates: true },
            });
        }

        const whereClause: {
            date: { gte: Date; lt: Date };
            user_id?: number | { in: number[] };
        } = {
            date: {
                gte: startDate,
                lt: endDate,
            },
        };

        if (!isAllStaff) {
            whereClause.user_id = parseInt(userId || session.user.id);
        } else {
            // Для всех сотрудников получаем ID всех пользователей с ролью 'user'
            const usersWithRoleUser = await prisma.user.findMany({
                where: { role: 'user' },
                select: { id: true },
            });
            const userIds = usersWithRoleUser.map((u) => u.id);
            whereClause.user_id = { in: userIds };
        }

        const timeTracks = await prisma.timeTrack.findMany({
            where: whereClause,
            include: {
                user: isAllStaff
                    ? {
                          include: {
                              rates: true,
                          },
                      }
                    : false,
            },
        });

        console.log('Found time tracks:', timeTracks.length);

        const currentRate = getUserRateForDate(user?.rates || []);
        console.log('User rate:', currentRate);

        const totalMinutes = timeTracks.reduce((sum, track) => sum + track.time, 0);
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;

        const paidMinutes = timeTracks.filter((track) => track.was_paid).reduce((sum, track) => sum + track.time, 0);

        const unpaidMinutes = timeTracks.filter((track) => !track.was_paid).reduce((sum, track) => sum + track.time, 0);

        // Подсчитываем уникальные дни с треками
        const uniqueDays = new Set(timeTracks.map((track) => track.date.toISOString().split('T')[0])).size;

        // Рассчитываем суммы в рублях с учетом ставки на дату каждой записи
        let totalEarnings = 0;
        let paidEarnings = 0;
        let unpaidEarnings = 0;

        for (const track of timeTracks) {
            let trackRate = 0;

            if (isAllStaff && track.user && 'rates' in track.user && track.user.rates) {
                // Для режима "все сотрудники" берем ставку каждого пользователя на дату записи
                const rates = track.user.rates as { id: number; rate: number; valid_from: Date }[];
                trackRate = getUserRateForDate(rates, new Date(track.date)) ?? 0;
            } else if (!isAllStaff && user) {
                // Для одного пользователя берем его ставку
                trackRate = getUserRateForDate(user.rates || [], new Date(track.date)) ?? 0;
            }

            const trackEarnings = trackRate > 0 ? (track.time / 60) * trackRate : 0;
            totalEarnings += trackEarnings;

            if (track.was_paid) {
                paidEarnings += trackEarnings;
            } else {
                unpaidEarnings += trackEarnings;
            }
        }

        const rate = currentRate ?? 0;

        const stats = {
            totalMinutes,
            totalHours,
            remainingMinutes,
            totalTracks: timeTracks.length,
            paidMinutes,
            unpaidMinutes,
            uniqueDays,
            totalEarnings,
            paidEarnings,
            unpaidEarnings,
            userRate: rate,
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching statistics:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
