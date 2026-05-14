// One-time script to normalize all existing activity titles to Sentence case
// Run with: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/normalize-titles.ts

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function toSentenceCase(text: string): string {
  if (!text) return text;
  const trimmed = text.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

async function main() {
  const activities = await prisma.activity.findMany({
    select: { id: true, title: true },
  });

  console.log(`Found ${activities.length} activities to check`);

  let updated = 0;
  for (const act of activities) {
    const normalized = toSentenceCase(act.title);
    if (normalized !== act.title) {
      await prisma.activity.update({
        where: { id: act.id },
        data: { title: normalized },
      });
      updated++;
      if (updated % 50 === 0) console.log(`  ...${updated} updated`);
    }
  }

  console.log(`\nDone! Updated ${updated} of ${activities.length} activity titles.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
