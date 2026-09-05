import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminMobileMenu } from "@/components/admin-mobile-menu";
import { AdminNavLink } from "@/components/admin-nav-link";
import { AdminLogoutButton } from "@/components/admin-logout-button";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="admin-layout">
      <aside className="admin-nav">
        <strong>BOOK ADMIN</strong>
        <nav>
          <AdminNavLink href="/admin">Dashboard</AdminNavLink>
          <AdminNavLink href="/admin/orders">Orders</AdminNavLink>
          <AdminNavLink href="/admin/payments">Payments</AdminNavLink>
          <AdminNavLink href="/admin/fulfillment">Print & Delivery</AdminNavLink>
          <AdminNavLink href="/admin/inventory">Inventory</AdminNavLink>
          <AdminNavLink href="/admin/reviews">Reviews</AdminNavLink>
          <AdminNavLink href="/admin/settings">Settings</AdminNavLink>
        </nav>
        <div className="admin-account-section">
          <div className="admin-account-info">
            <span className="admin-account-name">{admin.name || admin.email.split('@')[0]}</span>
            <span className="admin-account-role">{admin.role.replace('_', ' ')}</span>
            <span className="admin-account-email">{admin.email}</span>
          </div>
          <AdminLogoutButton />
        </div>
      </aside>

      <section className="admin-content">
        <div className="admin-mobile-header">
          <AdminMobileMenu adminEmail={admin.email} adminName={admin.name} adminRole={admin.role} />
          <strong>BOOK ADMIN</strong>
        </div>
        {children}
      </section>
    </div>
  );
}
