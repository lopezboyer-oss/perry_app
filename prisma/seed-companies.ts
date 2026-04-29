// Seed script for multi-company setup
// Run with: npx tsx prisma/seed-companies.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const companies = [
  { name: 'GRUPO CASEME',  shortName: 'GC', odooId: 1, folioPrefix: 'S',  folioFormat: 'S#####', color: '#4F46E5', sortOrder: 1 },
  { name: 'DROBOTS',       shortName: 'DR', odooId: 2, folioPrefix: 'S',  folioFormat: 'S#####', color: '#0EA5E9', sortOrder: 2 },
  { name: 'VULCAN FORGE',  shortName: 'VF', odooId: 3, folioPrefix: 'V',  folioFormat: 'V###',   color: '#EF4444', sortOrder: 3 },
  { name: 'SAINPRO',       shortName: 'SP', odooId: 4, folioPrefix: 'SA', folioFormat: 'SA###',  color: '#F59E0B', sortOrder: 4 },
  { name: 'OPUS INGENIUM', shortName: 'OI', odooId: 5, folioPrefix: 'OS', folioFormat: 'OS###',  color: '#10B981', sortOrder: 5 },
];

async function main() {
  console.log('🏢 Seeding companies...');
  
  for (const c of companies) {
    const existing = await prisma.company.findUnique({ where: { odooId: c.odooId } });
    if (existing) {
      console.log(`  ✓ ${c.name} already exists`);
      continue;
    }
    await prisma.company.create({ data: c });
    console.log(`  + Created ${c.name} (Odoo ID: ${c.odooId})`);
  }

  // Get Grupo Caseme ID for migration
  const gc = await prisma.company.findUnique({ where: { odooId: 1 } });
  if (!gc) throw new Error('Grupo Caseme not found after seeding');

  // Migrate all existing activities → Grupo Caseme
  const actResult = await prisma.activity.updateMany({
    where: { companyId: null },
    data: { companyId: gc.id },
  });
  console.log(`📋 Migrated ${actResult.count} activities → GRUPO CASEME`);

  // Migrate all resources → baseCompanyId = Grupo Caseme
  const userResult = await prisma.user.updateMany({ where: { baseCompanyId: null }, data: { baseCompanyId: gc.id } });
  console.log(`👤 Set baseCompanyId for ${userResult.count} users → GRUPO CASEME`);
  
  const techResult = await prisma.technician.updateMany({ where: { baseCompanyId: null }, data: { baseCompanyId: gc.id } });
  console.log(`🔧 Set baseCompanyId for ${techResult.count} technicians → GRUPO CASEME`);
  
  const safetyResult = await prisma.safetyDedicado.updateMany({ where: { baseCompanyId: null }, data: { baseCompanyId: gc.id } });
  console.log(`🛡️  Set baseCompanyId for ${safetyResult.count} safety dedicados → GRUPO CASEME`);
  
  const vehicleResult = await prisma.vehicle.updateMany({ where: { baseCompanyId: null }, data: { baseCompanyId: gc.id } });
  console.log(`🚗 Set baseCompanyId for ${vehicleResult.count} vehicles → GRUPO CASEME`);
  
  const driverResult = await prisma.driver.updateMany({ where: { baseCompanyId: null }, data: { baseCompanyId: gc.id } });
  console.log(`🚙 Set baseCompanyId for ${driverResult.count} drivers → GRUPO CASEME`);

  // Create UserCompany entries for all existing users
  const users = await prisma.user.findMany({ select: { id: true, role: true } });
  let ucCreated = 0;
  for (const u of users) {
    const existing = await prisma.userCompany.findUnique({
      where: { userId_companyId: { userId: u.id, companyId: gc.id } },
    });
    if (!existing) {
      await prisma.userCompany.create({
        data: { userId: u.id, companyId: gc.id, isDefault: true },
      });
      ucCreated++;
    }
    // ADMIN gets access to ALL companies
    if (u.role === 'ADMIN') {
      const allCompanies = await prisma.company.findMany({ select: { id: true } });
      for (const comp of allCompanies) {
        if (comp.id === gc.id) continue; // already created above
        const exists = await prisma.userCompany.findUnique({
          where: { userId_companyId: { userId: u.id, companyId: comp.id } },
        });
        if (!exists) {
          await prisma.userCompany.create({
            data: { userId: u.id, companyId: comp.id, isDefault: false },
          });
          ucCreated++;
        }
      }
    }
  }
  console.log(`🔑 Created ${ucCreated} UserCompany access entries`);

  console.log('\n✅ Multi-company seed complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
