import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma, getUserRateForDate } from '@/lib/prisma';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const requestedUserId = searchParams.get('userId');

        // Проверяем права доступа: если запрашивается другой пользователь, нужна роль admin или moderator
        if (requestedUserId && parseInt(requestedUserId) !== parseInt(session.user.id)) {
            if (session.user.role !== 'admin' && session.user.role !== 'moderator') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const userId = requestedUserId || session.user.id;

        // Получаем пользователя со ставками
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            include: { rates: true },
        });

        // Получаем данные за последние 12 месяцев
        const monthlyData = [];
        const now = new Date();

        for (let i = 11; i >= 0; i--) {
            const monthDate = subMonths(now, i);
            const monthStart = startOfMonth(monthDate);
            const monthEnd = endOfMonth(monthDate);

            // Получаем записи времени за месяц
            const timeTracks = await prisma.timeTrack.findMany({
                where: {
                    user_id: parseInt(userId),
                    date: {
                        gte: monthStart,
                        lt: monthEnd,
                    },
                },
            });

            // Рассчитываем заработок
            const totalMinutes = timeTracks.reduce((sum, track) => sum + track.time, 0);
            const totalHours = totalMinutes / 60;

            // Считаем заработок с учетом ставки на дату каждой записи
            let earnings = 0;
            for (const track of timeTracks) {
                const trackRate = getUserRateForDate(user?.rates || [], new Date(track.date)) ?? 0;
                earnings += (track.time / 60) * trackRate;
            }

            monthlyData.push({
                month: format(monthDate, 'yyyy-MM'),
                earnings: Math.round(earnings),
                hours: Math.round(totalHours * 100) / 100, // Округляем до 2 знаков
            });
        }

        return NextResponse.json(monthlyData);
    } catch (error) {
        console.error('Error fetching monthly earnings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
