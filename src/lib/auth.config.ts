import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }

      // Re-fetch role from DB on every request to guarantee
      // that role changes (e.g. SUPERVISOR → ADMIN) take effect immediately
      if (token.id) {
        try {
          const { prisma } = await import('./prisma');
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              role: true, name: true, baseCompanyId: true,
              companies: {
                select: { companyId: true, isDefault: true },
                include: { company: { select: { name: true, shortName: true, odooId: true, color: true } } },
              },
            },
          });
          if (freshUser) {
            token.role = freshUser.role;
            token.name = freshUser.name;
            token.baseCompanyId = freshUser.baseCompanyId;
            token.companyIds = freshUser.companies.map(c => c.companyId);
            token.defaultCompanyId = freshUser.companies.find(c => c.isDefault)?.companyId
                                     || freshUser.baseCompanyId;
          }
        } catch {
          // If DB is unreachable, keep the cached values
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  providers: [], // Los providers pesados se inyectan en auth.ts
} satisfies NextAuthConfig;

