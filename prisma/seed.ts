import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // ─── USUARIOS ──────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 10);
  const superPassword = await bcrypt.hash('super123', 10);
  const ingPassword = await bcrypt.hash('ing123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@perryapp.com' },
    update: {},
    create: {
      name: 'Carlos Administrador',
      email: 'admin@perryapp.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@perryapp.com' },
    update: {},
    create: {
      name: 'María García',
      email: 'supervisor@perryapp.com',
      passwordHash: superPassword,
      role: 'SUPERVISOR',
    },
  });

  const ing1 = await prisma.user.upsert({
    where: { email: 'pedro@perryapp.com' },
    update: {},
    create: {
      name: 'Pedro López',
      email: 'pedro@perryapp.com',
      passwordHash: ingPassword,
      role: 'INGENIERO',
      supervisorId: supervisor.id,
    },
  });

  const ing2 = await prisma.user.upsert({
    where: { email: 'ana@perryapp.com' },
    update: {},
    create: {
      name: 'Ana Martínez',
      email: 'ana@perryapp.com',
      passwordHash: ingPassword,
      role: 'INGENIERO',
      supervisorId: supervisor.id,
    },
  });

  const ing3 = await prisma.user.upsert({
    where: { email: 'ricardo@perryapp.com' },
    update: {},
    create: {
      name: 'Ricardo Hernández',
      email: 'ricardo@perryapp.com',
      passwordHash: ingPassword,
      role: 'INGENIERO',
      supervisorId: supervisor.id,
    },
  });

  console.log('✅ Usuarios creados');

  // ─── CLIENTES ──────────────────────────────────────────────────
  const clientes = await Promise.all([
    prisma.client.upsert({
      where: { code: 'CEMEX' },
      update: {},
      create: { name: 'CEMEX México', code: 'CEMEX', status: 'ACTIVO', notes: 'Cliente industrial principal' },
    }),
    prisma.client.upsert({
      where: { code: 'FEMSA' },
      update: {},
      create: { name: 'FEMSA Logística', code: 'FEMSA', status: 'ACTIVO', notes: 'Operaciones de planta' },
    }),
    prisma.client.upsert({
      where: { code: 'TERNIUM' },
      update: {},
      create: { name: 'Ternium', code: 'TERNIUM', status: 'ACTIVO', notes: 'Planta Monterrey' },
    }),
    prisma.client.upsert({
      where: { code: 'VITRO' },
      update: {},
      create: { name: 'Vitro Envases', code: 'VITRO', status: 'ACTIVO', notes: 'División envases' },
    }),
    prisma.client.upsert({
      where: { code: 'KIA' },
      update: {},
      create: { name: 'KIA Motors México', code: 'KIA', status: 'ACTIVO', notes: 'Planta Pesquería' },
    }),
  ]);

  console.log('✅ Clientes creados');

  // ─── CONTACTOS ─────────────────────────────────────────────────
  const contactos = await Promise.all([
    prisma.contact.create({
      data: { clientId: clientes[0].id, name: 'Ing. Alexis Campos', position: 'Gerente de Mantenimiento', phone: '8112345678', email: 'acampos@cemex.com' },
    }),
    prisma.contact.create({
      data: { clientId: clientes[0].id, name: 'Ing. Roberto Salinas', position: 'Supervisor de Planta', phone: '8112345679' },
    }),
    prisma.contact.create({
      data: { clientId: clientes[1].id, name: 'Ing. Jesús Montalvo', position: 'Jefe de Proyectos', phone: '8112345680', email: 'jmontalvo@femsa.com' },
    }),
    prisma.contact.create({
      data: { clientId: clientes[2].id, name: 'Ing. Laura Vega', position: 'Coordinadora de Planta', phone: '8112345681' },
    }),
    prisma.contact.create({
      data: { clientId: clientes[3].id, name: 'Ing. Miguel González', position: 'Director de Operaciones', phone: '8112345682', email: 'mgonzalez@vitro.com' },
    }),
    prisma.contact.create({
      data: { clientId: clientes[4].id, name: 'Ing. Sandra Ruiz', position: 'Gerente de Proyectos', phone: '8112345683', email: 'sruiz@kia.com' },
    }),
  ]);

  console.log('✅ Contactos creados');

  // ─── OPORTUNIDADES ────────────────────────────────────────────
  const opps = await Promise.all([
    prisma.opportunity.create({
      data: {
        folio: 'OPP-2024-001', clientId: clientes[0].id, contactId: contactos[0].id, userId: ing1.id,
        title: 'Instalación de guarda para botonera',
        description: 'Instalación de protecciones para botoneras de control en área de producción',
        requestDate: new Date('2024-03-01'), scheduledVisitDate: new Date('2024-03-05'),
        actualVisitDate: new Date('2024-03-05'), infoCompleteDate: new Date('2024-03-08'),
        quotationDueDate: new Date('2024-03-12'), quotationSentDate: new Date('2024-03-11'),
        status: 'COTIZACION_ENVIADA',
      },
    }),
    prisma.opportunity.create({
      data: {
        folio: 'OPP-2024-002', clientId: clientes[1].id, contactId: contactos[2].id, userId: ing1.id,
        title: 'Instalación de alumbrado LED en P2',
        description: 'Proyecto de iluminación LED para nave P2',
        requestDate: new Date('2024-03-10'), scheduledVisitDate: new Date('2024-03-14'),
        actualVisitDate: new Date('2024-03-14'), quotationDueDate: new Date('2024-03-20'),
        status: 'COTIZACION_EN_PROCESO',
      },
    }),
    prisma.opportunity.create({
      data: {
        folio: 'OPP-2024-003', clientId: clientes[1].id, contactId: contactos[2].id, userId: ing2.id,
        title: 'Cálculo estructural para barandal',
        description: 'Diseño y cálculo estructural para barandales de seguridad',
        requestDate: new Date('2024-03-12'), scheduledVisitDate: new Date('2024-03-15'),
        actualVisitDate: new Date('2024-03-16'), infoCompleteDate: new Date('2024-03-20'),
        quotationDueDate: new Date('2024-03-25'), quotationSentDate: new Date('2024-03-24'),
        status: 'GANADA',
      },
    }),
    prisma.opportunity.create({
      data: {
        folio: 'OPP-2024-004', clientId: clientes[2].id, contactId: contactos[3].id, userId: ing2.id,
        title: 'Mantenimiento preventivo de grúas',
        description: 'Programa de mantenimiento preventivo para grúas de nave 3',
        requestDate: new Date('2024-03-18'), scheduledVisitDate: new Date('2024-03-22'),
        status: 'PROGRAMADA',
      },
    }),
    prisma.opportunity.create({
      data: {
        folio: 'OPP-2024-005', clientId: clientes[3].id, contactId: contactos[4].id, userId: ing3.id,
        title: 'Sistema neumático lado RH',
        description: 'Conexión y pruebas del sistema neumático en línea de producción',
        requestDate: new Date('2024-03-20'), scheduledVisitDate: new Date('2024-03-25'),
        actualVisitDate: new Date('2024-03-25'), infoCompleteDate: new Date('2024-03-28'),
        quotationDueDate: new Date('2024-04-02'),
        status: 'EN_ESPERA_INFORMACION',
        delayReason: 'Esperando planos actualizados del cliente',
      },
    }),
    prisma.opportunity.create({
      data: {
        folio: 'OPP-2024-006', clientId: clientes[4].id, contactId: contactos[5].id, userId: ing3.id,
        title: 'Instalación de sistema contra incendio',
        description: 'Sistema completo de detección y supresión contra incendio',
        requestDate: new Date('2024-02-15'), scheduledVisitDate: new Date('2024-02-20'),
        actualVisitDate: new Date('2024-02-20'), infoCompleteDate: new Date('2024-02-25'),
        quotationDueDate: new Date('2024-03-01'), quotationSentDate: new Date('2024-03-05'),
        status: 'PERDIDA', delayReason: 'Cliente seleccionó proveedor con precio menor',
      },
    }),
    prisma.opportunity.create({
      data: {
        folio: 'OPP-2024-007', clientId: clientes[0].id, contactId: contactos[1].id, userId: ing1.id,
        title: 'Reemplazo de cableado en nave principal',
        description: 'Sustitución de cableado eléctrico obsoleto',
        requestDate: new Date('2024-03-25'), scheduledVisitDate: new Date('2024-03-28'),
        actualVisitDate: new Date('2024-03-28'), quotationDueDate: new Date('2024-04-05'),
        status: 'VISITADA',
      },
    }),
    prisma.opportunity.create({
      data: {
        folio: 'OPP-2024-008', clientId: clientes[2].id, contactId: contactos[3].id, userId: ing2.id,
        title: 'Automatización de línea de embalaje',
        description: 'Proyecto de automatización para línea de embalaje',
        requestDate: new Date('2024-04-01'), scheduledVisitDate: new Date('2024-04-05'),
        status: 'PROGRAMADA',
      },
    }),
  ]);

  console.log('✅ Oportunidades creadas');

  // ─── REPORTES DIARIOS ─────────────────────────────────────────
  const report1 = await prisma.dailyReport.create({
    data: {
      userId: ing1.id, reportDate: new Date('2024-03-14'),
      rawText: `Buena tarde anexo reporte de actividades:\n- Se atiende reunión con Ing Alexis Campos para instalación de guarda para botonera\n- Se atiende reunión con Ing Jesus Montalvo para instalación de alumbrado led en P2\n- Se atiende reunión con Ing Jesus Montalvo para cálculo estructural para barandal\n- Se envía documentación para liberación de permisos de fin de semana\n- Se anexa solicitud de materiales para actividades`,
      source: 'WHATSAPP_IMPORT',
    },
  });

  const report2 = await prisma.dailyReport.create({
    data: {
      userId: ing3.id, reportDate: new Date('2024-03-25'),
      rawText: `Reporte del día:\n- Reemplazo de cableado expuesto en nave principal\n- Instalación de lámparas de 2ft en MR1\n- Instalación de guarda para botonera CEMEX\n- Conexión de sistema neumático en lado RH Vitro\n- Se atiende reunión con Miguel González para trabajos de fin de semana`,
      source: 'WHATSAPP_IMPORT',
    },
  });

  const report3 = await prisma.dailyReport.create({
    data: {
      userId: ing2.id, reportDate: new Date('2024-03-16'),
      rawText: `Reporte de actividades del día:\n- Visita a planta Ternium para levantamiento de grúas\n- Elaboración de cotización para barandales FEMSA\n- Coordinación con equipo para trabajos de fin de semana\n- Revisión de planos estructurales para proyecto KIA`,
      source: 'WHATSAPP_IMPORT',
    },
  });

  console.log('✅ Reportes diarios creados');

  // ─── ACTIVIDADES ──────────────────────────────────────────────
  const actividades = [
    { dailyReportId: report1.id, userId: ing1.id, clientId: clientes[0].id, contactId: contactos[0].id, opportunityId: opps[0].id, date: new Date('2024-03-14'), type: 'VISITA_CAMPO', status: 'COMPLETADA', title: 'Reunión con Ing. Alexis Campos - guarda para botonera', result: 'Se acordaron especificaciones técnicas', nextStep: 'Enviar cotización', startTime: '09:00', endTime: '10:30', durationMinutes: 90, projectArea: 'Producción' },
    { dailyReportId: report1.id, userId: ing1.id, clientId: clientes[1].id, contactId: contactos[2].id, opportunityId: opps[1].id, date: new Date('2024-03-14'), type: 'VISITA_CAMPO', status: 'COMPLETADA', title: 'Reunión con Ing. Jesús Montalvo - alumbrado LED en P2', result: 'Levantamiento completado', nextStep: 'Calcular luminarias', startTime: '11:00', endTime: '12:30', durationMinutes: 90, projectArea: 'Iluminación' },
    { dailyReportId: report1.id, userId: ing1.id, clientId: clientes[1].id, contactId: contactos[2].id, opportunityId: opps[2].id, date: new Date('2024-03-14'), type: 'VISITA_CAMPO', status: 'COMPLETADA', title: 'Reunión con Ing. Jesús Montalvo - cálculo estructural barandal', result: 'Medidas y especificaciones recopiladas', nextStep: 'Realizar cálculos', startTime: '13:00', endTime: '14:00', durationMinutes: 60, projectArea: 'Estructuras' },
    { dailyReportId: report1.id, userId: ing1.id, date: new Date('2024-03-14'), type: 'PLANEACION', status: 'COMPLETADA', title: 'Envío de documentación para permisos de fin de semana', result: 'Documentos enviados', startTime: '14:30', endTime: '15:30', durationMinutes: 60 },
    { dailyReportId: report1.id, userId: ing1.id, date: new Date('2024-03-14'), type: 'PLANEACION', status: 'COMPLETADA', title: 'Solicitud de materiales para actividades', result: 'Solicitud enviada a compras', startTime: '15:30', endTime: '16:00', durationMinutes: 30 },
    { dailyReportId: report2.id, userId: ing3.id, clientId: clientes[0].id, date: new Date('2024-03-25'), type: 'EJECUCION', status: 'COMPLETADA', title: 'Reemplazo de cableado expuesto', result: 'Cableado reemplazado completamente', startTime: '07:00', endTime: '09:00', durationMinutes: 120, location: 'Nave principal CEMEX' },
    { dailyReportId: report2.id, userId: ing3.id, date: new Date('2024-03-25'), type: 'EJECUCION', status: 'COMPLETADA', title: 'Instalación de lámparas de 2ft en MR1', result: '12 lámparas instaladas', startTime: '09:30', endTime: '12:00', durationMinutes: 150 },
    { dailyReportId: report2.id, userId: ing3.id, clientId: clientes[0].id, opportunityId: opps[0].id, date: new Date('2024-03-25'), type: 'EJECUCION', status: 'COMPLETADA', title: 'Instalación de guarda para botonera CEMEX', result: 'Guarda instalada y probada', startTime: '13:00', endTime: '15:00', durationMinutes: 120 },
    { dailyReportId: report2.id, userId: ing3.id, clientId: clientes[3].id, opportunityId: opps[4].id, date: new Date('2024-03-25'), type: 'EJECUCION', status: 'EN_PROGRESO', title: 'Conexión de sistema neumático en lado RH', result: 'Conexión al 60%', nextStep: 'Completar pruebas', startTime: '15:30', endTime: '17:00', durationMinutes: 90 },
    { dailyReportId: report2.id, userId: ing3.id, clientId: clientes[3].id, contactId: contactos[4].id, date: new Date('2024-03-25'), type: 'VISITA_CAMPO', status: 'COMPLETADA', title: 'Reunión Miguel González - datos pendientes fin de semana', result: 'Datos definidos', nextStep: 'Preparar plan', startTime: '17:00', endTime: '18:00', durationMinutes: 60 },
    { dailyReportId: report3.id, userId: ing2.id, clientId: clientes[2].id, contactId: contactos[3].id, opportunityId: opps[3].id, date: new Date('2024-03-16'), type: 'VISITA_CAMPO', status: 'COMPLETADA', title: 'Visita planta Ternium - levantamiento de grúas', result: '4 grúas revisadas', nextStep: 'Elaborar programa', startTime: '08:00', endTime: '11:00', durationMinutes: 180, location: 'Planta Ternium Monterrey' },
    { dailyReportId: report3.id, userId: ing2.id, clientId: clientes[1].id, opportunityId: opps[2].id, date: new Date('2024-03-16'), type: 'COTIZACION', status: 'COMPLETADA', title: 'Elaboración cotización barandales FEMSA', result: 'Cotización $185,000 MXN', nextStep: 'Enviar a cliente', startTime: '12:00', endTime: '14:00', durationMinutes: 120 },
    { dailyReportId: report3.id, userId: ing2.id, date: new Date('2024-03-16'), type: 'PLANEACION', status: 'COMPLETADA', title: 'Coordinación equipo para trabajos fin de semana', result: 'Plan de trabajo definido', startTime: '14:30', endTime: '15:30', durationMinutes: 60 },
    { dailyReportId: report3.id, userId: ing2.id, clientId: clientes[4].id, date: new Date('2024-03-16'), type: 'PLANEACION', status: 'EN_PROGRESO', title: 'Revisión planos estructurales proyecto KIA', result: 'Planos al 70%', nextStep: 'Completar revisión', startTime: '16:00', endTime: '17:30', durationMinutes: 90 },
    { userId: ing1.id, clientId: clientes[0].id, contactId: contactos[0].id, date: new Date('2024-03-20'), type: 'COTIZACION', status: 'COMPLETADA', title: 'Cotización guardas para botoneras CEMEX', result: 'Cotización enviada $45,000 MXN', startTime: '09:00', endTime: '11:00', durationMinutes: 120 },
    { userId: ing1.id, clientId: clientes[0].id, opportunityId: opps[6].id, date: new Date('2024-03-28'), type: 'VISITA_CAMPO', status: 'COMPLETADA', title: 'Visita levantamiento cableado CEMEX', result: '200m de cableado identificados', nextStep: 'Elaborar cotización', startTime: '08:00', endTime: '12:00', durationMinutes: 240, location: 'Nave principal CEMEX' },
    { userId: ing2.id, clientId: clientes[2].id, contactId: contactos[3].id, date: new Date('2024-03-22'), type: 'VISITA_CAMPO', status: 'PENDIENTE', title: 'Visita programada mantenimiento grúas Ternium', commitmentDate: new Date('2024-03-22') },
    { userId: ing2.id, clientId: clientes[4].id, contactId: contactos[5].id, date: new Date('2024-04-01'), type: 'PLANEACION', status: 'PENDIENTE', title: 'Revisión proyecto automatización KIA', nextStep: 'Agendar visita con Sandra Ruiz', commitmentDate: new Date('2024-04-05') },
    { userId: ing3.id, clientId: clientes[3].id, date: new Date('2024-03-27'), type: 'EJECUCION', status: 'EN_PROGRESO', title: 'Instalación válvulas neumáticas Vitro', result: 'Instalación al 80%', nextStep: 'Pruebas de presión', startTime: '07:00', endTime: '16:00', durationMinutes: 540 },
    { userId: ing3.id, clientId: clientes[4].id, contactId: contactos[5].id, date: new Date('2024-03-29'), type: 'COTIZACION', status: 'COMPLETADA', title: 'Cotización sistema contra incendio KIA', result: 'Cotización $1,250,000 MXN', startTime: '09:00', endTime: '14:00', durationMinutes: 300 },
    { userId: ing1.id, clientId: clientes[1].id, date: new Date('2024-04-02'), type: 'EJECUCION', status: 'PENDIENTE', title: 'Instalación lámparas LED FEMSA P2', nextStep: 'Coordinar acceso planta', commitmentDate: new Date('2024-04-10') },
    { userId: ing2.id, clientId: clientes[1].id, opportunityId: opps[2].id, date: new Date('2024-03-24'), type: 'COTIZACION', status: 'COMPLETADA', title: 'Revisión y envío cotización barandales FEMSA', result: 'Cotización enviada y recepción confirmada', startTime: '08:00', endTime: '10:00', durationMinutes: 120 },
  ];

  for (const act of actividades) {
    await prisma.activity.create({ data: act as any });
  }

  console.log('✅ Actividades creadas');
  console.log('');
  console.log('🎉 Seed completado exitosamente!');
  console.log('');
  console.log('📋 Credenciales de acceso:');
  console.log('  Admin:      admin@perryapp.com / admin123');
  console.log('  Supervisor: supervisor@perryapp.com / super123');
  console.log('  Ingeniero:  pedro@perryapp.com / ing123');
  console.log('  Ingeniero:  ana@perryapp.com / ing123');
  console.log('  Ingeniero:  ricardo@perryapp.com / ing123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
