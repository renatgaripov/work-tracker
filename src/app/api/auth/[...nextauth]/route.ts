import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// @ts-expect-error: тадо
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
