import argon2 from 'argon2';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash('password123');
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { name: 'Admin', email: 'admin@example.com', passwordHash, role: Role.ADMIN },
  });
}

main().finally(async () => prisma.$disconnect());
