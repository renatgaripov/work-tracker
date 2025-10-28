import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}

export async function createUser(
    login: string,
    password: string,
    name: string,
    position: string,
    role: string = 'user',
) {
    const hashedPassword = await hashPassword(password);

    return prisma.user.create({
        data: {
            login,
            password: hashedPassword,
            name,
            position,
            role,
        },
    });
}

export async function findUserByLogin(login: string) {
    return prisma.user.findUnique({
        where: { login },
    });
}

export async function seedUsers() {
    // Проверяем, есть ли уже пользователи
    const existingUsers = await prisma.user.count();

    if (existingUsers > 0) {
        console.log('Пользователи уже существуют, пропускаем создание');
        return;
    }

    // Создаем админа
    await createUser('admin', 'admin', 'Администратор', 'Администратор системы', 'admin');

    // Создаем модератора
    await createUser('moderator', 'moderator', 'Модератор', 'Модератор системы', 'moderator');

    // Создаем разработчика
    await createUser('user', 'user', 'Пользователь', 'Разработчик', 'user');

    console.log('Тестовые пользователи созданы:');
    console.log('- admin / admin (администратор)');
    console.log('- moderator / moderator (модератор)');
    console.log('- user / user (разработчик)');
}
