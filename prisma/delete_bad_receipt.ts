import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando recibos asociados con la actividad S02226...');
  
  const receipts = await prisma.invoiceReceipt.findMany({
    where: {
      OR: [
        { folio: 'S02226' },
        { invoiceNumber: { contains: 'S02226' } },
        { notes: { contains: 'S02226' } }
      ]
    },
    include: {
      confirmedBy: true
    }
  });

  console.log(`Se encontraron ${receipts.length} recibos.`);
  for (const r of receipts) {
    console.log(`- ID: ${r.id}, InvoiceNumber: ${r.invoiceNumber}, Folio: ${r.folio}, PO: ${r.po}, ConfirmedBy: ${r.confirmedBy?.name}, ConfirmedAt: ${r.confirmedAt}`);
    
    // Delete the incorrect receipt
    await prisma.invoiceReceipt.delete({
      where: { id: r.id }
    });
    console.log(`  ✅ Recibo eliminado correctamente de la base de datos.`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
