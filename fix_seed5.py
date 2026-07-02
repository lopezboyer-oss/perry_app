import re
with open('prisma/seed.ts', 'r') as f:
    c = f.read()

c = c.replace('scheduledVisitDate:', 'commitmentDate:')
with open('prisma/seed.ts', 'w') as f:
    f.write(c)

