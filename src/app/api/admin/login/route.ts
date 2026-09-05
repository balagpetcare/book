import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createAdminSession, ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS } from "@/lib/admin-auth";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/admin-validation";
export const runtime = "nodejs";

async function parseLoginBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      // A real browser falls back to a native, non-JSON form submission whenever
      // client JS has not taken over the form yet (e.g. a click that lands before
      // hydration finishes). Without this branch that fallback always produced a
      // 400 here, because request.json() cannot parse a form-encoded body.
      const form = await request.formData();
      return { email: form.get("email"), password: form.get("password") };
    }
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  if (!rateLimit(`login:${requestIp(request)}`, 10, 15 * 60 * 1000)) return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
  const parsed = loginSchema.safeParse(await parseLoginBody(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid login request." }, { status: 400 });
  const { email, password } = parsed.data;
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.isActive || !(await bcrypt.compare(password, admin.passwordHash))) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, await createAdminSession(admin.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: ADMIN_SESSION_MAX_AGE_SECONDS, path: "/" });
  return response;
}
