import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { getAuthUser, upsertAuthUser } from './repositories';

const providers = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
  (() => {
    const githubClientId = process.env.GITHUB_ID;
    const githubClientSecret = process.env.GITHUB_SECRET;

    return githubClientId && githubClientSecret
      ? GitHubProvider({
          clientId: githubClientId,
          clientSecret: githubClientSecret,
        })
      : null;
  })(),
].filter(Boolean) as NonNullable<NextAuthOptions['providers']>[number][];

export const authOptions: NextAuthOptions = {
  providers,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email) {
        return false;
      }

      const adminEmail = process.env.ADMIN?.toLowerCase();
      await upsertAuthUser({
        email: user.email,
        name: user.name,
        image: user.image,
        provider: account?.provider ?? null,
        role: user.email.toLowerCase() === adminEmail ? 'admin' : 'user',
      });

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.provider = account?.provider;
        token.role = user.email?.toLowerCase() === process.env.ADMIN?.toLowerCase() ? 'admin' : 'user';
      }

      if (token.email) {
        try {
          const full = await getAuthUser(token.email as string);
          if (full?._id) {
            token.sub = full._id.toString();
          }
        } catch (e) {
          // keep existing token fields if the lookup fails
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string | undefined;
        session.user.email = token.email as string;
        session.user.image = token.picture as string;
        session.user.role = (token.role as 'admin' | 'user') || 'user';
        session.user.provider = token.provider as string | undefined;
        try {
          const full = await getAuthUser(token.email as string);
          if (full) {
            session.user.name = full.name;
            session.user.onboardingComplete = !!full.onboardingComplete;
            session.user.selectedJournals = full.selectedJournals ?? [];
          } else {
            session.user.name = token.name as string;
          }
        } catch (e) {
          session.user.name = token.name as string;
        }
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
