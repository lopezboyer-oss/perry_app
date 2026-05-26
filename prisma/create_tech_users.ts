import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

// Deterministic digits generation based on email
function getDeterministicDigits(email: string): string {
  let hash = 0;
  const cleanEmail = email.toLowerCase().trim();
  for (let i = 0; i < cleanEmail.length; i++) {
    hash = cleanEmail.charCodeAt(i) + ((hash << 5) - hash);
  }
  return String((Math.abs(hash) % 9000) + 1000); // 1000 to 9999
}

// Generate password matching: Firstname + 4 deterministic digits
function getDeterministicPassword(name: string, email: string): string {
  const firstName = name.trim().split(/\s+/)[0] || 'User';
  const normalizedName = firstName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove accents
  const capitalizedName = normalizedName.charAt(0).toUpperCase() + normalizedName.slice(1).toLowerCase();
  
  const digits = getDeterministicDigits(email);
  return `${capitalizedName}${digits}`;
}

// Generate base email prefix
function getBaseEmail(name: string): string {
  const clean = name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, '') // remove special chars
    .trim()
    .split(/\s+/);
  
  const first = clean[0] || 'user';
  const last = clean[1] || 'tech';
  return `${first}.${last}`;
}

async function main() {
  console.log('🚀 Iniciando script de creación de cuentas para técnicos...');

  // 1. Fetch GRUPO CASEME and DROBOTS companies for default assignment
  const companies = await prisma.company.findMany();
  const casemeCompany = companies.find(c => c.name.includes('CASEME')) || companies[0];
  if (!casemeCompany) {
    throw new Error('No se encontró ninguna empresa en la base de datos.');
  }

  // 2. Fetch all technicians
  const technicians = await prisma.technician.findMany({
    where: { isActive: true },
  });
  console.log(`Encontrados ${technicians.length} técnicos activos.`);

  const reportData: any[] = [];
  let createdCount = 0;
  let skippedCount = 0;

  for (const tech of technicians) {
    // Check if tech already has a linked user
    if (tech.linkedUserId) {
      // Fetch the existing user to add to excel report
      const existingUser = await prisma.user.findUnique({
        where: { id: tech.linkedUserId },
      });
      if (existingUser) {
        const pass = getDeterministicPassword(tech.name, existingUser.email);
        reportData.push({
          'ID Técnico': tech.id,
          'Nombre': tech.name,
          'Tipo': tech.type,
          'Celular': tech.phone || 'N/A',
          'Email (Usuario)': existingUser.email,
          'Clave Temporal': pass,
          'Estado': 'Ya existía cuenta (Vinculada)',
        });
        skippedCount++;
        continue;
      }
    }

    // Generate unique email
    let emailIndex = 0;
    const baseEmailPrefix = getBaseEmail(tech.name);
    let email = `${baseEmailPrefix}@perryapp.com`;
    let userExists = true;

    // Resolve email collisions
    while (userExists) {
      const existing = await prisma.user.findUnique({
        where: { email },
      });
      if (existing) {
        emailIndex++;
        email = `${baseEmailPrefix}${emailIndex}@perryapp.com`;
      } else {
        userExists = false;
      }
    }

    // Generate deterministic password
    const cleartextPassword = getDeterministicPassword(tech.name, email);
    const passwordHash = await bcrypt.hash(cleartextPassword, 10);

    // Create the User record
    const newUser = await prisma.user.create({
      data: {
        name: tech.name,
        email,
        passwordHash,
        role: 'TECNICO',
        isActive: true,
        baseCompanyId: tech.baseCompanyId || casemeCompany.id,
      },
    });

    // Create UserCompany entry
    const targetCompanyId = tech.baseCompanyId || casemeCompany.id;
    await prisma.userCompany.create({
      data: {
        userId: newUser.id,
        companyId: targetCompanyId,
        isDefault: true,
      },
    });

    // Update Technician record
    await prisma.technician.update({
      where: { id: tech.id },
      data: { linkedUserId: newUser.id },
    });

    reportData.push({
      'ID Técnico': tech.id,
      'Nombre': tech.name,
      'Tipo': tech.type,
      'Celular': tech.phone || 'N/A',
      'Email (Usuario)': email,
      'Clave Temporal': cleartextPassword,
      'Estado': 'Cuenta Creada y Vinculada',
    });

    createdCount++;
    console.log(`Cuenta creada para: ${tech.name} -> ${email} (${cleartextPassword})`);
  }

  // 3. Export to Excel (.xlsx)
  const worksheet = XLSX.utils.json_to_sheet(reportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Credenciales Técnicos');

  // Ajustar ancho de columnas para mejor visualización
  const cols = [
    { wch: 30 }, // ID Técnico
    { wch: 35 }, // Nombre
    { wch: 12 }, // Tipo
    { wch: 15 }, // Celular
    { wch: 35 }, // Email
    { wch: 18 }, // Clave
    { wch: 30 }, // Estado
  ];
  worksheet['!cols'] = cols;

  const fileName = 'Credenciales_Tecnicos.xlsx';
  XLSX.writeFile(workbook, fileName);

  console.log('\n======================================================');
  console.log(`🎉 Proceso completado exitosamente!`);
  console.log(`- Cuentas creadas y vinculadas: ${createdCount}`);
  console.log(`- Cuentas omitidas (ya vinculadas): ${skippedCount}`);
  console.log(`- Archivo Excel guardado como: ${fileName}`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
