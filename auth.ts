import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { db } from '@/lib/db';
import { users, workspaceMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authConfig } from './auth.config';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ profile }) {
      const email = profile?.email;
      if (!email) return false;

      const [member] = await db
        .select({ permission: workspaceMembers.permission })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.email, email));

      const isAllowed =
        ADMIN_EMAILS.includes(email) ||
        !!member;

      if (!isAllowed) return '/login?error=unauthorized';

      const isAdmin = ADMIN_EMAILS.includes(email);
      const permission = isAdmin ? 'admin' : (member?.permission ?? 'view');
      const id = `user-${profile.sub}`;

      await db
        .insert(users)
        .values({
          id,
          googleId: profile.sub as string,
          email,
          name: (profile.name as string) ?? email,
          picture: (profile.picture as string) ?? null,
          permission,
        })
        .onConflictDoUpdate({
          target: users.googleId,
          set: {
            name: (profile.name as string) ?? email,
            picture: (profile.picture as string) ?? null,
            permission,
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
