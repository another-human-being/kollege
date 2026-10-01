// Auth.js (§3). Stage 2: session + dev login; magic link by mail follows later.
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { devAuthorize } from '@/lib/auth/dev';

const providers =
  process.env.NODE_ENV === 'development'
    ? [
        Credentials({
          id: 'dev',
          name: 'Dev-Login (nur Entwicklung)',
          credentials: { email: { label: 'Adresse', type: 'email' } },
          authorize: (c) => devAuthorize(c?.email),
        }),
      ]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === 'string') session.user.id = token.uid;
      return session;
    },
  },
});

/** the logged-in team member – every DB access of the app runs as this user (withUser) */
export async function currentUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error('not signed in');
  return id;
}
