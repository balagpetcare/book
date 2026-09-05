"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminNavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function AdminNavLink({ href, children, className }: AdminNavLinkProps) {
  const pathname = usePathname();

  const isActive =
    pathname === href ||
    pathname.startsWith(href + "/");

  const combinedClassName = `${className || ""} ${isActive ? "active" : ""}`.trim();

  return (
    <Link href={href} className={combinedClassName}>
      {children}
    </Link>
  );
}
