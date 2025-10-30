import { NextResponse } from 'next/server';
// @ts-expect-error: тадо
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = parseInt(session.user.id);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                rates: {
                    orderBy: { valid_from: 'desc' },
                },
                _count: {
                    select: { time_tracks: true },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            id: user.id,
            login: user.login,
            name: user.name,
            position: user.position,
            role: user.role,
            created_at: user.created_at,
            rates: user.rates,
            timeTracksCount: user._count.time_tracks,
        });
    } catch (error) {
        console.error('Error fetching current user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
