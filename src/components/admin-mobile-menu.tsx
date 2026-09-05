"use client";

import { useState } from "react";
import { AdminNavLink } from "@/components/admin-nav-link";
import { AdminLogoutButton } from "@/components/admin-logout-button";

interface AdminMobileMenuProps {
  adminEmail?: string;
  adminName?: string | null;
  adminRole?: string;
}

export function AdminMobileMenu({ adminEmail, adminName, adminRole }: AdminMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        className="admin-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {isOpen && (
        <div
          className="admin-drawer-backdrop"
          onClick={handleBackdropClick}
          role="presentation"
        />
      )}

      <nav
        className={`admin-drawer ${isOpen ? "open" : ""}`}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="admin-drawer-header">
          <strong>BOOK ADMIN</strong>
          <button
            className="admin-drawer-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="admin-drawer-content">
          <AdminNavLink
            href="/admin"
            className="admin-drawer-link"
          >
            <span onClick={handleLinkClick}>Dashboard</span>
          </AdminNavLink>
          <AdminNavLink
            href="/admin/orders"
            className="admin-drawer-link"
          >
            <span onClick={handleLinkClick}>Orders</span>
          </AdminNavLink>
          <AdminNavLink
            href="/admin/payments"
            className="admin-drawer-link"
          >
            <span onClick={handleLinkClick}>Payments</span>
          </AdminNavLink>
          <AdminNavLink
            href="/admin/fulfillment"
            className="admin-drawer-link"
          >
            <span onClick={handleLinkClick}>Print & Delivery</span>
          </AdminNavLink>
          <AdminNavLink
            href="/admin/inventory"
            className="admin-drawer-link"
          >
            <span onClick={handleLinkClick}>Inventory</span>
          </AdminNavLink>
          <AdminNavLink
            href="/admin/reviews"
            className="admin-drawer-link"
          >
            <span onClick={handleLinkClick}>Reviews</span>
          </AdminNavLink>
          <AdminNavLink
            href="/admin/settings"
            className="admin-drawer-link"
          >
            <span onClick={handleLinkClick}>Settings</span>
          </AdminNavLink>
        </div>

        {adminEmail && (
          <div className="admin-drawer-footer">
            <div className="admin-account-section">
              <div className="admin-account-info">
                <span className="admin-account-name">{adminName || adminEmail.split('@')[0]}</span>
                <span className="admin-account-role">{adminRole?.replace('_', ' ')}</span>
                <span className="admin-account-email">{adminEmail}</span>
              </div>
              <AdminLogoutButton />
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
