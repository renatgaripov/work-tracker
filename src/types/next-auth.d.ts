declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            login: string;
            name: string;
            position: string;
            role: string;
        };
    }

    interface User {
        id: string;
        login: string;
        name: string;
        position: string;
        role: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        login: string;
        position: string;
        role: string;
    }
}
