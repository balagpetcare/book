import { NextRequest, NextResponse } from "next/server";
import { resolveAdminIdFromToken, ADMIN_COOKIE } from "@/lib/admin-auth";
export async function proxy(request: NextRequest) { const path = request.nextUrl.pathname; if (path === "/admin/login" || path === "/api/admin/login") return NextResponse.next(); if (!path.startsWith("/admin") && !path.startsWith("/api/admin")) return NextResponse.next(); const token = request.cookies.get(ADMIN_COOKIE)?.value; const adminId = await resolveAdminIdFromToken(token); if (adminId) return NextResponse.next(); if (path.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.redirect(new URL("/admin/login", request.url)); }
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
