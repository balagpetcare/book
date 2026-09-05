import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, revokeAdminSessionToken } from "@/lib/admin-auth";
export const runtime = "nodejs";
export async function POST() { const token = (await cookies()).get(ADMIN_COOKIE)?.value; await revokeAdminSessionToken(token); const response = NextResponse.json({ ok: true }); response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 0, path: "/" }); return response; }
