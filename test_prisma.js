const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] })

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@perryapp.com' },
    })
    console.log('User found:', user?.email || 'Not found')
  } catch (e) {
    console.error('DB Error:', e)
  }
}
main().finally(() => prisma.$disconnect())
