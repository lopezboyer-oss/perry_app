const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const user = await prisma.user.findUnique({ where: { email: 'admin@perryapp.com' } })
    if (user) {
      await prisma.user.delete({ where: { email: 'admin@perryapp.com' } })
      console.log('✅ Usuario admin@perryapp.com eliminado exitosamente de la base de datos.')
    } else {
      console.log('ℹ️ El usuario admin@perryapp.com ya no existe en la base de datos.')
    }
  } catch (e) {
    console.error('Error al intentar eliminar el usuario:', e)
  }
}
main().finally(() => prisma.$disconnect())
