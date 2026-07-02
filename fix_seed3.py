with open('prisma/seed.ts', 'r') as f:
    c = f.read()

c = c.replace('description: ', 'notes: ')
with open('prisma/seed.ts', 'w') as f:
    f.write(c)

