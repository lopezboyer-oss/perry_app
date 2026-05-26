import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findUsers() {
  console.log('Searching for users named or emailed with Ivan, Carlos, lopezboyer, sevilla:');
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Ivan', mode: 'insensitive' } },
        { name: { contains: 'Carlos', mode: 'insensitive' } },
        { email: { contains: 'lopezboyer', mode: 'insensitive' } },
        { email: { contains: 'sevilla', mode: 'insensitive' } },
      ]
    },
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

findUsers()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
