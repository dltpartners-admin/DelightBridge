import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);
const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN ?? 'delightroom.com';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email;
      if (!email) return false;

      const isAllowed =
        ADMIN_EMAILS.includes(email) ||
        email.endsWith(`@${ALLOWED_DOMAIN}`);

      if (!isAllowed) return '/login?error=unauthorized';

      const isAdmin = ADMIN_EMAILS.includes(email);
      const id = `user-${profile.sub}`;

      await db
        .insert(users)
        .values({
          id,
          googleId: profile.sub as string,
          email,
          name: (profile.name as string) ?? email,
          picture: (profile.picture as string) ?? null,
          permission: isAdmin ? 'admin' : 'view',
        })
        .onConflictDoUpdate({
          target: users.googleId,
          set: {
            name: (profile.name as string) ?? email,
            picture: (profile.picture as string) ?? null,
          },
        });

      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.googleId, token.sub));
        if (user) {
          session.user.id = user.id;
          (session.user as typeof session.user & { permission: string }).permission = user.permission;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});
