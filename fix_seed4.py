with open('prisma/seed.ts', 'r') as f:
    c = f.read()

c = c.replace('requestDate: ', 'date: ')
with open('prisma/seed.ts', 'w') as f:
    f.write(c)

