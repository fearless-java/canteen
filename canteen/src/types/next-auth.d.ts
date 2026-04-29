import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      avatar?: string;
      role: 'student' | 'merchant';
    };
  }

  interface User {
    role: 'student' | 'merchant';
    id: string;
    avatar?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'student' | 'merchant';
    id?: string;
  }
}
