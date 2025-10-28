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
        const userId = searchParams.get('userId') || session.user.id;

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

        console.log('Statistics request:', { period, userId, startDate, endDate });

        // Получаем пользователя со ставками
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            include: { rates: true },
        });

        const timeTracks = await prisma.timeTrack.findMany({
            where: {
                user_id: parseInt(userId),
                date: {
                    gte: startDate,
                    lt: endDate,
                },
            },
        });

        console.log('Found time tracks:', timeTracks.length, timeTracks);

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
            const trackRate = getUserRateForDate(user?.rates || [], new Date(track.date)) ?? 0;
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
