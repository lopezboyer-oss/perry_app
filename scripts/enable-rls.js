const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Comprobando tablas en el esquema public de Supabase ---');
  
  // 1. Obtener todas las tablas del esquema public
  const tables = await prisma.$queryRaw`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename ASC;
  `;

  console.log(`Total de tablas encontradas: ${tables.length}`);
  
  const withoutRLS = tables.filter(t => !t.rowsecurity);
  console.log(`Tablas con RLS desactivado: ${withoutRLS.length}`);

  if (withoutRLS.length === 0) {
    console.log('✅ Todas las tablas ya tienen RLS activado.');
    return;
  }

  console.log('\n--- Activando Row-Level Security (RLS) en todas las tablas ---');
  for (const t of withoutRLS) {
    process.stdout.write(`Activando RLS en "${t.tablename}"... `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."${t.tablename}" ENABLE ROW LEVEL SECURITY;`);
    console.log('OK');
  }

  // 2. Verificar estado final
  const verified = await prisma.$queryRaw`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename ASC;
  `;

  const stillDisabled = verified.filter(t => !t.rowsecurity);
  if (stillDisabled.length === 0) {
    console.log('\n🎉 ¡Listo! Todas las tablas (' + verified.length + ') tienen RLS activado con éxito.');
  } else {
    console.log('\n⚠️ Atención: Aún hay tablas sin RLS:', stillDisabled);
  }
}

main()
  .catch((err) => {
    console.error('Error durante la ejecución:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
