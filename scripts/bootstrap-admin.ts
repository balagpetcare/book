import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || null;
  if (!email || !password || password.length < 12) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters) are required.');
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.adminUser.upsert({ where: { email }, update: { passwordHash, name, role: "SUPER_ADMIN", isActive: true }, create: { email, passwordHash, name, role: "SUPER_ADMIN" } });
  await prisma.adminSession.updateMany({ where: { adminUserId: admin.id, revokedAt: null }, data: { revokedAt: new Date() } });
  console.log(`Admin account ready: ${email}`);
}
main().finally(() => prisma.$disconnect());
