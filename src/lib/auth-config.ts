import CredentialsProvider from 'next-auth/providers/credentials';
import { findUserByLogin, verifyPassword } from '@/lib/auth';

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                login: { label: 'Логин', type: 'text' },
                password: { label: 'Пароль', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.login || !credentials?.password) {
                    return null;
                }

                const user = await findUserByLogin(credentials.login);

                if (!user) {
                    return null;
                }

                const isValidPassword = await verifyPassword(credentials.password, user.password);

                if (!isValidPassword) {
                    return null;
                }

                return {
                    id: user.id.toString(),
                    login: user.login,
                    name: user.name,
                    position: user.position,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async jwt({ token, user }: { token: any; user?: any }) {
            if (user) {
                token.login = user.login;
                token.position = user.position;
                token.role = user.role;
            }
            return token;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async session({ session, token }: { session: any; token: any }) {
            if (token) {
                session.user.id = token.sub!;
                session.user.login = token.login as string;
                session.user.position = token.position as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt' as const,
    },
};
