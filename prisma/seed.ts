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
    // Проверяем, есть ли уже сотрудники
    const existingUsers = await prisma.user.count();

    if (existingUsers > 0) {
        console.log('Сотрудники уже существуют, пропускаем создание');
        await prisma.$disconnect();
        return;
    }

    // Создаем админа
    await createUser('admin', 'admin', 'Администратор', 'Администратор системы', 'admin');

    // Создаем руководителя
    await createUser('moderator', 'moderator', 'Руководитель', 'Руководитель системы', 'moderator');

    // Создаем разработчика
    await createUser('user', 'user', 'Сотрудник', 'Разработчик', 'user');

    console.log('Тестовые сотрудники созданы:');
    console.log('- admin / admin (администратор)');
    console.log('- moderator / moderator (руководитель)');
    console.log('- user / user (разработчик)');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Ошибка при создании сотрудников:', error)
    await prisma.$disconnect();
    process.exit(1)
  }
}

main()
