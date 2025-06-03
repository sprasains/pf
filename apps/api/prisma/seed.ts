// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a default Organization and Tenant if they don't exist
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'default-org' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default-org',
      tenants: {
        create: {
          name: 'Default Tenant',
          slug: 'default-tenant',
        },
      },
    },
    include: {
      tenants: true,
    },
  });

  const defaultTenant = defaultOrg.tenants[0];

  // Create a test user if they don't exist
  const existingTestUser = await prisma.user.findUnique({
    where: { email: 'test@example.com' },
  });

  if (!existingTestUser) {
    const hashedPassword = await bcrypt.hash('password123', 10); // Hashed password for test user

    await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password_hash: hashedPassword,
        role: Role.USER,
        orgId: defaultOrg.id,
        tenantId: defaultTenant.id,
      },
    });
    console.log('Created test user: test@example.com');
  }

  // Add seed data for other models (Workflows, Templates, etc.) here
  // Ensure data is only created if it doesn't exist to make the script idempotent

  console.log('Database seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 