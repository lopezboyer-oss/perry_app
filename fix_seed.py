with open('prisma/seed.ts', 'r') as f:
    c = f.read()

c = c.replace('prisma.opportunity.create', 'prisma.activity.create')
# Also remove "opportunityId: opp.id" if present
c = c.replace('opportunityId', 'activityId')
with open('prisma/seed.ts', 'w') as f:
    f.write(c)

