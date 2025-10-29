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
