with open('prisma/seed.ts', 'r') as f:
    c = f.read()

c = c.replace('folio: ', 'workOrderFolio: ')
with open('prisma/seed.ts', 'w') as f:
    f.write(c)

