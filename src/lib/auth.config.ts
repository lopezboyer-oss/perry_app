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
        token.isSafetyAuditor = (user as any).isSafetyAuditor || false;
        token.accessManPower = (user as any).accessManPower || false;
        token.accessSafetyDedicado = (user as any).accessSafetyDedicado || false;
        token.accessVehicles = (user as any).accessVehicles || false;
        token.accessDrivers = (user as any).accessDrivers || false;
        token.accessElevationEquip = (user as any).accessElevationEquip || false;
      }

      // Re-fetch role from DB on every request to guarantee
      // that role changes (e.g. SUPERVISOR → ADMIN) take effect immediately
      if (token.id && process.env.NEXT_RUNTIME !== 'edge') {
        try {
          const { prisma } = await import('./prisma');
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              role: true,
              name: true,
              baseCompanyId: true,
              isSafetyAuditor: true,
              accessSafetyDedicado: true,
              accessVehicles: true,
              accessDrivers: true,
              accessElevationEquip: true,
              accessManPower: true,
              companies: {
                select: {
                  companyId: true,
                  isDefault: true,
                },
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
            token.isSafetyAuditor = freshUser.isSafetyAuditor || false;
            token.accessSafetyDedicado = freshUser.accessSafetyDedicado || false;
            token.accessVehicles = freshUser.accessVehicles || false;
            token.accessDrivers = freshUser.accessDrivers || false;
            token.accessElevationEquip = freshUser.accessElevationEquip || false;
            token.accessManPower = freshUser.accessManPower || false;

            // Fetch isCruzVerde if role is TECNICO
            if (freshUser.role === 'TECNICO') {
              const tech = await prisma.technician.findFirst({
                where: { linkedUserId: token.id as string },
                select: { isCruzVerde: true },
              });
              token.isCruzVerde = tech?.isCruzVerde || false;
            } else {
              token.isCruzVerde = false;
            }
          }
        } catch (e) {
          // If DB is unreachable, keep the cached values
          console.error('JWT refresh error:', e);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string || 'INGENIERO';
        (session.user as any).baseCompanyId = token.baseCompanyId || null;
        (session.user as any).companyIds = token.companyIds || [];
        (session.user as any).defaultCompanyId = token.defaultCompanyId || null;
        (session.user as any).isSafetyAuditor = token.isSafetyAuditor || false;
        (session.user as any).accessSafetyDedicado = token.accessSafetyDedicado || false;
        (session.user as any).accessVehicles = token.accessVehicles || false;
        (session.user as any).accessDrivers = token.accessDrivers || false;
        (session.user as any).accessElevationEquip = token.accessElevationEquip || false;
        (session.user as any).accessManPower = token.accessManPower || false;
        (session.user as any).isCruzVerde = token.isCruzVerde || false;
      }
      return session;
    },
  },
  providers: [], // Los providers pesados se inyectan en auth.ts
} satisfies NextAuthConfig;

