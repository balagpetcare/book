"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

export function AdminLogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      window.location.href = "/admin/login";
    } catch (e) {
      console.error("Logout failed:", e);
      setIsLoggingOut(false);
    }
  };

  return (
    <button 
      onClick={handleLogout} 
      disabled={isLoggingOut} 
      className="admin-logout-button"
      title="Log out"
      aria-label="Log out"
    >
      <LogOut size={16} aria-hidden="true" />
      <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
    </button>
  );
}
