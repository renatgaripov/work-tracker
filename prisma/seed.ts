import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

async function createUser(
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

async function main() {
  try {
    // Проверяем, есть ли уже пользователи
    const existingUsers = await prisma.user.count();

    if (existingUsers > 0) {
        console.log('Пользователи уже существуют, пропускаем создание');
        await prisma.$disconnect();
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
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Ошибка при создании пользователей:', error)
    await prisma.$disconnect();
    process.exit(1)
  }
}

main()
