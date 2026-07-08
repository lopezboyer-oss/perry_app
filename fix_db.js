const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  try {
    const password = 'admin123'
    const passwordHash = await bcrypt.hash(password, 10)

    // Insert admin@perryapp.com if it doesn't exist
    await prisma.user.upsert({
      where: { email: 'admin@perryapp.com' },
      update: { passwordHash, passwordPlaintext: password },
      create: {
        id: 'cmntxn14w000023m6r4zgjbym', // dummy id
        name: 'Administrador (Recovery)',
        email: 'admin@perryapp.com',
        passwordHash,
        passwordPlaintext: password,
        role: 'ADMIN',
        isActive: true,
      }
    })
    console.log('✅ Creado usuario de recuperación admin@perryapp.com (clave: admin123)')

    // Reset lopezboyer@gmail.com
    await prisma.user.update({
      where: { email: 'lopezboyer@gmail.com' },
      data: { passwordHash, passwordPlaintext: password }
    })
    console.log('✅ Restablecida la clave de lopezboyer@gmail.com a: admin123')

  } catch (e) {
    console.error('DB Error:', e)
  }
}
main().finally(() => prisma.$disconnect())
