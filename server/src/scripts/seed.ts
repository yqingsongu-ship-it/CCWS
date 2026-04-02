/**
 * Database Seed Script
 * Creates initial super admin user for DEM system
 */

import { prisma } from '../database/index.js';
import { hashPassword } from '../services/auth.service.js';

async function seed() {
  console.log('Starting database seed...');

  try {
    // Check if super admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    if (existingAdmin) {
      console.log('Super admin user already exists. Skipping seed.');
      return;
    }

    // Create super admin user
    const hashedPassword = await hashPassword('Admin@123');

    const admin = await prisma.user.create({
      data: {
        email: 'admin@dem.com',
        password: hashedPassword,
        name: 'System Administrator',
        role: 'SUPER_ADMIN',
        quota: 1000,
        enabled: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    console.log('\n✅ Super admin user created successfully!\n');
    console.log('Login Credentials:');
    console.log('  Email: admin@dem.com');
    console.log('  Password: Admin@123');
    console.log('\n⚠️  Please change the password after first login!\n');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed
seed()
  .then(() => {
    console.log('Seed completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
