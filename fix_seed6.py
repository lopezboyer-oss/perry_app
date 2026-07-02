import re
with open('prisma/seed.ts', 'r') as f:
    c = f.read()

# Remove the whole "Crear Oportunidades" section and everything below it
idx = c.find('// 5. Crear Oportunidades (ahora Actividades)')
if idx == -1:
    idx = c.find('// 5. Crear Oportunidades')

if idx != -1:
    c = c[:idx] + "  console.log('Seed terminado');\n}\n\nmain()\n  .catch((e) => {\n    console.error(e);\n    process.exit(1);\n  })\n  .finally(async () => {\n    await prisma.$disconnect();\n  });\n"
    with open('prisma/seed.ts', 'w') as f:
        f.write(c)
