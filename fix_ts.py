import re

# 1. Fix src/app/api/activities/[id]/tech-assignments/route.ts
with open('src/app/api/activities/[id]/tech-assignments/route.ts', 'r') as f:
    c = f.read()
c = c.replace('select: { weekendOf: true }', 'select: { date: true }')
calc_logic = """
    const d = new Date(activity.date);
    const day = d.getDay();
    // Find the Saturday of this week
    d.setDate(d.getDate() - (day === 0 ? 1 : (day < 6 ? day + 1 : 0)));
    const calculatedWeekendOf = d.toISOString().split('T')[0];

    const assignment = await prisma.weekendTechAssignment.create({
      data: {
        activityId: params.id,
        technicianId: body.technicianId,
        weekendOf: calculatedWeekendOf,"""
c = c.replace("""    const assignment = await prisma.weekendTechAssignment.create({
      data: {
        activityId: params.id,
        technicianId: body.technicianId,
        weekendOf: activity.weekendOf,""", calc_logic)
with open('src/app/api/activities/[id]/tech-assignments/route.ts', 'w') as f:
    f.write(c)

# 2. Fix src/app/api/clientes/[id]/route.ts
with open('src/app/api/clientes/[id]/route.ts', 'r') as f:
    c = f.read()
c = c.replace('select: { activities: true, opportunities: true }', 'select: { activities: true }')
c = c.replace('if (clientDeps._count.activities > 0 || clientDeps._count.opportunities > 0) {', 'if (clientDeps._count.activities > 0) {')
c = c.replace('actividades u oportunidades', 'actividades')
with open('src/app/api/clientes/[id]/route.ts', 'w') as f:
    f.write(c)

# 3. Fix src/app/api/contactos/[id]/route.ts
with open('src/app/api/contactos/[id]/route.ts', 'r') as f:
    c = f.read()
c = c.replace('select: { activities: true, opportunities: true }', 'select: { activities: true }')
c = c.replace('if (contactDeps._count.activities > 0 || contactDeps._count.opportunities > 0) {', 'if (contactDeps._count.activities > 0) {')
c = c.replace('actividades u oportunidades', 'actividades')
with open('src/app/api/contactos/[id]/route.ts', 'w') as f:
    f.write(c)

# 4. Fix src/app/api/contactos/route.ts
with open('src/app/api/contactos/route.ts', 'r') as f:
    c = f.read()
c = c.replace('select: { activities: true, opportunities: true }', 'select: { activities: true }')
with open('src/app/api/contactos/route.ts', 'w') as f:
    f.write(c)

# 5. Fix prisma/seed.ts
with open('prisma/seed.ts', 'r') as f:
    c = f.read()
c = re.sub(r'opportunity:\s*\{\s*connect:\s*\{\s*id:[^\}]+\}\s*\},?\n', '', c)
with open('prisma/seed.ts', 'w') as f:
    f.write(c)

