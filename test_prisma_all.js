const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const users = await prisma.user.findMany({ select: { email: true, name: true, role: true } })
    console.log('Users in DB:')
    console.log(users.map(u => `${u.name} | ${u.email} | ${u.role}`).join('\n'))
  } catch (e) {
    console.error('DB Error:', e)
  }
}
main().finally(() => prisma.$disconnect())
