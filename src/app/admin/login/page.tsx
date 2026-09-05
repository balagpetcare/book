import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminLoginForm } from "@/components/admin-login-form";
const SENSITIVE_LOGIN_PARAMS = ["email", "password"];
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  if (admin) redirect("/admin");
  const params = await searchParams;
  if (SENSITIVE_LOGIN_PARAMS.some((key) => key in params)) redirect("/admin/login");
  return <main className="admin-login"><div className="admin-login-card"><p className="eyebrow">BOOK ADMIN</p><h1>Admin sign in</h1><p>Manage orders, payments, inventory and settings.</p><AdminLoginForm /></div></main>;
}
