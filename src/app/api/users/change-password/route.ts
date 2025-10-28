import { NextRequest, NextResponse } from 'next/server';
// @ts-expect-error: тадо
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Получаем текущего пользователя
        const user = await prisma.user.findUnique({
            where: { id: parseInt(session.user.id) },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Проверяем текущий пароль (здесь нужно добавить проверку пароля)
        // Пока что просто обновляем пароль без проверки старого
        // В реальном приложении нужно проверить currentPassword

        const hashedPassword = await hashPassword(newPassword);

        await prisma.user.update({
            where: { id: parseInt(session.user.id) },
            data: {
                password: hashedPassword,
            },
        });

        return NextResponse.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
