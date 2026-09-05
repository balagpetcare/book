import { cookies } from "next/headers";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const COOKIE = "book_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(adminId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.adminSession.create({ data: { adminUserId: adminId, tokenHash, expiresAt } });
  return token;
}

export async function resolveAdminIdFromToken(token: string | undefined | null) {
  if (!token) return null;
  const session = await prisma.adminSession.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) return null;
  return session.adminUserId;
}

export async function revokeAdminSessionToken(token: string | undefined | null) {
  if (!token) return;
  await prisma.adminSession.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function getAdminId() {
  const token = (await cookies()).get(COOKIE)?.value;
  return resolveAdminIdFromToken(token);
}

export async function requireAdmin() {
  const id = await getAdminId();
  if (!id) return null;
  return prisma.adminUser.findFirst({ where: { id, isActive: true }, select: { id: true, email: true, name: true, role: true } });
}

export async function requireAdminRole(...roles: Array<"SUPER_ADMIN" | "ADMIN">) {
  const admin = await requireAdmin();
  if (!admin) return { admin: null, error: "unauthorized" as const };
  if (!roles.includes(admin.role)) return { admin, error: "forbidden" as const };
  return { admin, error: null };
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
