import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  console.log('--- User list in database ---');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      companies: {
        select: {
          company: {
            select: {
              name: true
            }
          },
          isDefault: true
        }
      }
    }
  });
  console.log(JSON.stringify(users, null, 2));
}

listUsers()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
